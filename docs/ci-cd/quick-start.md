# CI/CD Quick Start

> Understand the monorepo CI/CD system in 5 minutes.

## Overview

CI is a single workflow, `.github/workflows/ci.yml`. The Node workspaces (typecheck, lint, format check, test, build) always run; the Python job runs only when files under `tools/` changed.

## Main Workflow

| File | Role | Trigger |
|------|------|---------|
| `ci.yml` | Node workspaces + Python tools + `CI Pass` gate | push/PR to main, manual dispatch |

## Basic Flow

```
1. Push code changes (docs/markdown-only changes skip CI)
   |
2. changes: detect Python changes under tools/
   |
3. node: npm ci -> typecheck -> lint -> format:check -> test -> build:all
   python: runs only if tools/ changed
   |
4. ci-pass: required status check
```

## Common Operations

### Add a New MCP Server

```bash
cp -r mcp_servers/_template mcp_servers/new-server
# Edit package.json, then add it to "workspaces" in the root package.json
# See: docs/adding-new-mcp-server.md

git add mcp_servers/new-server/
git commit -m "feat: add new-server"
git push
# CI runs the root npm workspaces job
```

**No CI configuration change required** -- once the server is listed in the root `workspaces`, the `node` job covers it.

### Handle CI Failure

1. Check GitHub Actions UI for logs
2. Read error messages
3. See: [troubleshooting.md](troubleshooting.md)

### Clear Cache

```bash
gh cache list
gh cache delete <cache-key>
```

## Emergency Operations

### Cancel Running Workflow
GitHub Actions UI -> Running workflow -> Cancel workflow

### Force Full Test Run
GitHub Actions -> CI -> Run workflow (manual dispatch)

### Skip CI
```bash
git commit -m "docs: update README [skip ci]"
```

## Detailed Documentation

- [Architecture](architecture.md) - Workflow structure
- [Troubleshooting](troubleshooting.md) - Error resolution and debugging
- [Adding MCP Servers](../adding-new-mcp-server.md) - Step-by-step guide
