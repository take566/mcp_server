import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

// Passthrough wrappers: no source of their own, just a upstream dependency
// whose launch command and env var names are defined in wrappers/<name>.json.
const WRAPPERS = [
  {
    dir: "mcp_servers/slack-mcp",
    config: "wrappers/slack.json",
    upstream: "@modelcontextprotocol/server-slack",
    env: ["SLACK_BOT_TOKEN", "SLACK_TEAM_ID"],
  },
  {
    dir: "mcp_servers/notion-mcp-server",
    config: "wrappers/notion.json",
    upstream: "@notionhq/notion-mcp-server",
    env: ["NOTION_TOKEN"],
  },
];

describe.each(WRAPPERS)("wrapper $dir", ({ dir, config, upstream, env }) => {
  const pkg = readJson(`${dir}/package.json`);
  const cfg = readJson(config);

  it("is private, has no entry point (no local source), and depends only on the upstream package", () => {
    expect(pkg.private).toBe(true);
    expect(pkg.main).toBeUndefined();
    expect(Object.keys(pkg.dependencies)).toEqual([upstream]);
    expect(pkg.dependencies[upstream]).toBe(cfg.upstream.version);
  });

  it("launches the upstream package via npx", () => {
    expect(cfg.upstream.package).toBe(upstream);
    expect(cfg.desktop_config.command).toBe("npx");
    expect(cfg.desktop_config.args).toEqual(["-y", upstream]);
  });

  it("documents required env vars without embedding secrets", () => {
    expect(Object.keys(cfg.desktop_config.env)).toEqual(env);
    for (const name of env) expect(cfg.desktop_config.env[name]).toBe(`\${${name}}`);
  });
});
