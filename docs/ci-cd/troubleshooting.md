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
3. Reinstall: `npm install` or `pnpm install`

The `ts-mcp-ci.yml` SDK compatibility job generates an automatic report.

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

### Changes made but CI does not run

**Diagnosis**:
```bash
# Check detect-changes logs in GitHub Actions
# Verify path filter definitions
cat .github/workflows/detect-changes.yml | grep -A 10 "filters:"
```

**Solutions**:
1. Verify path matches `mcp_servers/*/` pattern
2. Update path filter in `detect-changes.yml`
3. Force run: use `workflow_dispatch` manual trigger

### CI runs on unchanged files

**Cause**: Root config change (package.json, .github/workflows/**)

**Behavior**: Normal -- CRITICAL changes trigger full CI for all servers

### Empty affected_servers array

- Verify path filters match actual file changes
- Check git diff: `git diff --name-only origin/main..HEAD`
- Ensure server directories match exactly (case-sensitive on Linux)

## Parallel Execution Issues

### Jobs not running in parallel

**Diagnosis**: Check GitHub Actions UI for sequential execution

**Cause**: Concurrency group settings too strict

**Solution**:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}-${{ matrix.server }}
  cancel-in-progress: true
```

### Resource exhaustion

**Cause**: GitHub Actions parallel job limit (max 20 jobs)

**Solution**:
```yaml
strategy:
  max-parallel: 10
  matrix: ...
```

## Package Manager Detection

### Detection fails in CI

**Diagnosis**:
```bash
cd mcp_servers/<server-name>
if [ -f "bun.lockb" ]; then echo bun
elif [ -f "pnpm-lock.yaml" ]; then echo pnpm
else echo npm; fi
```

**Solution**: Ensure lockfile is committed to git.

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
cd <repo>/<server>
npm ci      # or pnpm/bun
npm run build
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

## CI Migration Guide

### ci.yml vs ts-mcp-ci.yml Comparison

| Feature | ci.yml | ts-mcp-ci.yml |
|---------|--------|---------------|
| Change Detection | No | Yes (dynamic) |
| Parallel Jobs | Sequential | Max 7 concurrent |
| Package Managers | Bun only | npm/pnpm/bun |
| Caching | No | Multi-level |
| Server Testing | Root only | Individual servers |
| SDK Compatibility | No | Automated check |

### Recommended Migration: Gradual Replacement

1. **Week 1**: Deploy ts-mcp-ci.yml alongside ci.yml (parallel)
2. **Week 2-3**: Validate performance, collect metrics
3. **Week 4**: Replace ci.yml if validation successful

### Rollback

```bash
git checkout HEAD~1 .github/workflows/ci.yml
git rm .github/workflows/ts-mcp-ci.yml
git commit -m "Rollback to original CI workflow"
git push
```

## Support

- Workflow validation: `bash .github/scripts/validate-workflow.sh`
- YAML check: `yamllint .github/workflows/`
- Unresolvable issues: Create a GitHub Issue
