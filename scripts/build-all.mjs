#!/usr/bin/env node

/**
 * build-all.mjs
 *
 * Parallel build script for all MCP servers in the monorepo.
 * Auto-detects package manager per server by checking lockfiles:
 *   bun.lockb       -> bun
 *   pnpm-lock.yaml  -> pnpm
 *   package-lock.json -> npm
 *   (fallback)      -> npm
 *
 * Usage:
 *   node scripts/build-all.mjs [--filter <name>] [--sequential] [--verbose]
 *
 * Options:
 *   --filter <name>   Build only servers whose directory name contains <name>
 *   --sequential      Run builds one at a time instead of in parallel
 *   --verbose         Show full build output (not just errors)
 */

import { spawn } from "node:child_process";
import { readdir, access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { constants } from "node:fs";

const ROOT = resolve(import.meta.dirname, "..");
const SERVERS_DIR = join(ROOT, "mcp_servers");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a file exists */
async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Detect the package manager for a given server directory */
async function detectPackageManager(serverDir) {
  if (await fileExists(join(serverDir, "bun.lockb"))) return "bun";
  if (await fileExists(join(serverDir, "pnpm-lock.yaml"))) return "pnpm";
  return "npm";
}

/** Check if the server has a "build" script in its package.json */
async function hasBuildScript(serverDir) {
  const pkgPath = join(serverDir, "package.json");
  if (!(await fileExists(pkgPath))) return false;
  try {
    const raw = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw);
    return Boolean(pkg.scripts && pkg.scripts.build);
  } catch {
    return false;
  }
}

/** Run a command and capture output. Returns { ok, stdout, stderr, duration } */
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

    child.on("close", (code) => {
      const duration = ((performance.now() - start) / 1000).toFixed(1);
      resolvePromise({
        ok: code === 0,
        code,
        stdout: Buffer.concat(stdout).toString(),
        stderr: Buffer.concat(stderr).toString(),
        duration,
      });
    });

    child.on("error", (err) => {
      const duration = ((performance.now() - start) / 1000).toFixed(1);
      resolvePromise({
        ok: false,
        code: -1,
        stdout: "",
        stderr: err.message,
        duration,
      });
    });
  });
}

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
  console.log("=== MCP Server Build (build-all) ===\n");

  const entries = await readdir(SERVERS_DIR, { withFileTypes: true });
  const serverDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !filter || name.includes(filter));

  // Discover buildable servers
  const buildTargets = [];
  for (const name of serverDirs) {
    const dir = join(SERVERS_DIR, name);
    if (await hasBuildScript(dir)) {
      const pm = await detectPackageManager(dir);
      buildTargets.push({ name, dir, pm });
    }
  }

  if (buildTargets.length === 0) {
    console.log("No buildable servers found.");
    process.exit(0);
  }

  console.log(
    `Found ${buildTargets.length} server(s) to build${filter ? ` (filter: "${filter}")` : ""}:\n`
  );
  for (const t of buildTargets) {
    console.log(`  - ${t.name}  (${t.pm})`);
  }
  console.log();

  // Build function for a single server
  async function buildOne(target) {
    const { name, dir, pm } = target;
    const label = `[${name}]`;
    console.log(`${label} Building with ${pm}...`);

    const result = await runCommand(pm, ["run", "build"], dir);

    if (result.ok) {
      console.log(`${label} OK (${result.duration}s)`);
    } else {
      console.error(`${label} FAILED (exit ${result.code}, ${result.duration}s)`);
      if (result.stderr) {
        console.error(
          result.stderr
            .split("\n")
            .map((l) => `  ${label} ${l}`)
            .join("\n")
        );
      }
    }

    if (verbose && result.stdout) {
      console.log(
        result.stdout
          .split("\n")
          .map((l) => `  ${label} ${l}`)
          .join("\n")
      );
    }

    return { ...target, ...result };
  }

  // Execute builds
  const startAll = performance.now();
  let results;

  if (sequential) {
    results = [];
    for (const target of buildTargets) {
      results.push(await buildOne(target));
    }
  } else {
    results = await Promise.all(buildTargets.map(buildOne));
  }

  const totalTime = ((performance.now() - startAll) / 1000).toFixed(1);

  // Summary
  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log("\n=== Build Summary ===\n");
  console.log(`Total:   ${results.length}`);
  console.log(`Passed:  ${passed.length}`);
  console.log(`Failed:  ${failed.length}`);
  console.log(`Time:    ${totalTime}s${sequential ? " (sequential)" : " (parallel)"}\n`);

  if (failed.length > 0) {
    console.log("Failed servers:");
    for (const f of failed) {
      console.log(`  - ${f.name} (${f.pm}, exit ${f.code})`);
    }
    console.log();
  }

  // Table view
  console.log(
    "Server".padEnd(30) +
      "PM".padEnd(8) +
      "Status".padEnd(10) +
      "Time"
  );
  console.log("-".repeat(56));
  for (const r of results) {
    console.log(
      r.name.padEnd(30) +
        r.pm.padEnd(8) +
        (r.ok ? "OK" : "FAIL").padEnd(10) +
        `${r.duration}s`
    );
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
