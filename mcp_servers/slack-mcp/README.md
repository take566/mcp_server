# slack-mcp

> **Migrated**: This wrapper has been migrated to a configuration-based definition at [`wrappers/slack.json`](../../wrappers/slack.json). This directory is retained for backward compatibility only.

## What this is

A thin wrapper around the official [`@modelcontextprotocol/server-slack`](https://www.npmjs.com/package/@modelcontextprotocol/server-slack) package. There is no custom source code here -- only a `package.json` declaring the upstream dependency.

## Recommended usage

Instead of installing dependencies in this directory, use `npx` directly:

```bash
npx -y @modelcontextprotocol/server-slack
```

See `wrappers/slack.json` for the full configuration including auth setup and Claude Desktop integration.
