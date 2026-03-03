# notion-mcp-server

> **Migrated**: This wrapper has been migrated to a configuration-based definition at [`wrappers/notion.json`](../../wrappers/notion.json). This directory is retained for backward compatibility only.

## What this is

A thin wrapper around the official [`@notionhq/notion-mcp-server`](https://www.npmjs.com/package/@notionhq/notion-mcp-server) package. There is no custom source code here -- only a `package.json` declaring the upstream dependency.

## Recommended usage

Instead of installing dependencies in this directory, use `npx` directly:

```bash
npx -y @notionhq/notion-mcp-server
```

See `wrappers/notion.json` for the full configuration including auth setup and Claude Desktop integration.
