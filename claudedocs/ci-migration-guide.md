# CI/CD Migration Guide: ci.yml → ts-mcp-ci.yml

**Migration Path**: Root-level CI → Unified TypeScript MCP CI/CD
**Status**: Ready for testing
**Risk Level**: LOW (parallel deployment possible)

## Current State Analysis

### ci.yml (Current Workflow)

**Scope**: Root-level operations only
- Runs `bun test` on root workspace
- Runs `bun run format:check` (prettier)
- Runs `bun run typecheck`

**Limitations**:
- ❌ No individual server testing
- ❌ No change detection (runs on every push)
- ❌ No matrix parallelization
- ❌ Single package manager (bun only)
- ❌ No SDK compatibility checks
- ⚠️ Tests root workspace, not individual servers

**Execution Time**: 3-5 minutes (simple, but limited coverage)

### ts-mcp-ci.yml (New Unified Workflow)

**Scope**: Intelligent server-specific CI/CD
- Detects changed servers (via detect-changes.yml)
- Runs build/test on affected servers only
- Dynamic matrix with up to 7 parallel jobs
- Multi-package manager support (npm/pnpm/bun)
- SDK compatibility validation
- Comprehensive reporting

**Advantages**:
- ✅ Intelligent change detection
- ✅ Server-specific validation
- ✅ Parallel execution optimization
- ✅ Multi-PM support with auto-detection
- ✅ SDK version management
- ✅ Aggressive caching strategy

**Execution Time**: 5-10 minutes (warm cache), comprehensive coverage

## Comparison Matrix

| Feature | ci.yml | ts-mcp-ci.yml | Improvement |
|---------|--------|---------------|-------------|
| **Change Detection** | ❌ No | ✅ Yes (dynamic) | Smart execution |
| **Parallel Jobs** | ❌ Sequential | ✅ Max 7 concurrent | 7x parallelization |
| **Package Managers** | Bun only | npm/pnpm/bun | Universal support |
| **Caching** | ❌ No | ✅ Multi-level | 30-50% faster |
| **Server Testing** | Root only | Individual servers | Targeted validation |
| **SDK Compatibility** | ❌ No | ✅ Automated check | Proactive management |
| **Impact Analysis** | ❌ No | ✅ CRITICAL/HIGH/MEDIUM/LOW | Risk awareness |
| **Execution Time (warm)** | 3-5 min | 5-10 min | More comprehensive |
| **Coverage** | Root workspace | All 7 TS servers | Complete validation |

## Migration Strategies

### Strategy 1: Gradual Replacement (RECOMMENDED)

**Phase 1: Parallel Deployment** (Week 1)
```yaml
# Keep both workflows running
ci.yml:           Active (root-level validation)
ts-mcp-ci.yml:    Active (server-specific validation)
```

**Benefits**:
- ✅ Zero risk - both workflows validate code
- ✅ Compare execution times and reliability
- ✅ Validate ts-mcp-ci.yml on real PRs

**Cost**: 2x GitHub Actions minutes during transition

**Phase 2: Transition** (Week 2-3)
```yaml
# Monitor ts-mcp-ci.yml performance:
- Cache hit rates (target >70%)
- Execution times (target <10min)
- False positive/negative rates
- Developer feedback
```

**Phase 3: Migration** (Week 4)
```bash
# Once ts-mcp-ci.yml is proven stable:
git mv .github/workflows/ci.yml .github/workflows/ci.yml.bak
# ts-mcp-ci.yml becomes primary CI workflow
```

### Strategy 2: Immediate Replacement (AGGRESSIVE)

**Prerequisites**:
- ✅ Local validation successful
- ✅ All servers have package.json + build scripts
- ✅ detect-changes.yml tested and working

**Steps**:
```bash
# 1. Backup current CI
git mv .github/workflows/ci.yml .github/workflows/ci.yml.bak

# 2. Deploy new workflow
git add .github/workflows/ts-mcp-ci.yml
git commit -m "Deploy unified TypeScript MCP CI/CD pipeline"

# 3. Create PR and validate
git push origin feature/unified-ts-mcp-ci
```

