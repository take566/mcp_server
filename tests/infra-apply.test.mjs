import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  assertNoSecrets,
  findSecretLeaks,
  findUnencryptedSopsValues,
  isPlaceholderClientId,
  loadManifest,
  mergeCodexToml,
  mergeJsonServers,
  PLACEHOLDER_CLIENT_ID,
  parseManifest,
  renderClaudeCode,
  renderCodexBlock,
  renderCodexSnippet,
  renderConnectorsMd,
  renderGemini,
  run,
} from "../infra/mcp/apply.mjs";

const ROOT = join(import.meta.dirname, "..");
const MANIFEST = join(ROOT, "infra", "mcp", "servers.yaml");
const SOPS_FILE = join(ROOT, "infra", "mcp", "secrets.sops.yaml");
const realManifest = loadManifest(MANIFEST);
const tmp = () => mkdtempSync(join(tmpdir(), "infra-apply-"));
const quiet = { log: () => {}, error: () => {} };
const capture = () => {
  const lines = [];
  return { lines, io: { log: (s) => lines.push(s), error: (s) => lines.push(s) } };
};
// The literal env-var reference Gemini CLI expands at runtime (built without a template-looking string literal).
const ENV_REF = ["$", "{GOOGLE_MCP_CLIENT_SECRET}"].join("");
const FIXTURE_CLIENT_ID = "123-abc.apps.googleusercontent.com";

const server = (product, enabled = true) => ({
  enabled,
  url: `https://${product}mcp.googleapis.com/mcp/v1`,
  scopes: [`https://www.googleapis.com/auth/${product}.readonly`],
  targets: ["claude-code", "codex", "gemini", "claude-desktop"],
  gcp_services: [`${product}.googleapis.com`, `${product}mcp.googleapis.com`],
});
const baseManifest = () => ({
  version: 1,
  oauth: { client_id: FIXTURE_CLIENT_ID, callback_port: 8765 },
  servers: {
    "google-gmail": server("gmail"),
    "google-drive": server("drive"),
    "google-slides": server("slides", false),
  },
});
const fixture = parseManifest(baseManifest());
/** Write a manifest object to a temp file (JSON is valid YAML). */
const writeManifest = (obj = baseManifest()) => {
  const p = join(tmp(), "servers.yaml");
  writeFileSync(p, JSON.stringify(obj));
  return p;
};

// A user file with CRLF, 4-space indent, other top-level keys and non-google servers.
const FOREIGN_JSON = [
  "{",
  '    "theme": "dark",',
  '    "mcpServers": {',
  '        "alpha": { "command": "node", "args": ["a.js"] },',
  '        "beta": {',
  '            "type": "http",',
  '            "url": "https://beta.example.com/mcp"',
  "        }",
  "    },",
  '    "zeta": [1, 2, {"k": "}{,\\""}]',
  "}",
  "",
].join("\r\n");

describe("manifest", () => {
  it("real servers.yaml satisfies structural invariants", () => {
    const names = Object.keys(realManifest.servers);
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n.startsWith("google-")).toBe(true);
    for (const s of Object.values(realManifest.servers)) expect(s.url.startsWith("https://")).toBe(true);
    const port = realManifest.oauth.callback_port;
    expect(Number.isInteger(port) && port >= 1024 && port <= 65535).toBe(true);
    expect(findSecretLeaks(readFileSync(MANIFEST, "utf8"))).toEqual([]);
  });

  it("rejects non-google keys, non-https urls, secret-looking client ids and inline secrets", () => {
    const bad = (mut) => {
      const m = baseManifest();
      mut(m);
      return () => parseManifest(m);
    };
    expect(bad(() => {})).not.toThrow();
    expect(
      bad((m) => {
        m.servers.gmail = m.servers["google-gmail"];
      }),
    ).toThrow(/google-/);
    expect(
      bad((m) => {
        m.servers["google-gmail"].url = "http://gmailmcp.googleapis.com/mcp/v1";
      }),
    ).toThrow(/https/);
    expect(
      bad((m) => {
        m.oauth.client_id = "GOCSPX-abcdefghijklmnop";
      }),
    ).toThrow(/secret/i);
    expect(
      bad((m) => {
        m.oauth.client_secret = "x";
      }),
    ).toThrow(/secret/i);
    expect(
      bad((m) => {
        m.oauth.callback_port = 70000;
      }),
    ).toThrow(/callback_port/);
    expect(
      bad((m) => {
        m.oauth.callback_port = 80;
      }),
    ).toThrow(/callback_port/);
    expect(
      bad((m) => {
        m.servers["google-gmail"].targets = ["vim"];
      }),
    ).toThrow(/target/);
  });
});

