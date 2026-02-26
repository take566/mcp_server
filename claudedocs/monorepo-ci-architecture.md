# Monorepo CI/CD Architecture

## Overview

The Monorepo CI/CD orchestrator provides intelligent, parallel execution of CI workflows based on change detection, optimizing build times while maintaining comprehensive quality checks.

## Architecture Diagram

```mermaid
graph TB
    Start([Push/PR Event]) --> Detect[🔍 Detect Changes<br/>detect-changes.yml]

    Detect --> Decision{What Changed?}

    Decision -->|TypeScript| TSDecision{TypeScript<br/>Changed?}
    Decision -->|Python| PyDecision{Python<br/>Changed?}
    Decision -->|Both| BothDecision{Both<br/>Changed?}
    Decision -->|Neither| Skip[⏭️ Skip CI<br/>No changes detected]

    TSDecision -->|Yes| TSCI[🟦 TypeScript CI<br/>ts-mcp-ci.yml]
    TSDecision -->|No| SkipTS[⏭️ Skip TS CI]

    PyDecision -->|Yes| PyCI[🐍 Python CI<br/>py-mcp-ci.yml]
    PyDecision -->|No| SkipPy[⏭️ Skip Py CI]

    BothDecision -->|Yes| Parallel{Run in Parallel}

    Parallel --> TSCI
    Parallel --> PyCI

    TSCI --> TSResult{TS Result}
    PyCI --> PyResult{Py Result}
    SkipTS --> Validate
    SkipPy --> Validate

    TSResult -->|Success| Validate[✅ Validate Critical<br/>Check all results]
    TSResult -->|Failure| Validate
    PyResult -->|Success| Validate
    PyResult -->|Failure| Validate

    Validate --> ValidResult{All<br/>Critical<br/>Passed?}

    ValidResult -->|Yes| Summary[📊 CI Summary<br/>Generate report]
    ValidResult -->|No| Summary

    Summary --> Final{Overall<br/>Status}

    Final -->|Success| Pass[✅ CI PASSED<br/>Ready for merge]
    Final -->|Failure| Fail[❌ CI FAILED<br/>Fix required]

    Fail -->|Main branch| Notify[🚨 Notify Failure<br/>Alert team]

    Skip --> Summary

    style Start fill:#e1f5ff
    style Detect fill:#fff4e1
    style TSCI fill:#e3f2fd
    style PyCI fill:#f3e5f5
    style Validate fill:#e8f5e9
    style Summary fill:#fff3e0
    style Pass fill:#c8e6c9
    style Fail fill:#ffcdd2
    style Notify fill:#ff8a80
    style Parallel fill:#ffe0b2
```

## Workflow Execution Flow

### Phase 1: Change Detection
```mermaid
sequenceDiagram
    participant Trigger as Push/PR
    participant Detect as detect-changes.yml
    participant Output as Workflow Outputs

    Trigger->>Detect: Trigger workflow
    Detect->>Detect: Analyze changed files
    Detect->>Detect: Determine affected servers
    Detect->>Detect: Calculate impact level
    Detect->>Output: typescript_changed
    Detect->>Output: python_changed
    Detect->>Output: affected_servers
    Detect->>Output: impact_level
```

### Phase 2: Parallel CI Execution
```mermaid
sequenceDiagram
    participant Detect as Change Detection
    participant TS as TypeScript CI
    participant Py as Python CI
    participant Validate as Validation

    Detect->>Detect: Evaluate outputs

    alt TypeScript Changed
        Detect->>TS: Trigger ts-mcp-ci.yml
        TS->>TS: Build & Test matrix
        TS->>TS: Type checking
        TS->>TS: Prettier formatting
        TS->>TS: SDK compatibility
        TS->>Validate: Report results
    end

    alt Python Changed
        Detect->>Py: Trigger py-mcp-ci.yml
        Py->>Py: Ruff linting
        Py->>Py: Mypy type checking
        Py->>Py: Pytest with coverage
        Py->>Py: Python matrix test
        Py->>Validate: Report results
    end

    Note over TS,Py: Both run in parallel if both changed

    Validate->>Validate: Check all critical results
    Validate->>Validate: Determine pass/fail
```

### Phase 3: Summary & Reporting
```mermaid
sequenceDiagram
    participant Val as Validation
    participant Sum as CI Summary
    participant Report as GitHub Summary
    participant PR as PR Comment
    participant Alert as Notifications

    Val->>Sum: All results collected
    Sum->>Sum: Generate comprehensive report
    Sum->>Report: Post to workflow summary
    Sum->>Sum: Calculate performance metrics

    alt Pull Request Event
        Sum->>PR: Post status comment
    end

    alt Failure on Main
        Sum->>Alert: Trigger failure notification
    end
```

## Concurrency Control

