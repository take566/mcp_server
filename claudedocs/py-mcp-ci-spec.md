# Python MCP CI/CD Workflow Specification

## Overview
Production-ready CI/CD pipeline for Python MCP servers using modern tooling (uv, ruff, pytest).

## Analysis Summary

### Current Python MCP Structure (tools/llm-script)
- **Python Version**: >=3.11 (configured in pyproject.toml)
- **Package Manager**: uv (modern, fast Python package manager)
- **Test Framework**: pytest with pytest-asyncio, pytest-cov, pytest-mock
- **Linting/Formatting**: ruff (configured with root ruff.toml inheritance)
- **Type Checking**: mypy (optional, gradually enabling strict mode)
- **Coverage**: Configured with 95%+ target, XML/HTML/term reports
- **No tests directory yet**: Tests should be created in `tests/` following pyproject.toml config

### detect-changes.yml Integration
- **Output Variable**: `python_changed` (boolean string 'true'/'false')
- **Usage Pattern**: `needs.detect-changes.outputs.python_changed == 'true'`
- **Path Detection**: Triggers on `tools/**/*.py` changes
- **Workflow Call**: Use `uses: ./.github/workflows/detect-changes.yml`

### TypeScript CI Reference Patterns
- **Concurrency Control**: Cancel in-progress workflows on same branch
- **Multi-phase Architecture**: detect → build/test → quality checks → summary
- **Matrix Strategy**: Run tests across multiple versions (Python 3.11, 3.12)
- **Cache Strategy**: Cache dependencies for faster runs
- **Timeout Management**: Job-level timeouts (10 min for main, 5 min for checks)
- **Conditional Execution**: Skip when no changes detected
- **Comprehensive Summary**: Generate markdown summary with all job statuses

## Workflow Design

### 1. Trigger Configuration
```yaml
on:
  push:
    branches: [main, feature/*]
  pull_request:
    branches: [main]
  workflow_call:  # Enable reusability
  workflow_dispatch:  # Manual trigger

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### 2. Job Structure

#### Job 1: detect-changes (reusable)
```yaml
detect-changes:
  name: Detect Python Changes
  uses: ./.github/workflows/detect-changes.yml
```

#### Job 2: lint-and-test (matrix)
```yaml
lint-and-test:
  name: Lint & Test (Python ${{ matrix.python-version }})
  runs-on: ubuntu-latest
  needs: detect-changes
  if: needs.detect-changes.outputs.python_changed == 'true'
  timeout-minutes: 10

  strategy:
    fail-fast: false
    max-parallel: 2
    matrix:
      python-version: ['3.11', '3.12']

  steps:
    - Checkout code
    - Setup Python with uv
    - Cache uv dependencies
    - Install dependencies with uv sync
    - Run ruff check
    - Run ruff format --check
    - Run mypy (optional, continue-on-error)
    - Run pytest with coverage
    - Upload coverage reports
```

#### Job 3: coverage-summary (optional)
```yaml
coverage-summary:
  name: Coverage Summary
  runs-on: ubuntu-latest
  needs: lint-and-test
  if: needs.detect-changes.outputs.python_changed == 'true'

  steps:
    - Download coverage artifacts
    - Generate coverage summary
    - Post to PR comment (optional)
```

#### Job 4: ci-summary
```yaml
ci-summary:
  name: CI Summary
  runs-on: ubuntu-latest
  needs: [detect-changes, lint-and-test]
  if: always()

  steps:
    - Generate comprehensive summary
    - Post overall CI status
```

### 3. uv Integration Details

#### Setup uv Action
```yaml
- name: Setup Python and uv
  uses: astral-sh/setup-uv@v4
  with:
    enable-cache: true
    cache-dependency-glob: "tools/llm-script/pyproject.toml"
```

#### Cache Strategy
```yaml
- name: Cache uv dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.cache/uv
      tools/llm-script/.venv
    key: ${{ runner.os }}-uv-${{ matrix.python-version }}-${{ hashFiles('tools/llm-script/pyproject.toml') }}
    restore-keys: |
      ${{ runner.os }}-uv-${{ matrix.python-version }}-
```

#### Dependency Installation
```yaml
- name: Install dependencies
  working-directory: tools/llm-script
  run: |
    uv sync --all-extras
```

### 4. Quality Checks

#### Ruff Linting
```yaml
- name: Run ruff check
  working-directory: tools/llm-script
  run: |
    uv run ruff check . --output-format=github