describe("renderers", () => {
  it("Claude Code entries: type http, url, oauth{clientId, callbackPort, scopes string}", () => {
    const cc = renderClaudeCode(fixture);
    expect(Object.keys(cc).sort()).toEqual(["google-drive", "google-gmail"]);
    expect(cc["google-gmail"]).toEqual({
      type: "http",
      url: "https://gmailmcp.googleapis.com/mcp/v1",
      oauth: {
        clientId: FIXTURE_CLIENT_ID,
        callbackPort: 8765,
        scopes: "https://www.googleapis.com/auth/gmail.readonly",
      },
    });
    const m = baseManifest();
    m.servers["google-gmail"].scopes = ["a", "b"];
    expect(renderClaudeCode(parseManifest(m))["google-gmail"].oauth.scopes).toBe("a b");
  });

  it("respects enabled and targets", () => {
    const m = baseManifest();
    m.servers["google-gmail"].targets = ["codex"];
    const p = parseManifest(m);
    expect(Object.keys(renderClaudeCode(p))).toEqual(["google-drive"]);
    expect(Object.keys(renderGemini(p))).toEqual(["google-drive"]);
    expect(renderCodexBlock(p)).toContain("[mcp_servers.google-gmail]");
    m.servers["google-gmail"].enabled = false;
    expect(renderCodexBlock(parseManifest(m))).not.toContain("[mcp_servers.google-gmail]");
    expect(renderConnectorsMd(fixture)).not.toContain("slidesmcp");
  });

  it("placeholder client_id emits no client entries (connectors.md still generated)", () => {
    const m = baseManifest();
    m.oauth.client_id = PLACEHOLDER_CLIENT_ID;
    const p = parseManifest(m);
    expect(isPlaceholderClientId(p.oauth.client_id)).toBe(true);
    expect(isPlaceholderClientId(FIXTURE_CLIENT_ID)).toBe(false);
    expect(renderClaudeCode(p)).toEqual({});
    expect(renderGemini(p)).toEqual({});
    expect(renderCodexBlock(p)).not.toContain("[mcp_servers.");
    expect(renderConnectorsMd(p)).toContain("https://gmailmcp.googleapis.com/mcp/v1");
  });

  it("Gemini entries: httpUrl + oauth with secret as env-var reference only", () => {
    const g = renderGemini(fixture)["google-drive"];
    expect(g.httpUrl).toBe("https://drivemcp.googleapis.com/mcp/v1");
    expect(g.oauth.enabled).toBe(true);
    expect(g.oauth.clientSecret).toBe(ENV_REF);
    expect(g.oauth.scopes).toEqual(["https://www.googleapis.com/auth/drive.readonly"]);
    expect(g.oauth.redirectUri).toBe("http://localhost:8765/oauth/callback");
  });

  it("Codex snippet: url per server and the fixed callback port; platform independent", () => {
    const s = renderCodexSnippet(fixture);
    expect(s).toContain("mcp_oauth_callback_port = 8765");
    expect(s).toContain('[mcp_servers.google-gmail]\nurl = "https://gmailmcp.googleapis.com/mcp/v1"');
    expect(s).not.toContain("\r");
    expect(s).not.toMatch(/[A-Za-z]:\\|\/Users\/|\/home\//);
  });

  it("connectors.md lists enabled desktop servers with redirect URI", () => {
    const md = renderConnectorsMd(fixture);
    expect(md).toContain("https://gmailmcp.googleapis.com/mcp/v1");
    expect(md).toContain("https://claude.ai/api/mcp/auth_callback");
    expect(md).not.toContain("\r");
  });
});

describe("JSON merge (only google-* keys)", () => {
  const entries = { "google-gmail": { type: "http", url: "https://gmailmcp.googleapis.com/mcp/v1" } };

  it("preserves all non-google content byte-for-byte (apply then strip == original)", () => {
    const applied = mergeJsonServers(FOREIGN_JSON, entries);
    expect(applied).not.toBe(FOREIGN_JSON);
    expect(JSON.parse(applied).mcpServers["google-gmail"]).toEqual(entries["google-gmail"]);
    expect(applied.startsWith(FOREIGN_JSON.slice(0, FOREIGN_JSON.indexOf('"beta"')))).toBe(true);
    expect(applied).toContain('"zeta": [1, 2, {"k": "}{,\\""}]');
    expect(applied).not.toMatch(/[^\r]\n/); // keeps CRLF
    expect(mergeJsonServers(applied, {})).toBe(FOREIGN_JSON);
  });

  it("is idempotent", () => {
    const once = mergeJsonServers(FOREIGN_JSON, entries);
    expect(mergeJsonServers(once, entries)).toBe(once);
  });

  it("removes stale google-* keys wherever they are, keeping the others", () => {
    const src =
      '{\n  "mcpServers": {\n    "google-old": {"url": "x"},\n    "a": 1,\n    "google-mid": 2,\n    "b": 2\n  }\n}\n';
    const out = mergeJsonServers(src, entries);
    const parsed = JSON.parse(out);
    expect(Object.keys(parsed.mcpServers)).toEqual(["a", "b", "google-gmail"]);
    expect(out).toContain('"a": 1,\n    "b": 2');
  });

  it("adds mcpServers when absent and handles empty/missing input", () => {
    const out = mergeJsonServers('{\n  "theme": "dark"\n}\n', entries);
    expect(JSON.parse(out)).toEqual({ theme: "dark", mcpServers: entries });
    expect(out.startsWith('{\n  "theme": "dark",\n')).toBe(true);
    expect(JSON.parse(mergeJsonServers("", entries))).toEqual({ mcpServers: entries });
    expect(JSON.parse(mergeJsonServers("{}", entries))).toEqual({ mcpServers: entries });
    expect(mergeJsonServers('{\n  "theme": "dark"\n}\n', {})).toBe('{\n  "theme": "dark"\n}\n');
  });

  it("refuses invalid JSON with only line/column, never the input fragment", () => {
    let err;
    try {
      mergeJsonServers('{\n  "k": "SENSITIVE_FRAGMENT" // c\n}', entries);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/line \d+ column \d+|invalid JSON/);
    expect(err.message).not.toContain("SENSITIVE_FRAGMENT");
  });

  it("rejects duplicate top-level mcpServers keys", () => {
    const dup = '{"mcpServers": {"a": 1}, "mcpServers": {"b": 2}}';
    expect(() => mergeJsonServers(dup, entries)).toThrow(/duplicate/);
  });
});

describe("Codex TOML merge (library; not written by run())", () => {
  const block = renderCodexBlock(fixture);
  const userToml = 'model = "o3"\r\n\r\n[mcp_servers.chrome-devtools]\r\ncommand = "npx"\r\n';

  it("preserves user content byte-for-byte and is idempotent", () => {
    const once = mergeCodexToml(userToml, block, 8765);
    expect(once).toContain(userToml);
    expect(once).not.toMatch(/[^\r]\n/); // keeps CRLF
    expect(once).toContain("[mcp_servers.google-gmail]");
    expect(mergeCodexToml(once, block, 8765)).toBe(once);
    expect(mergeCodexToml(once, "", null)).toBe(userToml);
  });

  it("keeps a user-set callback port when equal, refuses a conflicting one", () => {
    const own = "mcp_oauth_callback_port = 8765\n[x]\na = 1\n";
    const out = mergeCodexToml(own, block, 8765);
    expect(out.match(/mcp_oauth_callback_port/g).length).toBe(1);
    expect(() => mergeCodexToml("mcp_oauth_callback_port = 9999\n", block, 8765)).toThrow(/9999/);
  });

  it("refuses unmanaged google-* tables and dotted keys instead of clobbering them", () => {
    expect(() => mergeCodexToml('[mcp_servers.google-gmail]\nurl = "x"\n', block, 8765)).toThrow(/unmanaged/);
    expect(() => mergeCodexToml('[mcp_servers."google-x"]\nurl = "x"\n', block, 8765)).toThrow(/unmanaged/);
    expect(() => mergeCodexToml('mcp_servers.google-x.url = "x"\n', block, 8765)).toThrow(/unmanaged/);
    expect(() => mergeCodexToml('mcp_servers . "google-x" . url = "x"\n', block, 8765)).toThrow(/unmanaged/);
  });
});

describe("secrets never reach generated output", () => {
  it("generated outputs contain no secret-looking values", () => {
    for (const m of [fixture, realManifest]) {
      const outputs = [
        JSON.stringify(renderClaudeCode(m)),
        JSON.stringify(renderGemini(m)),
        renderCodexSnippet(m),
        renderConnectorsMd(m),
      ];
      for (const o of outputs) expect(findSecretLeaks(o)).toEqual([]);
      expect(JSON.stringify(renderClaudeCode(m))).not.toMatch(/secret/i);
    }
  });

  it("detects planted secrets, including the live env value, and names the target", () => {
    expect(findSecretLeaks('"clientSecret": "GOCSPX-abcdefghijklmnopqrst"').length).toBeGreaterThan(0);
    expect(findSecretLeaks('client_secret = "hunter2hunter2"').length).toBeGreaterThan(0);
    expect(findSecretLeaks(`"clientSecret": "${ENV_REF}"`)).toEqual([]);
    expect(() =>
      assertNoSecrets("x topsecretvalue123 y", { GOOGLE_MCP_CLIENT_SECRET: "topsecretvalue123" }, "~/x.json"),
    ).toThrow(/~\/x\.json/);
  });

  it("committed generated files contain no secrets", () => {
    for (const f of [".mcp.json", "configs/codex/google-workspace.toml", "configs/connectors.md"]) {
      expect(findSecretLeaks(readFileSync(join(ROOT, f), "utf8"))).toEqual([]);
    }
  });

  it("sops validator flags plaintext values", () => {
    expect(findUnencryptedSopsValues({ GOOGLE_MCP_CLIENT_SECRET: "ENC[AES256_GCM,data:x]", sops: {} })).toEqual([]);
    expect(findUnencryptedSopsValues({ GOOGLE_MCP_CLIENT_SECRET: "plain", sops: {} })).toEqual([
      "GOOGLE_MCP_CLIENT_SECRET",
    ]);
    expect(findUnencryptedSopsValues({ GOOGLE_MCP_CLIENT_SECRET: "ENC[x]" })).toEqual(["<missing top-level sops:>"]);
  });

  it.skipIf(!existsSync(SOPS_FILE))("infra/mcp/secrets.sops.yaml (if present) is fully encrypted", () => {
    expect(findUnencryptedSopsValues(parseYaml(readFileSync(SOPS_FILE, "utf8")))).toEqual([]);
  });
});

describe("run()", () => {
  it("--check passes on the committed repo (no drift in google-* sections)", () => {
    expect(run(["--check"], { root: ROOT, io: quiet })).toBe(0);
  });

  it("with the placeholder client_id, .mcp.json gets no google-* entries", () => {
    if (isPlaceholderClientId(realManifest.oauth.client_id)) {
      expect(Object.keys(JSON.parse(readFileSync(join(ROOT, ".mcp.json"), "utf8")).mcpServers)).not.toContainEqual(
        expect.stringMatching(/^google-/),
      );
    }
    const m = baseManifest();
    m.oauth.client_id = PLACEHOLDER_CLIENT_ID;
    const root = tmp();
    writeFileSync(join(root, ".mcp.json"), FOREIGN_JSON);
    const opts = { root, manifestPath: writeManifest(m), io: quiet };
    expect(run(["--apply"], opts)).toBe(0);
    expect(readFileSync(join(root, ".mcp.json"), "utf8")).toBe(FOREIGN_JSON);
    expect(run(["--check"], opts)).toBe(0);
    const home = tmp();
    expect(run(["--apply", "--home"], { ...opts, homeDir: home })).toBe(1);
    expect(existsSync(join(home, ".gemini"))).toBe(false);
  });

  it("--apply into a fresh root is idempotent and --check then passes; drift is detected", () => {
    const root = tmp();
    writeFileSync(join(root, ".mcp.json"), FOREIGN_JSON);
    const opts = { root, manifestPath: writeManifest(), io: quiet };
    expect(run(["--check"], opts)).toBe(1);
    expect(run(["--apply"], opts)).toBe(0);
    const first = readFileSync(join(root, ".mcp.json"), "utf8");
    expect(mergeJsonServers(first, {})).toBe(FOREIGN_JSON);
    expect(run(["--apply"], opts)).toBe(0);
    expect(readFileSync(join(root, ".mcp.json"), "utf8")).toBe(first);
    expect(run(["--check"], opts)).toBe(0);
    // non-google edits are not drift
    writeFileSync(join(root, ".mcp.json"), first.replace('"theme": "dark"', '"theme": "light"'));
    expect(run(["--check"], opts)).toBe(0);
    // google edits are drift
    writeFileSync(join(root, ".mcp.json"), first.replace("gmailmcp", "evilmcp"));
    expect(run(["--check"], opts)).toBe(1);
    // no temp files left behind by the atomic write
    expect(readdirSync(root).filter((f) => f.includes(".tmp-"))).toEqual([]);
  });

  it("--apply --home merges only into ~/.gemini (never ~/.codex), backup only when content changes", () => {
    const root = tmp();
    const home = tmp();
    const opts = { root, homeDir: home, manifestPath: writeManifest(), io: quiet };
    const gemDir = join(home, ".gemini");
    expect(run(["--apply", "--home"], opts)).toBe(0);
    expect(existsSync(join(gemDir, "settings.json"))).toBe(true);
    expect(existsSync(join(home, ".codex"))).toBe(false);
    const gem = JSON.parse(readFileSync(join(gemDir, "settings.json"), "utf8"));
    expect(gem.mcpServers["google-gmail"].oauth.clientSecret).toBe(ENV_REF);
    // existing file -> backup once, then idempotent (no new backup)
    writeFileSync(join(gemDir, "settings.json"), FOREIGN_JSON);
    expect(run(["--apply", "--home"], opts)).toBe(0);
    const backups = () => readdirSync(gemDir).filter((f) => f.includes(".bak-"));
    expect(backups().length).toBe(1);
    expect(readFileSync(join(gemDir, backups()[0]), "utf8")).toBe(FOREIGN_JSON);
    expect(run(["--apply", "--home"], opts)).toBe(0);
    expect(backups().length).toBe(1);
    expect(run(["--check", "--home"], opts)).toBe(0);
  });

  it("refuses to write when a rendered entry contains the live secret (exit 1, file unchanged)", () => {
    const m = baseManifest();
    m.oauth.client_id = "leakyvalue12345.apps.googleusercontent.com";
    const root = tmp();
    writeFileSync(join(root, ".mcp.json"), FOREIGN_JSON);
    const { lines, io } = capture();
    const opts = { root, manifestPath: writeManifest(m), io, env: { GOOGLE_MCP_CLIENT_SECRET: "leakyvalue12345" } };
    expect(run(["--apply"], opts)).toBe(1);
    expect(readFileSync(join(root, ".mcp.json"), "utf8")).toBe(FOREIGN_JSON);
    expect(lines.join("\n")).toMatch(/ERROR \.mcp\.json: .*secret/);
    expect(lines.join("\n")).not.toContain("leakyvalue12345");
  });

  it("invalid-JSON home file -> ERROR, bytes unchanged, no backup, no fragment in output", () => {
    const root = tmp();
    const home = tmp();
    const gemDir = join(home, ".gemini");
    const bad = '{\n  "apiKey": "SENSITIVE_FRAGMENT", // jsonc\n}\n';
    const { lines, io } = capture();
    const opts = { root, homeDir: home, manifestPath: writeManifest(), io };
    expect(run(["--apply", "--home"], opts)).toBe(0); // creates settings.json
    writeFileSync(join(gemDir, "settings.json"), bad);
    lines.length = 0;
    expect(run(["--apply", "--home"], opts)).toBe(1);
    expect(readFileSync(join(gemDir, "settings.json"), "utf8")).toBe(bad);
    expect(readdirSync(gemDir).filter((f) => f.includes(".bak-"))).toEqual([]);
    const out = lines.join("\n");
    expect(out).toMatch(/ERROR ~\/\.gemini\/settings\.json/);
    expect(out).not.toContain("SENSITIVE_FRAGMENT");
  });

  it("prints usage and exits 2 without a mode", () => {
    expect(run([], { root: ROOT, io: quiet })).toBe(2);
  });
});