**Rollback Plan**:
```bash
# If issues detected:
git mv .github/workflows/ci.yml.bak .github/workflows/ci.yml
git rm .github/workflows/ts-mcp-ci.yml
git commit -m "Rollback to original CI workflow"
```

### Strategy 3: Hybrid Approach (CONSERVATIVE)

**Configuration**:
```yaml
# ci.yml: Keep for root-level checks
on:
  push:
    paths:
      - 'package.json'
      - 'tsconfig.json'
      - '.github/workflows/**'

# ts-mcp-ci.yml: Server-specific validation
on:
  push:
    paths:
      - 'mcp_servers/**'
```

**Benefits**:
- ✅ Separation of concerns
- ✅ Faster root-level validation
- ✅ Comprehensive server validation

**Complexity**: Maintain two workflow configurations

## Pre-Migration Checklist

### Technical Validation

- [ ] Validate workflow syntax: `bash .github/scripts/validate-workflow.sh`
- [ ] Confirm all servers have package.json
- [ ] Verify lockfiles for package manager detection
- [ ] Check MCP SDK versions (>= 1.25.0)
- [ ] Test build scripts locally: `npm run build` in each server
- [ ] Confirm detect-changes.yml is deployed and working

### Testing Plan

**Test Case 1: Single Server Change**
```bash
# Modify one server file
echo "// test change" >> mcp_servers/claude-mem/src/index.ts
git commit -am "test: single server change"
git push

# Expected: Only claude-mem builds (1 job), <5 min execution
```

**Test Case 2: Multiple Server Changes**
```bash
# Modify multiple servers
echo "// test" >> mcp_servers/claude-mem/src/index.ts
echo "// test" >> mcp_servers/gdrive-mcp/src/index.ts
git commit -am "test: multiple server changes"
git push

# Expected: 2 parallel jobs, <7 min execution
```

**Test Case 3: Root Config Change (CRITICAL)**
```bash
# Modify root config
echo "# comment" >> tsconfig.json
git commit -am "test: root config change"
git push

# Expected: All 7 servers build (CRITICAL impact), <12 min execution
```

**Test Case 4: SDK Compatibility**
```bash
# Workflow should detect and report SDK versions
# Check job summary for compatibility report
# Verify warnings for outdated/missing SDK
```

### Rollback Preparation

**Rollback Script** (`.github/scripts/rollback-ci.sh`):
```bash
#!/bin/bash
# Emergency rollback to original ci.yml

git checkout HEAD~1 .github/workflows/ci.yml
git rm .github/workflows/ts-mcp-ci.yml
git commit -m "ROLLBACK: Restore original CI workflow"
git push --force origin main

echo "✅ Rollback complete. Original ci.yml restored."
```

## Migration Timeline

### Week 1: Parallel Deployment

**Day 1-2**: Deploy ts-mcp-ci.yml alongside ci.yml
- Create PR with new workflow
- Both workflows run on PRs
- Monitor execution times and cache behavior

**Day 3-5**: Validation and optimization
- Review job summaries and logs
- Adjust cache keys if hit rate <70%
- Fine-tune timeouts based on real data

**Day 6-7**: Developer feedback
- Survey team on workflow reliability
- Address false positives/negatives
- Document known issues

### Week 2: Transition Decision

**Go/No-Go Criteria**:
- ✅ Cache hit rate >70%
- ✅ Execution time <10 min (warm cache)
- ✅ Zero false negatives (missed errors)
- ✅ False positive rate <5%
- ✅ Positive developer feedback

**If GO**: Proceed to migration
**If NO-GO**: Continue parallel deployment, address issues

### Week 3: Migration

**Migration Steps**:
1. Final validation on main branch
2. Backup ci.yml → ci.yml.bak
3. Update PR templates to reference new workflow
4. Announce migration to team
5. Monitor first 48 hours closely

### Week 4: Cleanup

**Post-Migration Tasks**:
- Remove ci.yml.bak if no issues
- Update documentation references
- Archive migration guide
- Conduct retrospective

## Success Metrics

### Performance KPIs

