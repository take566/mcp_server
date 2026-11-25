#!/usr/bin/env node
// Render infra/mcp/servers.yaml into every client's MCP config and merge it in place.
//
//   node infra/mcp/apply.mjs --check            # CI-safe: repo artifacts only, google-* sections only
//   node infra/mcp/apply.mjs --apply            # write repo artifacts (.mcp.json, configs/codex, configs/connectors.md)
//   node infra/mcp/apply.mjs --apply --home     # ...and merge into ~/.gemini/settings.json
//   node infra/mcp/apply.mjs --check --home     # ...and check that home file too
//   options: --manifest <path>  --root <dir>  --home-dir <dir>
//
// ~/.codex/config.toml is NOT written (static client_id / DCR support in Codex is unconfirmed); only the
// reviewable snippet configs/codex/google-workspace.toml is generated. mergeCodexToml() is kept as a tested library.
//
// Invariants:
//   - Only keys starting with "google-" are ever added/changed/removed. Everything else is kept byte-for-byte.
//   - The OAuth client secret is never written to any file or argv. Only an env-var reference is emitted.
//   - While oauth.client_id is the placeholder, no client entries are emitted (and --apply --home refuses).
//   - Output is platform independent (LF for generated files; merged files keep their own EOL).
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";

export const PREFIX = "google-";
export const TARGETS = ["claude-code", "codex", "gemini", "claude-desktop"];
const CLAUDE_AI_REDIRECT = "https://claude.ai/api/mcp/auth_callback";
const CODEX_BEGIN = "# >>> google-workspace-mcp (managed by infra/mcp/apply.mjs; do not edit) >>>";
const CODEX_END = "# <<< google-workspace-mcp <<<";
const CODEX_PORT_MARK = "# managed by infra/mcp/apply.mjs";
const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;
const isManaged = (key) => key.startsWith(PREFIX);
export const PLACEHOLDER_CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
/** True while servers.yaml still carries the committed placeholder (no real OAuth client configured). */
export const isPlaceholderClientId = (id) => id === PLACEHOLDER_CLIENT_ID || /^YOUR_/i.test(id);

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

/** Validate a parsed manifest object and return a normalised copy. Throws on any violation. */
export function parseManifest(raw) {
  const fail = (msg) => {
    throw new Error(`servers.yaml: ${msg}`);
  };
  if (!raw || typeof raw !== "object") fail("not a mapping");
  const oauth = raw.oauth ?? {};
  for (const k of Object.keys(oauth)) {
    if (/secret/i.test(k) && k !== "client_secret_env") fail(`oauth.${k}: secrets must not live in servers.yaml`);
  }
  const clientId = oauth.client_id;
  if (typeof clientId !== "string" || !clientId) fail("oauth.client_id must be a non-empty string");
  if (/^GOCSPX-/i.test(clientId) || /secret/i.test(clientId)) fail("oauth.client_id looks like a client secret");
  const port = oauth.callback_port;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) fail("oauth.callback_port must be an integer 1024-65535");
  const secretEnv = oauth.client_secret_env ?? "GOOGLE_MCP_CLIENT_SECRET";
  if (!ENV_NAME.test(secretEnv)) fail("oauth.client_secret_env must be an env var name");

  const servers = {};
  if (!raw.servers || typeof raw.servers !== "object") fail("servers must be a mapping");
  for (const [name, s] of Object.entries(raw.servers)) {
    if (!isManaged(name)) fail(`server "${name}": key must start with "${PREFIX}"`);
    if (!/^[a-z0-9-]+$/.test(name)) fail(`server "${name}": key must be [a-z0-9-]`);
    if (!s || typeof s !== "object") fail(`server "${name}": not a mapping`);
    let url;
    try {
      url = new URL(s.url);
    } catch {
      fail(`server "${name}": invalid url`);
    }
    if (url.protocol !== "https:") fail(`server "${name}": url must be https`);
    const scopes = s.scopes ?? [];
    if (!Array.isArray(scopes) || scopes.some((x) => typeof x !== "string" || /\s/.test(x) || !x)) {
      fail(`server "${name}": scopes must be a list of non-empty strings without spaces`);
    }
    const targets = s.targets ?? TARGETS;
    for (const t of targets) if (!TARGETS.includes(t)) fail(`server "${name}": unknown target "${t}"`);
    servers[name] = {
      enabled: s.enabled !== false,
      url: s.url,
      scopes: [...scopes],
      targets: [...targets],
      gcp_services: [...(s.gcp_services ?? [])],
    };
  }
  return { version: raw.version ?? 1, oauth: { client_id: clientId, callback_port: port, secretEnv }, servers };
}

