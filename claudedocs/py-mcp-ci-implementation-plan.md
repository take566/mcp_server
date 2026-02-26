# Python MCP CI/CD Pipeline Implementation Plan

## Mission
Implement unified CI/CD pipeline for Python MCP servers with uv integration, ruff linting, mypy type checking, and pytest coverage.

## Current State Analysis

### Existing Assets
1. ✅ **detect-changes.yml**: Reusable workflow with `python_changed` output
2. ✅ **ruff.yml**: Basic ruff linting on Python 3.12
3. ✅ **Python Servers Identified**:
   - `tools/llm-script` (primary Python MCP, no pyproject.toml - uses requirements.txt)
   - `mcp_servers/markdownify-mcp` (has pyproject.toml, .venv mixed)

### Gap Analysis
- ❌ No mypy type checking
- ❌ No pytest integration
- ❌ No uv package manager integration
- ❌ No coverage reporting
- ❌ No Python version matrix (3.11-3.13)
- ❌ No integration with detect-changes.yml

## Implementation Strategy

### Phase 1: Create Main Workflow (`py-mcp-ci.yml`)
**Agent: workflow-creator**
**Deliverable**: `.github/workflows/py-mcp-ci.yml`

**Requirements**:
1. **Triggers**:
   - `push` to main branch
   - `pull_request` to main branch
   - `workflow_call` for reusability

2. **Job 1: detect-changes** (uses: `./.github/workflows/detect-changes.yml`)
   - Call existing workflow
   - Extract `python_changed` output

3. **Job 2: lint-with-ruff** (if: python_changed == true)
   - Python version: 3.12 (default)
   - Setup: astral-sh/setup-uv@v4
   - Cache: uv cache directory
   - Commands:
     ```bash
     uv --version
     ruff --version
     ruff check mcp_servers/ tools/
     ruff format --check mcp_servers/ tools/
     ```
   - Target paths:
     - `mcp_servers/markdownify-mcp/`
     - `tools/llm-script/`

4. **Job 3: type-check-with-mypy** (if: python_changed == true)
   - Python version: 3.12
   - Setup: astral-sh/setup-uv@v4
   - Install: `uv pip install mypy`
   - Commands:
     ```bash
     mypy --version
     mypy --strict --ignore-missing-imports mcp_servers/ tools/
     ```
   - Continue on error: true (non-blocking initially)

5. **Job 4: test-with-pytest** (if: python_changed == true)
   - Python version: 3.12
   - Setup: astral-sh/setup-uv@v4
   - Install dependencies:
     ```bash
     # For llm-script (requirements.txt)
     uv pip install -r tools/llm-script/requirements.txt
     uv pip install pytest pytest-cov

     # For markdownify-mcp (pyproject.toml)
     cd mcp_servers/markdownify-mcp && uv sync
     ```
   - Run pytest:
     ```bash
     pytest --cov=. --cov-report=term --cov-report=xml
     ```
   - Upload coverage: codecov/codecov-action@v3

6. **Job 5: python-matrix-test** (optional, if: python_changed == true)
   - Matrix strategy:
     - Python versions: [3.11, 3.12, 3.13]
     - OS: ubuntu-latest
   - Run abbreviated tests (lint only)

### Phase 2: Update Ruff Configuration (Optional)
**Agent: ruff-config-creator**
**Deliverable**: `ruff.toml` (root level)

**Content**:
```toml
[lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "SIM", "PL"]
ignore = ["E501"]  # Line length (handled by formatter)

[format]
line-length = 120
indent-style = "space"

[lint.per-file-ignores]
"__init__.py" = ["F401"]  # Unused imports in init files
"**/tests/**" = ["PLR2004"]  # Magic values in tests
```

### Phase 3: Create Python Project Metadata
**Agent: pyproject-creator**
**Deliverable**: `tools/llm-script/pyproject.toml`

**Content**:
```toml
[project]
name = "llm-script"
version = "0.1.0"
description = "LLM caching MCP server"
requires-python = ">=3.11"
dependencies = [
    # Extract from requirements.txt
]

[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
python_classes = "Test*"
python_functions = "test_*"
addopts = "-v --cov=. --cov-report=term-missing"

[tool.ruff]
line-length = 120
```

### Phase 4: Integration with Existing ruff.yml
**Agent: ruff-yml-integrator**
**Deliverable**: Updated `.github/workflows/ruff.yml`

**Changes**:
1. Add path filtering to only run on Python file changes
2. Integrate with detect-changes.yml
3. Add Python version matrix

## PDCA Cycle

### Plan ✅ (Current Phase)
- Analyzed existing workflows
- Identified Python MCP servers
- Designed 4-job pipeline with uv integration

### Do (Next Phase)
- **Task 1**: Create `py-mcp-ci.yml` with all 5 jobs
- **Task 2**: Create `ruff.toml` configuration
- **Task 3**: Create `tools/llm-script/pyproject.toml`
- **Task 4**: Update `ruff.yml` with path filtering

### Check (Validation Phase)
- **Task 5**: Test workflow on dummy PR
- **Task 6**: Verify uv cache hit rate >60%
- **Task 7**: Verify ruff execution <2 minutes
- **Task 8**: Verify pytest execution <5 minutes

### Act (Optimization Phase)
- **Task 9**: Add Python 3.13 support if tests pass
- **Task 10**: Enable mypy strict mode (currently non-blocking)
- **Task 11**: Set coverage threshold to 80%

## Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Ruff execution time | <2 min | TBD |
| Pytest execution time | <5 min | TBD |
| uv cache hit rate | >60% | TBD |
| Coverage | >80% | TBD |
| Workflow file size | <250 lines | TBD |

## Risk Mitigation

1. **Risk**: llm-script has no tests
   - **Mitigation**: Make pytest job non-blocking (continue-on-error: true)

2. **Risk**: markdownify-mcp .venv mixed in repo
   - **Mitigation**: Add `.venv` to paths-ignore in workflow

3. **Risk**: mypy strict mode may fail on legacy code
   - **Mitigation**: Start with `ignore_missing_imports: true`

4. **Risk**: uv not available on all platforms
   - **Mitigation**: Use astral-sh/setup-uv@v4 action for cross-platform support

## Delegation Strategy

### Task Agent 1: workflow-creator
- **Input**: This plan + detect-changes.yml
- **Output**: `.github/workflows/py-mcp-ci.yml`
- **Complexity**: HIGH
- **Dependencies**: None

### Task Agent 2: ruff-config-creator
- **Input**: Ruff best practices
- **Output**: `ruff.toml`
- **Complexity**: LOW
- **Dependencies**: None (can run parallel with Task 1)

### Task Agent 3: pyproject-creator
- **Input**: tools/llm-script/requirements.txt
- **Output**: `tools/llm-script/pyproject.toml`
- **Complexity**: MEDIUM
- **Dependencies**: None (can run parallel)

### Task Agent 4: ruff-yml-integrator
- **Input**: Existing ruff.yml + detect-changes.yml
- **Output**: Updated `ruff.yml`
- **Complexity**: MEDIUM
- **Dependencies**: Task 1 completed (workflow pattern established)

## Timeline

- **Phase 1**: 1 hour (Tasks 1-3 parallel)
- **Phase 2**: 30 minutes (Task 4)
- **Phase 3**: 30 minutes (Tasks 5-8 validation)
- **Phase 4**: 30 minutes (Tasks 9-11 optimization)

**Total**: ~2.5 hours for full implementation and validation
