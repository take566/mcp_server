# CI/CD Quick Start

> Understand the monorepo CI/CD system in 5 minutes.

## Overview

This repository uses **intelligent change detection** and **parallel execution** for fast CI/CD.

Key features:
- Up to 90% execution time reduction (50 min -> 5 min)
- Only changed components are tested
- 7 servers built in parallel
- Comprehensive automated reports

## Main Workflows

| File | Role | Trigger |
|------|------|---------|
| `monorepo-ci.yml` | Main orchestrator | push/PR |
| `detect-changes.yml` | Change detection & impact analysis | workflow_call |
| `ts-mcp-ci.yml` | TypeScript MCP CI | Conditional |
| `py-mcp-ci.yml` | Python MCP CI | Conditional |

## Basic Flow

```
1. Push code changes
   |
2. detect-changes runs automatically
   |
3. Appropriate CI triggered based on results:
   - TypeScript changes -> ts-mcp-ci
   - Python changes -> py-mcp-ci
   - Both -> parallel execution
   |
4. Results consolidated in GitHub Summary report
```

## Execution Time Estimates

| Your Change | CI Time |
|------------|---------|
| Single file edit | 3-5 min |
| One MCP server change | 3-5 min |
| Multiple server changes | 5-7 min |
| Root config change | 7-10 min (all servers) |

**First run**: 12-15 min without cache.
**Subsequent runs**: Faster with cache.

## Common Operations

### Add a New MCP Server

```bash
mkdir -p mcp_servers/new-server/src
# Create package.json, tsconfig.json, src/index.ts
# See: docs/adding-new-mcp-server.md

git add mcp_servers/new-server/
git commit -m "feat: add new-server"
git push
# CI auto-detects and runs
```

**No manual CI configuration required** -- path-based auto-detection.

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
GitHub Actions -> monorepo-ci -> Run workflow (manual dispatch)

### Skip CI
```bash
git commit -m "docs: update README [skip ci]"
```

## Detailed Documentation

- [Architecture](architecture.md) - System design, data flow, performance
- [Troubleshooting](troubleshooting.md) - Error resolution and debugging
- [Adding MCP Servers](../adding-new-mcp-server.md) - Step-by-step guide

## Performance Tips

1. **Small commits**: Limit change scope for shorter CI times
2. **Leverage cache**: Second runs are automatically faster
3. **Think parallel**: Independent changes in separate files/servers
4. **Fast feedback**: Failing tests are caught early
