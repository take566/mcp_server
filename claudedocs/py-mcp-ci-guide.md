# Python MCP CI/CD Implementation Guide

## Overview

This guide documents the Python MCP CI/CD pipeline (`py-mcp-ci.yml`) for the mcp_server repository.

## Workflow Purpose

Provides comprehensive, production-ready CI/CD for Python MCP servers with:
- **Automated linting** with ruff
- **Code formatting** enforcement
- **Type checking** with mypy (advisory)
- **Test execution** with pytest
- **Coverage reporting** with codecov
- **Multi-version testing** across Python 3.11 and 3.12

## Workflow Structure

### Phase 1: Detect Changes
```yaml
detect-changes:
  uses: ./.github/workflows/detect-changes.yml
```
- Detects if Python files changed
- Uses `python_changed` output to conditionally run tests
- Integrates with existing monorepo change detection

### Phase 2: Lint and Test (Matrix)
```yaml
lint-and-test:
  strategy:
    matrix:
      python-version: ['3.11', '3.12']
```

Runs in parallel for Python 3.11 and 3.12:
1. **Setup**: Install Python, uv, cache dependencies
2. **Install**: `uv sync --all-extras` (fast, deterministic)
3. **Lint**: `uv run ruff check .` (enforced)
4. **Format**: `uv run ruff format --check .` (enforced)
5. **Type Check**: `uv run mypy .` (advisory, continue-on-error)
6. **Test**: `uv run pytest --cov=.` (creates coverage reports)
7. **Upload**: Coverage to codecov and HTML artifacts

### Phase 3: Summary
```yaml
ci-summary:
  needs: [detect-changes, lint-and-test]
  if: always()
```
- Generates comprehensive job status summary
- Shows quality gate results
- Provides next steps for developers

## Key Technologies

### uv Package Manager
- **Modern**: Next-generation Python package installer (Rust-based)
- **Fast**: 10-100x faster than pip
- **Deterministic**: Lock file ensures reproducible builds
- **Caching**: Built-in cache support via `astral-sh/setup-uv@v4`

**Why uv over pip/poetry?**
- Native virtualenv management
- Faster dependency resolution
- Better monorepo support
- Active development and excellent performance

### Ruff Linter/Formatter
- **Fast**: Written in Rust, 10-100x faster than flake8+black
- **Comprehensive**: Replaces flake8, black, isort, pydocstyle
- **Configured**: Inherits from root `ruff.toml`
- **Enforced**: Fails CI on violations

### Coverage Reporting
- **pytest-cov**: Coverage.py integration for pytest
- **Multiple formats**: Terminal, XML (for codecov), HTML (artifacts)
- **Target**: 95%+ coverage configured in pyproject.toml
- **Upload**: To codecov for trend tracking

## Testing the Workflow

### Local Testing
```bash
# Navigate to Python MCP server
cd tools/llm-script

# Install dependencies
uv sync --all-extras

# Run quality checks
uv run ruff check .
uv run ruff format --check .
uv run mypy .

# Run tests with coverage
uv run pytest --cov=. --cov-report=term-missing
```

### Manual Trigger
1. Go to Actions tab in GitHub
2. Select "Python MCP CI/CD" workflow
3. Click "Run workflow"
4. Select branch and trigger

### Monitoring
- **Job Summary**: Check GitHub Actions summary for overview
- **Logs**: Review individual step logs for failures
- **Artifacts**: Download coverage HTML reports for detailed analysis
- **Codecov**: View coverage trends at codecov.io (if configured)

## Integration with Existing Workflows

### Relationship with ruff.yml

**Old Workflow** (`ruff.yml`):
- Simple linting only
- Uses pip for installation
- No testing or coverage
- Single Python version (3.12)

**New Workflow** (`py-mcp-ci.yml`):
- Comprehensive CI/CD (lint + test + coverage)
- Uses modern uv package manager
- Python version matrix (3.11, 3.12)
- Better caching and performance
- More detailed reporting

**Migration Status**:
- Both workflows currently active
- `ruff.yml` marked as legacy (deprecated in comments)
- Plan: Validate py-mcp-ci.yml → Remove ruff.yml after 2-3 PRs

### detect-changes.yml Integration

**How it works**:
```yaml
detect-changes:
  uses: ./.github/workflows/detect-changes.yml

lint-and-test:
  needs: detect-changes
  if: needs.detect-changes.outputs.python_changed == 'true'
```

