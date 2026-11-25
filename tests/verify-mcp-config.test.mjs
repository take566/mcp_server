import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyMcpConfig } from "../scripts/verify-mcp-config.mjs";

const REAL = join(import.meta.dirname, "..", ".mcp.json");
const missingScript = join(tmpdir(), "nope", "dist", "index.js");
const tmpConfig = (servers) => {
  const f = join(mkdtempSync(join(tmpdir(), "mcpcfg-")), ".mcp.json");
  writeFileSync(f, typeof servers === "string" ? servers : JSON.stringify({ mcpServers: servers }));
  return f;
};

describe("verify-mcp-config", () => {
  it("errors on a nonexistent node script without leaking env values", () => {
    const r = verifyMcpConfig(tmpConfig({ x: { command: "node", args: [missingScript], env: { K: "s3cr3t" } } }));
    expect(r.errors.length).toBe(1);
    expect(JSON.stringify(r)).not.toContain("s3cr3t");
    expect(JSON.stringify(r)).toContain("K");
  });

  it("downgrades a missing built dist to a warning with --ci", () => {
    const r = verifyMcpConfig(tmpConfig({ x: { command: "node", args: [missingScript] } }), { ci: true });
    expect(r.errors).toEqual([]);
    expect(r.warnings.length).toBe(1);
  });

  it("warns (not errors) for missing external tools", () => {
    const f = tmpConfig({ x: { command: "definitely-not-a-real-tool-xyz" } });
    const r = verifyMcpConfig(f, { env: { PATH: "" } });
    expect(r.errors).toEqual([]);
    expect(r.warnings.length).toBe(1);
  });

  it("passes for an existing node script, skipping flag values, and accepts remote servers", () => {
    const real = join(import.meta.dirname, "verify-mcp-config.test.mjs");
    const r = verifyMcpConfig(
      tmpConfig({
        a: { command: "node", args: ["--import", "tsx", real] },
        b: { type: "http", url: "https://example.com/mcp" },
      }),
    );
    expect(r.errors).toEqual([]);
  });

  it("skips inline eval and skips --env-file values when locating the script", () => {
    const real = join(import.meta.dirname, "verify-mcp-config.test.mjs");
    const r = verifyMcpConfig(
      tmpConfig({
        a: { command: "node", args: ["-e", "console.log(1)"] },
        b: { command: "node", args: ["--env-file", "a.env", real] },
      }),
    );
    expect(r.errors).toEqual([]);
    const bad = verifyMcpConfig(tmpConfig({ c: { command: "node", args: ["--env-file", "a.env", missingScript] } }));
    expect(bad.errors.length).toBe(1);
  });

  it("errors on non-https remote servers", () => {
    const r = verifyMcpConfig(tmpConfig({ x: { type: "http", url: "http://example.com/mcp" } }));
    expect(r.errors.length).toBe(1);
    expect(r.errors[0]).toMatch(/https/);
    expect(verifyMcpConfig(tmpConfig({ x: { type: "http", url: "not a url" } })).errors.length).toBe(1);
  });

  it("validates the oauth shape of remote servers and forbids inline client secrets", () => {
    const ok = {
      type: "http",
      url: "https://gmailmcp.googleapis.com/mcp/v1",
      oauth: { clientId: "x.apps.googleusercontent.com", callbackPort: 8765, scopes: "a b" },
    };
    expect(verifyMcpConfig(tmpConfig({ ok })).errors).toEqual([]);
    const bad = (oauth) => verifyMcpConfig(tmpConfig({ b: { ...ok, oauth } })).errors;
    expect(bad("nope").length).toBe(1);
    expect(bad({ ...ok.oauth, clientId: "" }).length).toBe(1);
    expect(bad({ ...ok.oauth, callbackPort: "8765" }).length).toBe(1);
    expect(bad({ ...ok.oauth, callbackPort: 70000 }).length).toBe(1);
    expect(bad({ ...ok.oauth, callbackPort: 80 }).length).toBe(1); // aligned with apply.mjs: 1024-65535
    expect(bad({ ...ok.oauth, scopes: ["a", "b"] }).length).toBe(1);
    const leak = bad({ ...ok.oauth, clientSecret: "GOCSPX-supersecretvalue" });
    expect(leak.length).toBe(1);
    expect(leak[0]).not.toContain("GOCSPX-supersecretvalue");
  });

  it("errors on invalid JSON", () => {
    expect(verifyMcpConfig(tmpConfig("{ nope")).errors.length).toBe(1);
  });

  it.skipIf(!existsSync(REAL))("real .mcp.json has no errors in --ci mode", () => {
    expect(verifyMcpConfig(REAL, { ci: true }).errors).toEqual([]);
  });
});
