#!/usr/bin/env node

/**
 * sync-sdk.mjs
 *
 * Scans all MCP server package.json files and unifies the version of
 * @modelcontextprotocol/sdk to a single target version.
 *
 * Usage:
 *   node scripts/sync-sdk.mjs [--version <ver>] [--dry-run]
 *
 * Options:
 *   --version <ver>   Target version string (e.g. "^1.26.0").
 *                     Default: fetches the latest from npm registry.
 *   --dry-run         Show what would change without writing files.
 *
 * Examples:
 *   node scripts/sync-sdk.mjs                         # sync to latest
 *   node scripts/sync-sdk.mjs --version "^1.26.0"     # sync to specific
 *   node scripts/sync-sdk.mjs --dry-run               # preview changes
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SERVERS_DIR = join(ROOT, "mcp_servers");
const SDK_PACKAGE = "@modelcontextprotocol/sdk";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const versionIdx = args.indexOf("--version");
const explicitVersion = versionIdx !== -1 ? args[versionIdx + 1] : null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch the latest version of a package from the npm registry */
async function fetchLatestVersion(packageName) {
  const url = `https://registry.npmjs.org/${packageName}/latest`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(
      `Failed to fetch latest version of ${packageName}: ${resp.status} ${resp.statusText}`
    );
  }
  const data = await resp.json();
  return data.version;
}

/** Read and parse a JSON file, returning null on failure */
async function readJson(filePath) {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Write JSON with consistent formatting (2-space indent, trailing newline) */
async function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2) + "\n";
  await writeFile(filePath, content, "utf-8");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== MCP SDK Version Sync ===\n");

  // Resolve target version
  let targetVersion;
  if (explicitVersion) {
    targetVersion = explicitVersion;
    console.log(`Target version (explicit): ${targetVersion}`);
  } else {
    console.log("Fetching latest version from npm registry...");
    const latest = await fetchLatestVersion(SDK_PACKAGE);
    targetVersion = `^${latest}`;
    console.log(`Target version (latest):   ${targetVersion}`);
  }

  if (dryRun) {
    console.log("Mode: DRY RUN (no files will be modified)\n");
  } else {
    console.log();
  }

  // Scan servers
  const entries = await readdir(SERVERS_DIR, { withFileTypes: true });
  const serverDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, dir: join(SERVERS_DIR, e.name) }));

  const changes = [];
  const skipped = [];
  const unchanged = [];

  for (const { name, dir } of serverDirs) {
    const pkgPath = join(dir, "package.json");
    const pkg = await readJson(pkgPath);

    if (!pkg) {
      skipped.push({ name, reason: "no package.json" });
      continue;
    }

    // Check both dependencies and devDependencies
    let found = false;
    let section = null;
    let oldVersion = null;

    if (pkg.dependencies && pkg.dependencies[SDK_PACKAGE]) {
      found = true;
      section = "dependencies";
      oldVersion = pkg.dependencies[SDK_PACKAGE];
    } else if (pkg.devDependencies && pkg.devDependencies[SDK_PACKAGE]) {
      found = true;
      section = "devDependencies";
      oldVersion = pkg.devDependencies[SDK_PACKAGE];
    }

    if (!found) {
      skipped.push({ name, reason: "no SDK dependency" });
      continue;
    }

    if (oldVersion === targetVersion) {
      unchanged.push({ name, version: oldVersion, section });
      continue;
    }

    changes.push({ name, dir, pkgPath, pkg, section, oldVersion });

    if (!dryRun) {
      pkg[section][SDK_PACKAGE] = targetVersion;
      await writeJson(pkgPath, pkg);
    }
  }

  // Report
  console.log("=== Results ===\n");

  if (changes.length > 0) {
    console.log(
      `${dryRun ? "Would update" : "Updated"} ${changes.length} server(s):\n`
    );
    console.log(
      "Server".padEnd(30) +
        "Section".padEnd(20) +
        "Before".padEnd(16) +
        "After"
    );
    console.log("-".repeat(80));
    for (const c of changes) {
      console.log(
        c.name.padEnd(30) +
          c.section.padEnd(20) +
          c.oldVersion.padEnd(16) +
          targetVersion
      );
    }
    console.log();
  }

  if (unchanged.length > 0) {
    console.log(`Already at target (${unchanged.length}):`);
    for (const u of unchanged) {
      console.log(`  - ${u.name} (${u.section}: ${u.version})`);
    }
    console.log();
  }

  if (skipped.length > 0) {
    console.log(`Skipped (${skipped.length}):`);
    for (const s of skipped) {
      console.log(`  - ${s.name} (${s.reason})`);
    }
    console.log();
  }

  // Summary line
  const total = changes.length + unchanged.length + skipped.length;
  console.log(
    `Total: ${total} | ${dryRun ? "Would update" : "Updated"}: ${changes.length} | Unchanged: ${unchanged.length} | Skipped: ${skipped.length}`
  );

  if (dryRun && changes.length > 0) {
    console.log("\nRun without --dry-run to apply changes.");
  }

  if (!dryRun && changes.length > 0) {
    console.log(
      "\nNote: Run the appropriate install command in each updated server to update lockfiles."
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