```mermaid
graph LR
    A[New Push] --> B{Same Branch?}
    B -->|Yes| C{Branch = main?}
    B -->|No| D[Run normally]

    C -->|Yes| E[Keep running<br/>Don't cancel]
    C -->|No| F[Cancel in-progress<br/>Start new run]

    E --> G[Parallel execution]
    F --> G
    D --> G

    style A fill:#e1f5ff
    style C fill:#fff4e1
    style F fill:#ffcdd2
    style E fill:#c8e6c9
    style G fill:#e8f5e9
```

## Conditional Execution Matrix

| Scenario | TS Changed | Py Changed | TS CI Runs | Py CI Runs | Efficiency Gain |
|----------|------------|------------|------------|------------|-----------------|
| TS only | ✅ | ❌ | ✅ | ⏭️ | ~50% (skip Py) |
| Py only | ❌ | ✅ | ⏭️ | ✅ | ~50% (skip TS) |
| Both | ✅ | ✅ | ✅ | ✅ | ~50% (parallel) |
| Neither | ❌ | ❌ | ⏭️ | ⏭️ | ~100% (skip all) |
| Root config | N/A | N/A | ✅ | ✅ | Full validation |

## Job Dependencies

```mermaid
graph TD
    Start[monorepo-ci.yml] --> Detect[detect-changes]

    Detect --> TS[typescript-ci]
    Detect --> Py[python-ci]

    TS --> Validate[validate-critical]
    Py --> Validate
    Detect --> Validate

    Validate --> Summary[ci-summary]
    TS --> Summary
    Py --> Summary
    Detect --> Summary

    Validate -->|Failure + Main| Notify[notify-failure]

    style Detect fill:#fff4e1
    style TS fill:#e3f2fd
    style Py fill:#f3e5f5
    style Validate fill:#e8f5e9
    style Summary fill:#fff3e0
    style Notify fill:#ff8a80
```

## Key Features

### 1. Intelligent Conditional Execution
- Only runs necessary CI workflows based on file changes
- Reduces unnecessary builds by ~50% on average
- Root config changes trigger full validation

### 2. Parallel Execution Optimization
- TypeScript and Python CIs run concurrently when both changed
- Independent job execution maximizes throughput
- ~50% time reduction vs sequential execution

### 3. Concurrency Control
- Cancels in-progress workflows on feature branches for faster feedback
- Protects main branch workflows from cancellation
- Prevents resource waste on superseded commits

### 4. Comprehensive Reporting
- Consolidated summary with all workflow results
- Performance metrics and efficiency calculations
- Automatic PR comments with status updates
- Detailed job-level success/failure indicators

### 5. Critical Validation Gate
- Explicit validation step blocks merge on failures
- Clear pass/fail determination before summary
- Prevents accidental merges with failing checks

### 6. Failure Notification
- Automatic alerts on main branch failures
- Configurable notification targets (Slack, email, etc.)
- Critical issue visibility for immediate response

## Outputs

The orchestrator provides comprehensive outputs through:

1. **GitHub Step Summary**: Detailed markdown report with:
   - Change detection results
   - Workflow execution status
   - Performance metrics
   - Overall CI outcome

2. **PR Comments**: Automated status updates on pull requests

3. **Validation Status**: Pass/fail determination for merge blocking

4. **Notifications**: Critical failure alerts for main branch

## Integration Points

### Upstream Dependencies
- **detect-changes.yml**: Provides change detection and impact analysis
- **ts-mcp-ci.yml**: TypeScript server validation
- **py-mcp-ci.yml**: Python tool validation

### Downstream Consumers
- GitHub branch protection rules
- PR merge requirements
- Deployment pipelines
- Notification systems

## Performance Characteristics

### Time Complexity
- **Best Case**: ~2-3 minutes (no changes detected)
- **Single Language**: ~5-8 minutes (one CI workflow)
- **Both Languages**: ~6-10 minutes (parallel execution)
- **Worst Case**: ~12-15 minutes (all checks + large matrix)

### Resource Optimization
- Conditional execution reduces unnecessary builds by ~50%
- Parallel execution provides ~50% speedup when both languages change
- Concurrency control prevents duplicate work
- Overall efficiency gain: 40-60% vs naive full-build approach

## Troubleshooting

### Common Issues

1. **Both CIs skip when changes detected**
   - Check `detect-changes.yml` path filters
   - Verify workflow outputs are correctly passed

2. **Validation fails but individual CIs pass**
   - Check `validate-critical` step logic
   - Verify conditional execution in validation

3. **Workflows don't run in parallel**
   - Ensure `needs: detect-changes` (not sequential dependencies)
   - Check concurrency group configuration

4. **Summary report missing information**
   - Verify `if: always()` on summary job
   - Check that all upstream jobs are in `needs:` array