**Benefits**:
- Skips CI when no Python files changed
- Reduces CI minutes and runner usage
- Faster feedback for non-Python PRs

**Path Detection**:
Triggers on changes to:
- `tools/**/*.py`
- `mcp_servers/**/*.py` (future Python MCPs)

## Current Status

### Python MCP Servers
- **tools/llm-script**: Primary Python MCP server
  - Has pyproject.toml with full test configuration
  - No tests directory yet (workflow handles gracefully)
  - Ruff and mypy configured

### Quality Gates
- ✅ **Ruff linting**: ENFORCED (fails CI)
- ✅ **Ruff formatting**: ENFORCED (fails CI)
- ⚠️ **Mypy type checking**: ADVISORY (continue-on-error)
- 📊 **Pytest coverage**: RUNS (skips if no tests/)

### Known Limitations
1. **No tests yet**: Workflow handles gracefully with message
2. **Single server**: Currently only tools/llm-script
3. **Codecov token**: May need CODECOV_TOKEN secret for uploads

## Maintenance Guide

### Adding New Python MCP Servers

1. **Create pyproject.toml** with test configuration:
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
addopts = ["-v", "--cov=.", "--cov-report=term-missing"]

[tool.ruff]
extend = "../../ruff.toml"
```

2. **Update workflow** (if needed):
```yaml
- name: Install dependencies
  working-directory: tools/NEW_SERVER
  run: uv sync --all-extras
```

3. **Verify detection** in `detect-changes.yml`:
- Ensure new server path triggers `python_changed`

### Updating Python Versions

```yaml
strategy:
  matrix:
    python-version: ['3.11', '3.12', '3.13']  # Add new version
```

### Enabling Strict Type Checking

Once codebase is ready:
```yaml
- name: Run mypy type checking
  continue-on-error: false  # Change to fail CI
```

## Troubleshooting

### Issue: uv cache not working
**Solution**: Check cache-dependency-glob matches pyproject.toml path
```yaml
cache-dependency-glob: "tools/llm-script/pyproject.toml"
```

### Issue: Tests not found
**Expected**: Workflow skips pytest if no tests/ directory exists
**Solution**: Create `tools/llm-script/tests/test_*.py` files

### Issue: Coverage upload fails
**Cause**: Missing CODECOV_TOKEN secret
**Solution**: Add token in repository secrets or set `fail_ci_if_error: false`

### Issue: Ruff configuration not found
**Cause**: Missing root ruff.toml or incorrect extend path
**Solution**: Verify `tools/llm-script/pyproject.toml` has:
```toml
[tool.ruff]
extend = "../../ruff.toml"
```

## Future Enhancements

### Planned Improvements
1. **Multi-server support**: Detect and test multiple Python MCPs
2. **Security scanning**: Add bandit/safety for vulnerability detection
3. **Performance benchmarks**: pytest-benchmark for regression testing
4. **Documentation**: Auto-generate API docs with Sphinx
5. **Release automation**: Semantic versioning and changelog generation

### Performance Optimizations
1. **Better caching**: Cache test dependencies separately
2. **Parallel testing**: pytest-xdist for faster test execution
3. **Incremental analysis**: Only analyze changed files

## Quick Reference

### Commands
```bash
# Local development
uv sync --all-extras          # Install dependencies
uv run ruff check .           # Lint code
uv run ruff format .          # Format code
uv run mypy .                 # Type check
uv run pytest --cov=.         # Test with coverage

# CI triggers
git push origin feature/*     # Triggers workflow
gh workflow run py-mcp-ci.yml # Manual trigger
```

### File Locations
- Workflow: `.github/workflows/py-mcp-ci.yml`
- Config: `tools/llm-script/pyproject.toml`
- Root config: `ruff.toml`
- This guide: `claudedocs/py-mcp-ci-guide.md`

### Status Checks
- ✅ Success: All checks passed
- ⏭️ Skipped: No Python changes
- ❌ Failed: Review logs and fix issues

## Support

### Getting Help
- Review workflow logs in GitHub Actions
- Check this guide for common issues
- Examine existing TypeScript CI (`ts-mcp-ci.yml`) for patterns
- Reference detect-changes.yml for path configuration

### Contributing
- Test changes locally before pushing
- Keep pyproject.toml up to date
- Add tests for new functionality
- Update this guide with new patterns
