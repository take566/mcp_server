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

  it("errors on invalid JSON", () => {
    expect(verifyMcpConfig(tmpConfig("{ nope")).errors.length).toBe(1);
  });

  it.skipIf(!existsSync(REAL))("real .mcp.json has no errors in --ci mode", () => {
    expect(verifyMcpConfig(REAL, { ci: true }).errors).toEqual([]);
  });
});
