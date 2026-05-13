# Wrappers

Configuration-driven definitions for MCP servers that are thin wrappers around official upstream packages. These servers contain no custom source code -- they only declare a dependency on an upstream npm package and the environment variables needed to run it.

## Why wrappers?

Some MCP servers in `mcp_servers/` have no custom logic at all. Their entire purpose is to pin a version of an upstream package (e.g. `@notionhq/notion-mcp-server`) and document the required auth configuration. Maintaining a full directory with `package.json`, lock files, and `node_modules` for these is unnecessary overhead.

This `wrappers/` directory replaces that overhead with a single JSON file per server. The JSON file captures everything needed to understand, configure, and run the server.

## Config file structure

Each `.json` file follows this schema:

```jsonc
{
  // Human-readable identifier
  "name": "example-mcp",

  // What this wrapper provides
  "description": "Example integration via official MCP server",

  // The upstream npm package this wraps
  "upstream": {
    "package": "@scope/package-name",
    "version": "^1.0.0"
  },

  // Authentication requirements
  "auth": {
    "type": "apiKey",           // Auth mechanism: "apiKey", "oauth", "none"
    "envVar": "API_KEY_NAME",   // Single env var (use envVars for multiple)
    "envVars": ["VAR1", "VAR2"],// Multiple env vars (use instead of envVar)
    "notes": "How to obtain credentials"
  },

  // Ready-to-use Claude Desktop configuration block
  "desktop_config": {
    "command": "npx",
    "args": ["-y", "@scope/package-name"],
    "env": {
      "KEY": "${KEY}"
    }
  }
}
```

## Applying to Claude Desktop

Copy the `desktop_config` block from the wrapper JSON into your Claude Desktop configuration file:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Example -- to add the Notion wrapper, merge its `desktop_config` into `mcpServers`:

```json
{
  "mcpServers": {
    "notionApi": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_TOKEN": "${NOTION_TOKEN}"
      }
    }
  }
}
```

Set the referenced environment variables (`NOTION_TOKEN`, `SLACK_BOT_TOKEN`, etc.) in your system environment before launching Claude Desktop.

## Adding a new wrapper

1. Create a new `.json` file in this directory (e.g. `wrappers/github.json`).
2. Fill in the fields following the schema above.
3. Verify the upstream package exists on npm: `npm info @scope/package-name`
4. Test locally: run the `desktop_config.command` with `desktop_config.args` and confirm the server starts.
5. Add the `desktop_config` block to your Claude Desktop config and verify the integration works end-to-end.

## Available wrappers

| File | Upstream Package | Description |
|------|-----------------|-------------|
| `notion.json` | `@notionhq/notion-mcp-server` | Notion page/database access |
| `slack.json` | `@modelcontextprotocol/server-slack` | Slack channel read/write |