export function loadManifest(path) {
  return parseManifest(parseYaml(readFileSync(path, "utf8")));
}

const enabledFor = (m, target) => Object.entries(m.servers).filter(([, s]) => s.enabled && s.targets.includes(target));
/** Like enabledFor, but empty while client_id is the placeholder (client configs must not ship a dead client). */
const activeFor = (m, target) => (isPlaceholderClientId(m.oauth.client_id) ? [] : enabledFor(m, target));

// ---------------------------------------------------------------------------
// Renderers (pure)
// ---------------------------------------------------------------------------

/** Claude Code .mcp.json entries (project scope). The client secret is supplied at login, never here. */
export function renderClaudeCode(m) {
  const out = {};
  for (const [name, s] of activeFor(m, "claude-code")) {
    out[name] = {
      type: "http",
      url: s.url,
      oauth: { clientId: m.oauth.client_id, callbackPort: m.oauth.callback_port, scopes: s.scopes.join(" ") },
    };
  }
  return out;
}

/** Gemini CLI ~/.gemini/settings.json entries. clientSecret is an env-var reference expanded by Gemini CLI. */
export function renderGemini(m) {
  const out = {};
  for (const [name, s] of activeFor(m, "gemini")) {
    out[name] = {
      httpUrl: s.url,
      oauth: {
        enabled: true,
        clientId: m.oauth.client_id,
        clientSecret: `\${${m.oauth.secretEnv}}`,
        scopes: [...s.scopes],
        redirectUri: `http://localhost:${m.oauth.callback_port}/oauth/callback`,
      },
    };
  }
  return out;
}

const tomlString = (v) => JSON.stringify(v); // JSON string escapes are valid TOML basic strings for our inputs

/** The managed Codex block (LF; converted to the target file's EOL on merge). */
export function renderCodexBlock(m) {
  const lines = [CODEX_BEGIN];
  for (const [name, s] of activeFor(m, "codex")) {
    lines.push(
      `[mcp_servers.${name}]`,
      `url = ${tomlString(s.url)}`,
      `# login: codex mcp login ${name} --scopes ${tomlString(s.scopes.join(","))}`,
      "",
    );
  }
  lines.push(CODEX_END);
  return `${lines.join("\n")}\n`;
}

/** Standalone, reviewable snippet committed at configs/codex/google-workspace.toml. */
export function renderCodexSnippet(m) {
  return [
    "# GENERATED by infra/mcp/apply.mjs from infra/mcp/servers.yaml — do not edit by hand.",
    "# UNVERIFIED: Codex support for a pre-registered (non-DCR) OAuth client is unconfirmed, so this is NOT",
    "# merged automatically. Copy it into ~/.codex/config.toml by hand after verifying (see infra/README.md).",
    ...(isPlaceholderClientId(m.oauth.client_id)
      ? ["# No servers emitted: oauth.client_id in infra/mcp/servers.yaml is still the placeholder."]
      : []),
    "# Top-level key (must precede any [table] in config.toml):",
    `mcp_oauth_callback_port = ${m.oauth.callback_port}`,
    "",
    renderCodexBlock(m),
  ].join("\n");
}

