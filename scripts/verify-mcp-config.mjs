#!/usr/bin/env node
// Verify .mcp.json without starting any server.
// Usage: node scripts/verify-mcp-config.mjs [path/to/.mcp.json] [--ci]
// Exit 1 on any ERROR. Prints env var NAMES only, never values.
import { existsSync, readFileSync, statSync } from "node:fs";
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WIN_DRIVE = /^[A-Za-z]:[\\/]/;
const isWin = process.platform === "win32";

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

/** Cross-platform PATH lookup (honours PATHEXT on Windows). */
export function findOnPath(cmd, env = process.env) {
  const exts = isWin ? ["", ...(env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";").filter(Boolean)] : [""];
  const dirs =
    isAbsolute(cmd) || /[\\/]/.test(cmd) ? [""] : (env.PATH ?? env.Path ?? "").split(delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = dir ? join(dir, cmd + ext) : cmd + ext;
      if (isFile(candidate)) return candidate;
    }
  }
  return null;
}

/** Name of the real executable behind `cmd /c <tool> ...`, else the command itself. */
function effectiveCommand(command, args) {
  if (/^(cmd|cmd\.exe)$/i.test(command)) {
    const i = args.findIndex((a) => /^\/[ck]$/i.test(a));
    if (i >= 0 && typeof args[i + 1] === "string") return args[i + 1].trim().split(/\s+/)[0];
  }
  return command;
}

const NODE_VALUE_FLAGS = new Set([
  "-r",
  "--require",
  "--import",
  "--loader",
  "--experimental-loader",
  "-C",
  "--conditions",
  "--env-file",
  "--env-file-if-exists",
  "--disable-warning",
  "--title",
  "--max-old-space-size-percentage",
]);
const NODE_EVAL_FLAGS = new Set(["-e", "--eval", "-p", "--print", "-pe"]);
const INLINE_EVAL = Symbol("inline-eval");

/** First positional argument of `node`, skipping flags and their values; INLINE_EVAL for -e/-p. */
function findNodeScript(args) {
  for (let i = 0; i < args.length; i++) {
    if (NODE_EVAL_FLAGS.has(args[i])) return INLINE_EVAL;
    if (NODE_VALUE_FLAGS.has(args[i])) i++;
    else if (!args[i].startsWith("-")) return args[i];
  }
  return undefined;
}

/** Remote (url) server checks: https only, and a well-formed Claude Code `oauth` block. Never echoes values. */
function checkRemote(s) {
  const errs = [];
  let url;
  try {
    url = new URL(s.url);
  } catch {
    return ["remote url is not a valid URL"];
  }
  if (url.protocol !== "https:") errs.push(`remote url must be https (got ${url.protocol})`);
  if (s.oauth === undefined) return errs;
  const o = s.oauth;
  if (!o || typeof o !== "object" || Array.isArray(o)) return [...errs, `"oauth" must be an object`];
  if (o.clientId !== undefined && (typeof o.clientId !== "string" || !o.clientId)) {
    errs.push(`"oauth.clientId" must be a non-empty string`);
  }
  if (
    o.callbackPort !== undefined &&
    !(Number.isInteger(o.callbackPort) && o.callbackPort >= 1024 && o.callbackPort <= 65535)
  ) {
    // same range as infra/mcp/apply.mjs (oauth.callback_port)
    errs.push(`"oauth.callbackPort" must be an integer 1024-65535`);
  }
  if (o.scopes !== undefined && typeof o.scopes !== "string") {
    errs.push(`"oauth.scopes" must be a single space-separated string`);
  }
  if (Object.keys(o).some((k) => /secret/i.test(k))) {
    errs.push(`"oauth" must not contain a client secret (supply it at login via env var)`);
  }
  return errs;
}

/**
 * @param {string} file path to .mcp.json
 * @param {{ci?: boolean, env?: NodeJS.ProcessEnv}} [opts]
 * @returns {{errors: string[], warnings: string[], info: string[]}}
 */
export function verifyMcpConfig(file, { ci = false, env = process.env } = {}) {
  const errors = [];
  const warnings = [];
  const info = [];
  let config;
  try {
    config = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    errors.push(`${file}: cannot read/parse JSON (${e.message})`);
    return { errors, warnings, info };
  }
  const servers = config?.mcpServers;
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    errors.push(`${file}: missing "mcpServers" object`);
    return { errors, warnings, info };
  }
  const baseDir = dirname(resolve(file));

  for (const [name, s] of Object.entries(servers)) {
    if (s && typeof s === "object" && typeof s.url === "string" && !s.command) {
      info.push(`[${name}] remote server type=${s.type ?? "?"}`);
      for (const e of checkRemote(s)) errors.push(`[${name}] ${e}`);
      continue;
    }
    if (!s || typeof s !== "object" || typeof s.command !== "string" || !s.command) {
      errors.push(`[${name}] missing "command" string`);
      continue;
    }
    const args = Array.isArray(s.args) ? s.args : [];
    if (s.args !== undefined && (!Array.isArray(s.args) || args.some((a) => typeof a !== "string"))) {
      errors.push(`[${name}] "args" must be an array of strings`);
      continue;
    }
    const envNames = Object.keys(s.env ?? {});
    info.push(`[${name}] command=${s.command} env=[${envNames.join(", ")}]`);

    if (/^node(\.exe)?$/i.test(s.command)) {
      const script = findNodeScript(args);
      if (script === INLINE_EVAL) continue;
      if (!script) {
        errors.push(`[${name}] node server has no script argument`);
        continue;
      }
      if (!isWin && WIN_DRIVE.test(script)) {
        warnings.push(`[${name}] Windows path not checkable on ${process.platform}: ${script}`);
        continue;
      }
      if (/\$\{[^}]+\}|^~/.test(script)) {
        warnings.push(`[${name}] path uses variable/~ expansion, not checked: ${script}`);
        continue;
      }
      const abs = isAbsolute(script) ? script : resolve(s.cwd ? resolve(baseDir, s.cwd) : baseDir, script);
      if (!existsSync(abs)) {
        const msg = `[${name}] node script not found: ${script}`;
        if (ci && /[\\/]dist[\\/]/.test(script)) warnings.push(`${msg} (built dist, --ci)`);
        else errors.push(msg);
      }
      continue;
    }

    const tool = effectiveCommand(s.command, args);
    if (!findOnPath(tool, env)) warnings.push(`[${name}] command not found on PATH: ${tool}`);
  }
  return { errors, warnings, info };
}

function main(argv) {
  const ci = argv.includes("--ci");
  const pathArg = argv.find((a) => !a.startsWith("--"));
  const file = resolve(pathArg ?? join(dirname(fileURLToPath(import.meta.url)), "..", ".mcp.json"));
  const { errors, warnings, info } = verifyMcpConfig(file, { ci });
  for (const l of info) console.log(`INFO  ${l}`);
  for (const l of warnings) console.log(`WARN  ${l}`);
  for (const l of errors) console.log(`ERROR ${l}`);
  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
  return errors.length ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
