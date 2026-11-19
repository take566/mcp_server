# CI/CD Troubleshooting Guide

## Workflow Execution Errors

| Problem | Symptom | Cause | Solution |
|---------|---------|-------|----------|
| **YAML syntax error** | Workflow does not start | YAML indentation error | Check with yamllint, fix indentation |
| **Permission denied** | Build script failure | Missing exec permission | Add `chmod +x` to build step |
| **Module not found** | Import error | Dependencies not installed | Verify `npm ci` or `uv sync` ran |
| **Timeout** | 10 min timeout | Processing too long | Increase timeout or optimize |

## Cache Issues

### Cache not hitting

**Diagnosis**:
```bash
# 1. Check cache key
echo ${{ hashFiles('**/package-lock.json') }}

# 2. Verify cache path
ls ~/.npm
ls node_modules

# 3. Check cache size (GitHub limit: 10GB)
gh cache list
```

**Solutions**:
- Verify cache key includes hash functions
- Configure `restore-keys` for fallback
- Split oversized caches

### Stale cache

```bash
# Delete specific cache
gh cache delete <cache-key>

# Or clear all caches
gh cache delete --all
```

## SDK Compatibility Errors

### Error: "SDK version mismatch"

**Diagnosis**:
```bash
grep -r "@modelcontextprotocol/sdk" mcp_servers/*/package.json
```

**Solution**:
1. Unify to recommended version: `^1.25.3`
2. Update package.json:
   ```json
   "dependencies": {
     "@modelcontextprotocol/sdk": "^1.25.3"
   }
   ```
3. Reinstall: `npm install` (at the repo root)

`npm run sync-sdk` aligns every workspace's SDK version with the root `overrides`. CI has no dedicated SDK-compatibility job; `tests/workspaces.test.mjs` asserts the pin.

## Build Failures

### TypeScript Compile Errors

```bash
cd mcp_servers/your-server
npm run build
```

Common errors:
- `Cannot find module`: Check tsconfig.json `paths`
- `Type error`: Fix strict mode type errors
- `Emit error`: Check outDir settings

### Python Ruff Errors

```bash
cd tools/your-python-mcp
ruff check .
ruff format --check .
```

Auto-fix:
```bash
ruff check --fix .
ruff format .
```

## Change Detection Issues

Only the Python job is gated by change detection (`changes` job in `ci.yml`).

### Python job does not run

**Cause**: `py_changed` is true only for `tools/**/*.py` or `tools/**/*.toml` changes.

**Solutions**:
- Check the `changes` job log (`Python changed: ...`)
- Run `workflow_dispatch` manually (the Python job still depends on `py_changed`)

### CI does not start at all

**Cause**: `paths-ignore` skips pushes/PRs that only touch `**/*.md`, `docs/**`, images, `LICENSE` or `.gitignore`.

### Node job always runs

Normal: the `node` job runs all root workspaces on every CI run.

## Package Manager

### `npm ci` fails in CI

Package manager is npm only. The only lockfile is the root `package-lock.json` (no per-server lockfiles).

**Diagnosis**:
```bash
git ls-files package-lock.json   # must be tracked
npm ci                           # run at the repo root
```

**Solution**: Ensure the root `package-lock.json` is committed and in sync with every workspace `package.json` (run `npm install` at the root and commit the result).

## Python CI Issues

### uv cache not working

Check cache-dependency-glob matches pyproject.toml path:
```yaml
cache-dependency-glob: "tools/llm-script/pyproject.toml"
```

### Tests not found

Expected behavior: Workflow skips pytest if no `tests/` directory exists.
Solution: Create `tools/llm-script/tests/test_*.py` files.

### Coverage upload fails

Cause: Missing CODECOV_TOKEN secret.
Solution: Add token in repository secrets or set `fail_ci_if_error: false`.

## Debug Procedures

### 1. Reading Logs

```
Actions tab -> Target workflow -> Failed job -> Logs
```

Key log sections:
- `Set up job`: Environment setup
- `Checkout`: Code checkout
- `Install dependencies`: Cache hit, install time
- `Build`: Build error messages
- `Test`: Test results
- `Post job`: Cache save

### 2. Local Reproduction

```bash
git clone <repo>
cd <repo>
npm ci      # at the repo root (npm workspaces)
npm run build --workspace mcp_servers/<server-name>
npm test
```

### 3. GitHub Actions Debug Mode

```bash
# Add to repository secrets:
ACTIONS_RUNNER_DEBUG: true
ACTIONS_STEP_DEBUG: true
```

Re-run for detailed logs.

## Error Message Reference

| Error Message | Meaning | Fix |
|--------------|---------|-----|
| `Process completed with exit code 1` | Build/test failure | Check logs for specific error |
| `Unable to locate executable file: npm` | Node.js not installed | Add setup-node action |
| `Cache not found` | Cache miss | Normal on first run; check key on repeat |
| `Resource not accessible by integration` | Permission issue | Check workflow permissions |
| `API rate limit exceeded` | GitHub API limit | Check GITHUB_TOKEN, wait |

## Support

- YAML check: `yamllint .github/workflows/`
- Unresolvable issues: Create a GitHub Issue