/** Claude Desktop is configured per account (Settings > Connectors), so emit a manual checklist. */
export function renderConnectorsMd(m) {
  const rows = enabledFor(m, "claude-desktop").map(
    ([name, s]) => `- [ ] **${name}** — URL \`${s.url}\` — scopes: ${s.scopes.map((x) => `\`${x}\``).join(", ")}`,
  );
  return [
    "<!-- GENERATED by infra/mcp/apply.mjs from infra/mcp/servers.yaml — do not edit by hand. -->",
    "# Claude Desktop / claude.ai Connectors checklist (Google Workspace MCP)",
    "",
    "Connectors are account-level (claude.ai). They are added manually in Claude Desktop or claude.ai under",
    "**Settings > Connectors > Add custom connector**, once per account (not per OS).",
    "",
    `- OAuth Client ID: \`${m.oauth.client_id}\``,
    `- OAuth Client Secret: paste from \`sops -d infra/mcp/secrets.sops.yaml\` (key \`${m.oauth.secretEnv}\`) directly into the dialog; never save it to a file.`,
    `- Redirect URI that must be registered on the OAuth client: \`${CLAUDE_AI_REDIRECT}\``,
    "",
    "## Servers",
    "",
    ...rows,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Secret guard
// ---------------------------------------------------------------------------

const SECRET_PATTERNS = [
  /GOCSPX-[A-Za-z0-9_-]{8,}/g,
  /"?client_?secret"?\s*[:=]\s*"(?!\$\{?[A-Z_][A-Z0-9_]*\}?")[^"]+"/gi,
];

/** Return secret-looking substrings found in `text` (env-var references are allowed). */
export function findSecretLeaks(text, env = {}) {
  const hits = [];
  for (const re of SECRET_PATTERNS) for (const m of text.matchAll(re)) hits.push(m[0].slice(0, 24));
  for (const k of ["GOOGLE_MCP_CLIENT_SECRET", "MCP_CLIENT_SECRET"]) {
    const v = env[k];
    if (typeof v === "string" && v.length >= 8 && text.includes(v)) hits.push(`<value of ${k}>`);
  }
  return hits;
}

export function assertNoSecrets(text, env = {}, target = "output") {
  const hits = findSecretLeaks(text, env);
  if (hits.length) throw new Error(`refusing to write secret-looking content to ${target} (${hits.length} hit(s))`);
}

/** Paths of leaf values in a decrypted-looking SOPS YAML object that are not `ENC[...]` (plus a missing `sops:`). */
export function findUnencryptedSopsValues(doc) {
  const bad = [];
  if (!doc || typeof doc !== "object") return ["<not a mapping>"];
  if (!("sops" in doc)) bad.push("<missing top-level sops:>");
  const walk = (v, path) => {
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
    else if (!(typeof v === "string" && v.startsWith("ENC["))) bad.push(path);
  };
  for (const [k, v] of Object.entries(doc)) if (k !== "sops") walk(v, k);
  return bad;
}

// ---------------------------------------------------------------------------
// Surgical JSON merge (keeps non-managed bytes verbatim)
// ---------------------------------------------------------------------------