**Execution Time**:
- Target: <5 min (single server, warm cache)
- Maximum: 15 min (all servers, cold cache)

**Cache Efficiency**:
- Dependency cache hit rate: >85%
- Build artifact cache hit rate: >70%

**Reliability**:
- False negative rate: 0% (must catch all real errors)
- False positive rate: <5% (minimize noise)

### Operational KPIs

**Developer Experience**:
- Time to feedback: <10 min for typical PR
- CI failure clarity: >90% actionable error messages

**Resource Usage**:
- GitHub Actions minutes: <30 min/day average
- Cache storage: <5 GB per server

## Troubleshooting Guide

### Issue 1: Workflow Not Triggering

**Symptoms**: PR created but ts-mcp-ci.yml doesn't run

**Diagnosis**:
```bash
# Check workflow file location
ls -la .github/workflows/ts-mcp-ci.yml

# Verify YAML syntax
yamllint .github/workflows/ts-mcp-ci.yml
```

**Solution**: Ensure workflow file is committed and pushed to main/feature branch

### Issue 2: No Servers in Matrix

**Symptoms**: detect-changes returns empty array

**Diagnosis**:
```bash
# Check detect-changes outputs
# In GitHub Actions logs, look for:
echo "Affected servers: []"
```

**Solution**:
- Verify changes touch mcp_servers/** paths
- Check detect-changes.yml filters
- Ensure path patterns match server directories

### Issue 3: Cache Misses (Poor Performance)

**Symptoms**: Every build is slow (10+ min)

**Diagnosis**:
```bash
# Check cache keys in workflow logs
# Look for: "Cache not found for key: ..."
```

**Solution**:
- Verify lockfiles are committed (package-lock.json, pnpm-lock.yaml, bun.lockb)
- Check cache key hash generation
- Ensure package.json hasn't changed

### Issue 4: Build Failures

**Symptoms**: Build step fails in CI but works locally

**Diagnosis**:
```bash
# Compare local and CI environments
node --version  # Check Node version match
npm --version   # Check package manager version

# Test with frozen lockfile (CI behavior)
npm ci          # Instead of npm install
```

**Solution**:
- Align local Node version with CI (v20)
- Use `npm ci` / `pnpm install --frozen-lockfile` locally
- Check for missing devDependencies

### Issue 5: SDK Compatibility Warnings

**Symptoms**: SDK compatibility job reports outdated versions

**Solution**:
```bash
# Update SDK in affected servers
cd mcp_servers/<server-name>
npm update @modelcontextprotocol/sdk@latest

# Or manually update package.json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.25.3"
  }
}

npm install
git commit -am "chore: update MCP SDK to ^1.25.3"
```

## Best Practices Post-Migration

### 1. Monitor Cache Performance

```bash
# Weekly cache analysis
# Check GitHub Actions logs for cache hit rates
# Target: >70% overall cache hits
```

### 2. Update Lockfiles Regularly

```bash
# Monthly dependency updates
cd mcp_servers/<server-name>
npm update
git commit -am "chore: update dependencies"
```

### 3. SDK Version Management

```bash
# Quarterly SDK updates
# Check for new MCP SDK releases
# Update all servers to latest stable version
```

### 4. Workflow Optimization

```bash
# Review execution times monthly
# Identify slow steps and optimize
# Adjust timeouts based on historical data
```

## Conclusion

**Recommended Migration Path**: Strategy 1 (Gradual Replacement)

**Timeline**: 3-4 weeks from parallel deployment to full migration

**Risk Mitigation**:
- ✅ Parallel deployment reduces risk
- ✅ Comprehensive testing plan
- ✅ Clear rollback procedure
- ✅ Continuous monitoring

**Expected Benefits**:
- 🚀 7x parallelization (7 concurrent jobs)
- 💾 30-50% faster execution (with caching)
- 🎯 Intelligent change detection
- 🔧 Multi-package manager support
- 📊 SDK compatibility management
- 📈 Comprehensive CI/CD reporting

**Next Action**: Create PR with ts-mcp-ci.yml and begin parallel deployment testing.
