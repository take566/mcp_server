import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const rootPkg = readJson("package.json");

describe("monorepo foundation", () => {
  it("requires Node 22+", () => {
    expect(rootPkg.engines?.node).toBe(">=22.12.0");
  });

  it("has a single root lockfile", () => {
    expect(existsSync(join(ROOT, "package-lock.json"))).toBe(true);
    expect(existsSync(join(ROOT, "pnpm-lock.yaml"))).toBe(false);
  });

  describe.each(rootPkg.workspaces)("%s", (ws) => {
    const pkg = readJson(`${ws}/package.json`);

    it("is a named npm package with a build script and no per-package lockfile", () => {
      expect(pkg.name).toBeTruthy();
      expect(pkg.scripts?.build).toBeTruthy();
      expect(pkg.packageManager).toBeUndefined();
      for (const lock of ["package-lock.json", "pnpm-lock.yaml", "bun.lock", "bun.lockb"]) {
        expect(existsSync(join(ROOT, ws, lock))).toBe(false);
      }
    });

    it("pins @modelcontextprotocol/sdk to the root override", () => {
      const sdk = pkg.dependencies?.["@modelcontextprotocol/sdk"];
      if (sdk) expect(sdk).toBe(rootPkg.overrides["@modelcontextprotocol/sdk"]);
    });

    it.runIf(existsSync(join(ROOT, ws, "tsconfig.json")))("extends the root tsconfig.base.json", () => {
      const tsconfig = readJson(`${ws}/tsconfig.json`);
      expect(tsconfig.extends).toBe("../../tsconfig.base.json");
      expect(pkg.scripts?.typecheck).toBe("tsc --noEmit");
    });
  });
});