const WS = /\s/;
const skipWs = (t, i) => {
  while (i < t.length && WS.test(t[i])) i++;
  return i;
};
function scanString(t, i) {
  for (i++; i < t.length; i++) {
    if (t[i] === "\\") i++;
    else if (t[i] === '"') return i + 1;
  }
  throw new Error("unterminated string");
}
function scanValue(t, i) {
  const c = t[i];
  if (c === '"') return scanString(t, i);
  if (c === "{" || c === "[") {
    let depth = 0;
    for (; i < t.length; i++) {
      const ch = t[i];
      if (ch === '"') i = scanString(t, i) - 1;
      else if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) return i + 1;
      }
    }
    throw new Error("unterminated container");
  }
  while (i < t.length && !/[\s,}\]]/.test(t[i])) i++;
  return i;
}
function scanMembers(t, open) {
  const members = [];
  let i = skipWs(t, open + 1);
  if (t[i] === "}") return { members, close: i };
  for (;;) {
    const start = i;
    const keyEnd = scanString(t, i);
    const key = JSON.parse(t.slice(start, keyEnd));
    i = skipWs(t, keyEnd);
    if (t[i] !== ":") throw new Error("expected ':'");
    const valueStart = skipWs(t, i + 1);
    const end = scanValue(t, valueStart);
    members.push({ key, start, valueStart, end });
    i = skipWs(t, end);
    if (t[i] === ",") i = skipWs(t, i + 1);
    else if (t[i] === "}") return { members, close: i };
    else throw new Error("expected ',' or '}'");
  }
}
const lineIndentAt = (t, i) => {
  const ls = t.lastIndexOf("\n", i - 1) + 1;
  return /^[ \t]*/.exec(t.slice(ls))[0];
};

/** Replace members of the object at `open` for which `drop(key)` is true, then append `add` ([key, value][]). */
function spliceObject(t, open, drop, add, eol) {
  const { members, close } = scanMembers(t, open);
  const parentIndent = lineIndentAt(t, open);
  let memberIndent = `${parentIndent}  `;
  if (members.length) {
    const gap0 = t.slice(open + 1, members[0].start);
    if (gap0.includes("\n")) memberIndent = gap0.slice(gap0.lastIndexOf("\n") + 1);
  }
  const unit =
    memberIndent.startsWith(parentIndent) && memberIndent.length > parentIndent.length
      ? memberIndent.slice(parentIndent.length)
      : "  ";
  const gaps = members.map((m, j) => t.slice(j === 0 ? open + 1 : members[j - 1].end, m.start));
  let out = t.slice(0, open + 1);
  let count = 0;
  members.forEach((m, j) => {
    if (drop(m.key)) return;
    let gap = gaps[j];
    if (count === 0 && j > 0) gap = gap.replace(",", "");
    else if (count > 0 && j === 0) gap = `,${gap}`;
    out += gap + t.slice(m.start, m.end);
    count++;
  });
  for (const [k, v] of add) {
    const body = JSON.stringify(v, null, unit)
      .split("\n")
      .join(eol + memberIndent);
    out += `${count ? "," : ""}${eol}${memberIndent}${JSON.stringify(k)}: ${body}`;
    count++;
  }
  if (members.length) out += t.slice(members.at(-1).end, close);
  else if (count) out += eol + parentIndent;
  else out += t.slice(open + 1, close);
  return out + t.slice(close);
}

/** JSON.parse whose error carries only line/column (Node's SyntaxError message can quote the input). */
export function parseStrictJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    if (!(e instanceof SyntaxError)) throw e;
    const pos = /position (\d+)/.exec(e.message);
    if (!pos) throw new Error("invalid JSON (location unknown)");
    const before = text.slice(0, Number(pos[1]));
    const line = before.split("\n").length;
    const column = before.length - before.lastIndexOf("\n");
    throw new Error(`invalid JSON at line ${line} column ${column}`);
  }
}

/**
 * Merge `entries` (all keys google-*) into `<root>.mcpServers` of a JSON document.
 * Existing google-* members are removed; everything else is kept byte-for-byte.
 */
export function mergeJsonServers(text, entries, { key = "mcpServers" } = {}) {
  for (const k of Object.keys(entries)) if (!isManaged(k)) throw new Error(`refusing to manage non-google key ${k}`);
  const src = text.trim() === "" ? "{}\n" : text;
  const parsed = parseStrictJson(src); // refuse anything that is not strict JSON
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("top level is not an object");
  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  const rootOpen = skipWs(src, 0);
  const add = Object.entries(entries).sort(([a], [b]) => a.localeCompare(b));
  const root = scanMembers(src, rootOpen);
  const holders = root.members.filter((m) => m.key === key);
  if (holders.length > 1) throw new Error(`duplicate top-level "${key}" keys; fix the file by hand`);
  const holder = holders[0];
  if (!holder) {
    if (!add.length) return text;
    return spliceObject(src, rootOpen, () => false, [[key, Object.fromEntries(add)]], eol);
  }
  if (src[holder.valueStart] !== "{") throw new Error(`"${key}" is not an object`);
  return spliceObject(src, holder.valueStart, isManaged, add, eol);
}