```

#### Ruff Formatting
```yaml
- name: Run ruff format check
  working-directory: tools/llm-script
  run: |
    uv run ruff format --check .
```

#### Type Checking (Optional)
```yaml
- name: Run mypy
  working-directory: tools/llm-script
  continue-on-error: true  # Gradually enabling
  run: |
    uv run mypy . || echo "Type checking issues found"
```

#### Testing with Coverage
```yaml
- name: Run pytest with coverage
  working-directory: tools/llm-script
  run: |
    uv run pytest --cov=. --cov-report=term-missing --cov-report=xml --cov-report=html
```

### 5. Coverage Reporting
```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    file: ./tools/llm-script/coverage.xml
    flags: python
    name: python-${{ matrix.python-version }}
```

### 6. Summary Generation
```yaml
- name: Generate CI summary
  if: always()
  run: |
    echo "## Python MCP CI/CD Summary" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "**Python Versions**: 3.11, 3.12" >> $GITHUB_STEP_SUMMARY
    echo "**Package Manager**: uv" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "### Job Status" >> $GITHUB_STEP_SUMMARY
    echo "- Lint & Test: ${{ needs.lint-and-test.result }}" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    if [ "${{ needs.lint-and-test.result }}" = "success" ]; then
      echo "✅ **All checks passed**" >> $GITHUB_STEP_SUMMARY
    else
      echo "❌ **Some checks failed - review logs above**" >> $GITHUB_STEP_SUMMARY
    fi
```

## Key Design Decisions

### 1. uv vs pip/poetry
- **Why uv**: Modern, fast, built-in virtualenv management
- **Cache Support**: Native caching in setup-uv action
- **Lockfile**: uv.lock provides deterministic builds
- **Speed**: 10-100x faster than pip

### 2. Python Version Matrix
- **3.11**: Minimum supported version (pyproject.toml requirement)
- **3.12**: Latest stable for testing forward compatibility
- **Not 3.13**: Wait for ecosystem maturity

### 3. Quality Gate Strategy
- **Ruff**: Required (fail on errors)
- **Mypy**: Optional (continue-on-error, gradually enabling)
- **Pytest**: Required (fail if coverage < target)
- **Format Check**: Required (enforce consistent style)

### 4. Integration with Existing Workflows
- **Parallel with ruff.yml**: py-mcp-ci.yml is comprehensive
- **Deprecation Path**: Mark ruff.yml as legacy, phase out after validation
- **Shared detect-changes**: Reuse existing change detection logic

### 5. Performance Optimization
- **Parallel Matrix**: Run Python 3.11 and 3.12 concurrently
- **Cache Strategy**: Cache uv dependencies and virtualenvs
- **Fail-fast: false**: Complete all matrix jobs even if one fails
- **Timeout Controls**: Prevent hanging jobs (10 min limit)

## Validation Checklist

- [ ] YAML syntax is valid
- [ ] All job dependencies are correct
- [ ] detect-changes integration works
- [ ] uv setup action is properly configured
- [ ] Cache paths are correct for uv
- [ ] Working directories match project structure
- [ ] Matrix strategy is optimal
- [ ] Timeout values are appropriate
- [ ] Summary generation is comprehensive
- [ ] Workflow can be triggered manually
- [ ] Concurrency control prevents conflicts

## Future Enhancements

1. **Multi-Project Support**: Extend to support multiple Python MCP servers
2. **Codecov Integration**: Add coverage reporting to external service
3. **Security Scanning**: Add bandit/safety for vulnerability detection
4. **Performance Benchmarks**: Add pytest-benchmark for regression detection
5. **Documentation Generation**: Auto-generate API docs with Sphinx
6. **Release Automation**: Integrate with semantic-release for versioning

## Relationship with ruff.yml

### Current ruff.yml
- Simple linting-only workflow
- Uses pip for ruff installation
- No testing or coverage
- No Python version matrix

### py-mcp-ci.yml Advantages
- Comprehensive CI/CD (lint + test + coverage)
- Modern tooling (uv instead of pip)
- Python version matrix
- Better caching strategy
- More detailed reporting

### Migration Path
1. Deploy py-mcp-ci.yml
2. Run both workflows in parallel for 2-3 PRs
3. Validate py-mcp-ci.yml catches all issues
4. Add deprecation notice to ruff.yml
5. Remove ruff.yml after validation period
