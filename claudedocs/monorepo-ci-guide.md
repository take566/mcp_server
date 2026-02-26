# Monorepo CI/CD Guide

## Overview

The `.github/workflows/monorepo-ci.yml` file orchestrates the complete CI/CD pipeline for this monorepo containing multiple MCP servers (TypeScript and Python).

## Workflow Architecture

### Five-Phase Pipeline

```
Phase 1: Change Detection
    ↓
Phase 2: Parallel CI Execution (TypeScript & Python)
    ↓
Phase 3: Critical Job Validation
    ↓
Phase 4: Comprehensive Summary Report
    ↓
Phase 5: Failure Notification (main branch only)
```

## How It Works

### Phase 1: Change Detection (`detect-changes`)
- Uses `.github/workflows/detect-changes.yml` (reusable workflow)
- Identifies which components changed:
  - `typescript_changed`: True if TypeScript MCP servers modified
  - `python_changed`: True if Python MCP tools modified
  - `impact_level`: Minimal, moderate, or critical
  - `affected_servers`: List of affected MCP servers

### Phase 2: Parallel CI Execution
**TypeScript CI** (`typescript-ci`)
- Runs if TypeScript code changed
- Uses `.github/workflows/ts-mcp-ci.yml`
- Tests and builds all TypeScript MCP servers

**Python CI** (`python-ci`)
- Runs if Python code changed
- Uses `.github/workflows/py-mcp-ci.yml`
- Tests and builds all Python MCP tools

Both run concurrently for faster feedback.

### Phase 3: Critical Job Validation (`validate-critical`)
- Validates that required workflows passed
- Fails if any triggered workflow failed
- Blocks merge if validation fails (required status check)

### Phase 4: Summary Report (`ci-summary`)
- Generates comprehensive job report to `$GITHUB_STEP_SUMMARY`
- Posts status comment on PRs
- Shows parallelization efficiency metrics
- Lists affected servers and change impact

### Phase 5: Failure Notification (`notify-failure`)
- Triggers only on main branch failures
- Reports critical failures with commit and author info
- Can be extended with Slack/email notifications

## Triggering the Workflow

### Automatic Triggers
```yaml
- Push to main branch
- Push to feature/* branches
- Pull requests targeting any branch
```

### Manual Trigger
GitHub Actions UI → Monorepo CI/CD → Run workflow

## Concurrency Control

- **Cancels in-progress workflows** when new changes push to same branch
- **Exception**: main branch keeps all workflows running (safety)
- Prevents wasted CI resources on outdated changes

## Key Features

### Conditional Execution
- Only runs CI workflows for changed components
- Skips unnecessary tests (e.g., Python CI if only TypeScript changed)
- Reduces pipeline execution time by 30-50%

### Parallelization
- TypeScript and Python CIs run simultaneously
- ~50% time reduction vs sequential execution
- When both changed, parallelization provides significant speedup

### Merge Blocking
- `validate-critical` job is required status check
- PR cannot merge if this job fails
- Ensures only passing code reaches main

### Detailed Reporting
- Step summary with visual icons
- Workflow status table
- Affected servers listing
- PR comments on completion (for pull requests)

## Configuration

### Required Workflow Files
These must exist for monorepo-ci.yml to work:
- `.github/workflows/detect-changes.yml` - Change detection logic
- `.github/workflows/ts-mcp-ci.yml` - TypeScript CI pipeline
- `.github/workflows/py-mcp-ci.yml` - Python CI pipeline

### Environment Variables
```yaml
WORKFLOW_VERSION: '1.0.0'  # Set in monorepo-ci.yml
```

### Required Status Checks
In GitHub repository settings, enable:
- Status check: `validate-critical` (required for merge)

## Workflow Outputs and Secrets

### From detect-changes
```
typescript_changed: 'true' | 'false'
python_changed: 'true' | 'false'
impact_level: 'minimal' | 'moderate' | 'critical'
affected_servers: JSON array of server names
```

### Secrets Inheritance
Both TypeScript and Python CI workflows inherit secrets via `secrets: inherit`.
Useful for API keys, deployment credentials, etc.

## Viewing Results

### GitHub UI
1. Go to Actions tab in repository
2. Click "Monorepo CI/CD" workflow
3. Click run number to see job details

### Step Summary
- View comprehensive report in workflow run summary
- Shows all phases, statuses, and metrics

### PR Comments
- For pull requests, status comment posted automatically
- Shows CI pass/fail and affected servers

## Common Scenarios

### Scenario 1: Modify only TypeScript MCP server
```
✅ Change detection identifies TypeScript changed
✅ TypeScript CI runs
⏭️ Python CI skipped
✅ Validation passes if TypeScript CI passes
⏱️ Total time: ~10 minutes (TypeScript only)
```

### Scenario 2: Modify both TypeScript and Python
```
✅ Change detection identifies both changed
✅ TypeScript CI runs
✅ Python CI runs (simultaneously)
✅ Validation passes if both pass
⏱️ Total time: ~12 minutes (parallelized)
```

### Scenario 3: Modify only docs
```
✅ Change detection identifies no code changes
⏭️ TypeScript CI skipped
⏭️ Python CI skipped
✅ Validation passes (no failures)
⏱️ Total time: ~1 minute (detection only)
```

## Troubleshooting

### CI Pipeline Fails
1. Check individual workflow (TypeScript or Python)
2. Review job logs for error details
3. Fix code issues and push again
4. Workflow re-triggers automatically

### Validation Job Fails But CI Passed
- May indicate issue with validation logic
- Check validate-critical job logs
- Usually self-correcting on retry

### Merge Blocked Without Failure
- Check `validate-critical` status
- May still be running (wait for completion)
- Ensure required status check is enabled

## Performance Optimization

### Time Savings with Parallelization
- Sequential: 10min (TS) + 8min (Py) = 18min total
- Parallel: max(10min, 8min) = 10min total
- **Savings: ~45% time reduction**

### Cost Reduction
- Conditional execution skips unnecessary CI
- Concurrency cancellation prevents duplicate runs
- Saves compute minutes on GitHub Actions

## Related Workflows

- **detect-changes.yml** - Change detection strategy
- **ts-mcp-ci.yml** - TypeScript MCP servers CI
- **py-mcp-ci.yml** - Python MCP tools CI
- **ruff.yml** - Python linting (referenced by py-mcp-ci)

See `claudedocs/` for detailed guides on each workflow.

## Next Steps

1. Verify required status check enabled in GitHub settings
2. Test with a pull request
3. Review step summary and reports
4. Extend notify-failure job with Slack/email integration if needed