/** google-* members of `<root>.mcpServers` (for --check). */
export function extractManagedJson(text, { key = "mcpServers" } = {}) {
  const servers = text.trim() === "" ? {} : (parseStrictJson(text)?.[key] ?? {});
  return Object.fromEntries(Object.entries(servers).filter(([k]) => isManaged(k)));
}

// ---------------------------------------------------------------------------
// Codex TOML merge (managed block + one managed top-level line)
// ---------------------------------------------------------------------------

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BLOCK_RE = new RegExp(`(?:\\r?\\n)?${escapeRe(CODEX_BEGIN)}[\\s\\S]*?${escapeRe(CODEX_END)}[^\\n]*(?:\\n|$)`);
const PORT_LINE_RE = new RegExp(`^mcp_oauth_callback_port\\s*=[^\\n]*${escapeRe(CODEX_PORT_MARK)}[^\\n]*\\n`, "m");
// Table headers ([mcp_servers.google-x]) and dotted keys (mcp_servers.google-x.url = ...), quoted or bare.
const UNMANAGED_GOOGLE_RE = /^\s*(\[\s*)?mcp_servers\s*\.\s*"?google-/m;

/** Top-level `mcp_oauth_callback_port` value (only lines before the first table header). */
function topLevelPort(t) {
  for (const line of t.split(/\r?\n/)) {
    if (/^\s*\[/.test(line)) return null;
    const m = /^\s*mcp_oauth_callback_port\s*=\s*(\d+)/.exec(line);
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * Merge the managed block into a Codex config.toml text. `block === ""` removes it (and the managed port line).
 * Throws on unmanaged google-* tables or a conflicting user-set callback port.
 */
export function mergeCodexToml(text, block, port) {
  let base = text.replace(BLOCK_RE, "").replace(PORT_LINE_RE, "");
  if (UNMANAGED_GOOGLE_RE.test(base)) {
    throw new Error("unmanaged mcp_servers.google-* table/key in config.toml; remove it by hand first");
  }
  if (!block) return base;
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const userPort = topLevelPort(base);
  if (userPort !== null && userPort !== port) {
    throw new Error(`config.toml sets mcp_oauth_callback_port = ${userPort}, manifest wants ${port}; resolve by hand`);
  }
  if (userPort === null && port !== null) {
    base = `mcp_oauth_callback_port = ${port} ${CODEX_PORT_MARK}${eol}${base}`;
  }
  const sep = base === "" ? "" : `${base.endsWith("\n") ? "" : eol}${eol}`;
  return base + sep + block.replace(/\n/g, eol);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
const sameJson = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const readOr = (p, d = "") => (existsSync(p) ? readFileSync(p, "utf8") : d);
const stamp = () =>
  `${new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").replace("Z", "")}-${process.pid}`;

/** Write via a sibling temp file + rename so a crash never leaves a half-written config. */
function atomicWrite(path, content) {
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tmp, content, { flag: "wx" });
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

function argValue(argv, flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

/**
 * @param {string[]} argv
 * @param {{root?: string, homeDir?: string, manifestPath?: string, env?: Record<string,string|undefined>,
 *          io?: {log: (s: string) => void, error: (s: string) => void}}} [opts]
 * @returns {number} exit code (0 ok, 1 drift/error, 2 usage)
 */
export function run(argv, opts = {}) {
  const io = opts.io ?? console;
  const env = opts.env ?? process.env;
  const check = argv.includes("--check");
  const apply = argv.includes("--apply");
  if (check === apply) {
    io.error("usage: node infra/mcp/apply.mjs (--check | --apply) [--home] [--manifest p] [--root d] [--home-dir d]");
    return 2;
  }
  const root = resolve(argValue(argv, "--root") ?? opts.root ?? join(dirname(fileURLToPath(import.meta.url)), "../.."));
  const manifestPath = resolve(
    argValue(argv, "--manifest") ?? opts.manifestPath ?? join(root, "infra/mcp/servers.yaml"),
  );
  const home = argValue(argv, "--home-dir") ?? opts.homeDir ?? homedir();
  const withHome = argv.includes("--home") || argv.includes("--home-dir");

  let m;
  try {
    m = loadManifest(manifestPath);
  } catch (e) {
    io.error(`ERROR ${e.message}`);
    return 1;
  }
  if (apply && withHome && isPlaceholderClientId(m.oauth.client_id)) {
    io.error(
      "ERROR oauth.client_id in infra/mcp/servers.yaml is still the placeholder; set your OAuth client ID, then re-run --apply --home",
    );
    return 1;
  }

  // label: platform-independent display name
  const jobs = [
    { label: ".mcp.json", path: join(root, ".mcp.json"), kind: "json", entries: renderClaudeCode(m) },
    {
      label: "configs/codex/google-workspace.toml",
      path: join(root, "configs/codex/google-workspace.toml"),
      kind: "whole",
      content: renderCodexSnippet(m),
    },
    {
      label: "configs/connectors.md",
      path: join(root, "configs/connectors.md"),
      kind: "whole",
      content: renderConnectorsMd(m),
    },
  ];
  if (withHome) {
    jobs.push({
      label: "~/.gemini/settings.json",
      path: join(home, ".gemini/settings.json"),
      kind: "json",
      entries: renderGemini(m),
      backup: true,
    });
  }

  let failures = 0;
  for (const job of jobs) {
    try {
      const current = readOr(job.path, null);
      if (check) {
        let ok;
        if (current === null) ok = job.kind === "json" && Object.keys(job.entries).length === 0;
        else if (job.kind === "json") ok = sameJson(extractManagedJson(current), job.entries);
        else ok = current.replace(/\r\n/g, "\n") === job.content;
        io.log(`${ok ? "OK   " : "DRIFT"} ${job.label}`);
        if (!ok) failures++;
        continue;
      }
      // Secret guard on what WE render (not the user's whole merged file, which we do not own).
      assertNoSecrets(job.kind === "json" ? JSON.stringify(job.entries) : job.content, env, job.label);
      if (job.kind === "json" && current === null && Object.keys(job.entries).length === 0) {
        io.log(`UNCHANGED ${job.label} (nothing to add)`);
        continue;
      }
      const next = job.kind === "json" ? mergeJsonServers(current ?? "", job.entries) : job.content;
      const unchanged = job.kind === "whole" ? current?.replace(/\r\n/g, "\n") === next : current === next; // tolerate git autocrlf
      if (unchanged) {
        io.log(`UNCHANGED ${job.label}`);
        continue;
      }
      mkdirSync(dirname(job.path), { recursive: true });
      if (job.backup && current !== null) {
        copyFileSync(job.path, `${job.path}.bak-${stamp()}`, constants.COPYFILE_EXCL);
        io.log(`BACKUP  ${job.label} -> ${job.label}.bak-*`);
      }
      atomicWrite(job.path, next);
      io.log(`WROTE   ${job.label}`);
    } catch (e) {
      io.error(`ERROR ${job.label}: ${e.message}`);
      failures++;
    }
  }
  if (check && failures) io.error("drift detected: run `node infra/mcp/apply.mjs --apply` and commit the result");
  return failures ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = run(process.argv.slice(2));
}
