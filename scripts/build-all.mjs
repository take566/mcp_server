#!/usr/bin/env node

/**
 * build-all.mjs
 *
 * Builds every npm workspace declared in the root package.json that has a
 * "build" script. All workspaces share the single root package-lock.json and
 * node_modules (run `npm ci` at the repository root first).
 *
 * Git-ignored vendored clones under mcp_servers/ are not workspaces and are
 * not built here; build them with their own toolchain if needed.
 *
 * Usage:
 *   node scripts/build-all.mjs [--filter <name>] [--sequential] [--verbose]
 *
 * Options:
 *   --filter <name>   Build only workspaces whose directory name contains <name>
 *   --sequential      Run builds one at a time instead of in parallel
 *   --verbose         Show full build output (not just errors)
 */

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf-8"));
}

/** Run a command and capture output. Returns { ok, code, stdout, stderr, duration } */
function runCommand(cmd, args, cwd) {
  return new Promise((resolvePromise) => {
    const start = performance.now();
    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));

    const finish = (code, errMessage) => {
      const duration = ((performance.now() - start) / 1000).toFixed(1);
      resolvePromise({
        ok: code === 0,
        code,
        stdout: Buffer.concat(stdout).toString(),
        stderr: errMessage ?? Buffer.concat(stderr).toString(),
        duration,
      });
    };

    child.on("close", (code) => finish(code));
    child.on("error", (err) => finish(-1, err.message));
  });
}

const indent = (text, label) =>
  text
    .split("\n")
    .map((l) => `  ${label} ${l}`)
    .join("\n");

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const filterIdx = args.indexOf("--filter");
const filter = filterIdx !== -1 ? args[filterIdx + 1] : null;
const sequential = args.includes("--sequential");
const verbose = args.includes("--verbose");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== MCP Server Build (build-all, npm workspaces) ===\n");

  const rootPkg = await readJson(join(ROOT, "package.json"));
  const workspaces = rootPkg.workspaces ?? [];

  const buildTargets = [];
  for (const ws of workspaces) {
    const name = basename(ws);
    if (filter && !name.includes(filter)) continue;
    const pkg = await readJson(join(ROOT, ws, "package.json"));
    if (pkg.scripts?.build) buildTargets.push({ name, ws });
  }

  if (buildTargets.length === 0) {
    console.log("No buildable workspaces found.");
    process.exit(0);
  }

  console.log(`Found ${buildTargets.length} workspace(s) to build${filter ? ` (filter: "${filter}")` : ""}:\n`);
  for (const t of buildTargets) console.log(`  - ${t.name}  (${t.ws})`);
  console.log();

  async function buildOne(target) {
    const label = `[${target.name}]`;
    console.log(`${label} Building...`);

    const result = await runCommand("npm", ["run", "build", "--workspace", target.ws], ROOT);

    if (result.ok) {
      console.log(`${label} OK (${result.duration}s)`);
    } else {
      console.error(`${label} FAILED (exit ${result.code}, ${result.duration}s)`);
      // tsc reports type errors on stdout, so always show both streams on failure
      if (result.stdout) console.error(indent(result.stdout, label));
      if (result.stderr) console.error(indent(result.stderr, label));
    }

    if (verbose && result.ok && result.stdout) {
      console.log(indent(result.stdout, label));
    }

    return { ...target, ...result };
  }

  const startAll = performance.now();
  let results;
  if (sequential) {
    results = [];
    for (const target of buildTargets) results.push(await buildOne(target));
  } else {
    results = await Promise.all(buildTargets.map(buildOne));
  }
  const totalTime = ((performance.now() - startAll) / 1000).toFixed(1);

  const failed = results.filter((r) => !r.ok);

  console.log("\n=== Build Summary ===\n");
  console.log(`Total:   ${results.length}`);
  console.log(`Passed:  ${results.length - failed.length}`);
  console.log(`Failed:  ${failed.length}`);
  console.log(`Time:    ${totalTime}s${sequential ? " (sequential)" : " (parallel)"}\n`);

  console.log(`${"Workspace".padEnd(30)}${"Status".padEnd(10)}Time`);
  console.log("-".repeat(48));
  for (const r of results) {
    console.log(`${r.name.padEnd(30)}${(r.ok ? "OK" : "FAIL").padEnd(10)}${r.duration}s`);
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
