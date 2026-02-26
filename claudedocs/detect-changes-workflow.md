# Change Detection Workflow - `.github/workflows/detect-changes.yml`

## Overview

This is a reusable GitHub Actions workflow that detects changes in the MCP server monorepo and outputs impact analysis. It can be called from other workflows to determine which servers and components are affected by changes.

## Usage

### Calling the Workflow

```yaml
jobs:
  detect-changes:
    uses: ./.github/workflows/detect-changes.yml

  use-outputs:
    needs: detect-changes
    runs-on: ubuntu-latest
    steps:
      - name: Print detected changes
        run: |
          echo "Affected servers: ${{ needs.detect-changes.outputs.affected_servers }}"
          echo "Impact level: ${{ needs.detect-changes.outputs.impact_level }}"
          echo "TypeScript changed: ${{ needs.detect-changes.outputs.typescript_changed }}"
          echo "Python changed: ${{ needs.detect-changes.outputs.python_changed }}"
```

## Outputs

### `affected_servers` (JSON array)
- Array of MCP server names that were modified
- Example: `["claude-mem", "gdrive-mcp"]`
- Empty array if only non-server files changed

### `impact_level` (string)
- Indicates the scope of changes
- Possible values: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `NONE`
- Logic:
  - **CRITICAL**: Root configuration files changed (`package.json`, `tsconfig.json`, `.github/workflows/**`, `.npmrc`)
  - **HIGH**: More than 3 servers affected
  - **MEDIUM**: 2-3 servers affected
  - **LOW**: 1 server affected
  - **NONE**: No changes to tracked files

### `typescript_changed` (boolean)
- `true` if any TypeScript server was modified
- Monitors: `claude-mem`, `gdrive-mcp`, `markdownify-mcp`, `mcp-obsidian-src`, `mcp-server-kubernetes`, `Ollama-mcp`, `package`

### `python_changed` (boolean)
- `true` if any Python tool file was modified
- Monitors: `tools/**/*.py`

### `all_servers` (JSON array)
- Complete list of all MCP servers in the repository
- Useful for running comprehensive checks on all servers
- Example: `["claude-mem", "gdrive-mcp", "markdownify-mcp", ...]`

## Path Filters

The workflow uses `dorny/paths-filter@v3` with the following filter groups:

### TypeScript Servers Group
Detects changes in TypeScript-based MCP servers:
- `mcp_servers/claude-mem/**`
- `mcp_servers/gdrive-mcp/**`
- `mcp_servers/markdownify-mcp/**`
- `mcp_servers/mcp-obsidian-src/**`
- `mcp_servers/mcp-server-kubernetes/**`
- `mcp_servers/Ollama-mcp/**`
- `mcp_servers/package/**`

### Python Tools Group
Detects changes in Python tool files:
- `tools/**/*.py`

### Root Configuration Group
Detects changes to critical project files:
- `package.json`
- `tsconfig.json`
- `.github/workflows/**`
- `.npmrc`

### Individual Server Filters
Each server has its own filter for granular detection:
- `claude_mem`: `mcp_servers/claude-mem/**`
- `gdrive_mcp`: `mcp_servers/gdrive-mcp/**`
- `markdownify_mcp`: `mcp_servers/markdownify-mcp/**`
- `mcp_obsidian`: `mcp_servers/mcp-obsidian-src/**`
- `mcp_kubernetes`: `mcp_servers/mcp-server-kubernetes/**`
- `ollama_mcp`: `mcp_servers/Ollama-mcp/**`
- `package_mcp`: `mcp_servers/package/**`

## Workflow Steps

### 1. Checkout Code
```yaml
- name: Checkout code
  uses: actions/checkout@v4
  with:
    fetch-depth: 0
```
- Fetches full git history for accurate change detection
- Necessary for comparing against base branches

### 2. Detect File Changes
```yaml
- name: Detect file changes
  uses: dorny/paths-filter@v3
  id: filter
```
- Compares changed files against all defined filter groups
- Sets boolean outputs for each filter (true/false)
- Handles pattern matching with glob syntax

### 3. Determine Affected Servers
```yaml
- name: Determine affected servers
  id: determine-affected
  run: |
    # Builds array of affected servers based on individual filters
    # Converts to JSON array format for output
```
- Constructs list of affected servers by checking individual filter outputs
- Uses bash array to collect server names
- Converts to JSON format using `jq` for downstream consumption

### 4. Determine Impact Level
```yaml
- name: Determine impact level
  id: determine-impact
  run: |
    # Evaluates impact based on:
    # - Root config changes (CRITICAL)
    # - Number of affected servers
```
- Applies impact level logic based on specifications
- Counts affected servers from JSON output
- Returns impact level string

### 5. List All Servers
```yaml
- name: List all servers
  id: list-servers
  run: |
    # Discovers all server directories dynamically
    # Generates JSON array of all servers
```
- Uses `find` to discover all server directories
- Filters out non-server directories
- Provides comprehensive server list for optional comprehensive checks

### 6. Summary
```yaml
- name: Summary
  run: |
    # Generates GitHub job summary with formatted output
```
- Creates readable summary in GitHub workflow UI
- Lists all detected changes and their impact
- Uses `$GITHUB_STEP_SUMMARY` for GitHub integration

## Error Handling

### Timeout Protection
- Job timeout: 5 minutes
- Prevents hanging on large repos or slow path filtering
- Ensures CI doesn't wait indefinitely

### Empty Array Handling
- When no servers are affected: `affected_servers = []`
- Impact level becomes `NONE`
- Downstream workflows can handle empty arrays safely

### Missing Servers
- New servers added to repo are automatically detected via `list-servers` step
- No need to update filter definitions for basic detection
- Individual filters should be added for new servers requiring specific handling

## Integration Patterns

### Pattern 1: Conditional Job Execution
```yaml
jobs:
  detect:
    uses: ./.github/workflows/detect-changes.yml

  build-typescript:
    needs: detect
    if: needs.detect.outputs.typescript_changed == 'true'
    runs-on: ubuntu-latest
    steps:
      # Build only TypeScript servers
```

### Pattern 2: Matrix Generation
```yaml
jobs:
  detect:
    uses: ./.github/workflows/detect-changes.yml

  test:
    needs: detect
    strategy:
      matrix:
        server: ${{ fromJson(needs.detect.outputs.affected_servers) }}
    runs-on: ubuntu-latest
    steps:
      # Test each affected server
```

### Pattern 3: Impact-Based Actions
```yaml
jobs:
  detect:
    uses: ./.github/workflows/detect-changes.yml

  notify:
    needs: detect
    if: needs.detect.outputs.impact_level == 'CRITICAL'
    runs-on: ubuntu-latest
    steps:
      # Send alerts for CRITICAL changes
```

## Performance Considerations

### Path Filtering Efficiency
- `dorny/paths-filter@v3` is highly optimized for monorepos
- Works by comparing git diff output, not scanning entire filesystem
- Execution time typically < 30 seconds for standard repositories

### JSON Processing
- Uses `jq` for JSON array construction and manipulation
- Lightweight tool with minimal overhead
- Alternative: Could use native GitHub Actions expressions if needed

### Parallel Execution
- All filter groups evaluated in parallel within the single step
- No sequential delays between filters
- Total detection time dominated by initial git diff

## Maintenance Notes

### Adding New Servers
1. Add individual filter under `Detect file changes` step:
   ```yaml
   new_server:
     - 'mcp_servers/new-server/**'
   ```
2. Add conditional in `Determine affected servers` step:
   ```bash
   if [ "${{ steps.filter.outputs.new_server }}" = "true" ]; then
     affected_servers+=("new-server")
   fi
   ```

### Updating Path Filters
- Glob patterns follow standard GitHub Actions syntax
- `**` matches any directory depth
- Multiple paths are combined with OR logic
- Changes to filters take effect on next workflow run

### Monitoring Impact Levels
- Review workflow execution logs to verify impact detection accuracy
- Validate that expected servers are detected
- Check false positives/negatives in pull request checks

## Troubleshooting

### Empty Affected Servers
- Verify path filters match actual file changes
- Check git diff output: `git diff --name-only origin/main..HEAD`
- Ensure server directories match exactly (case-sensitive on Unix)

### Incorrect Impact Level
- Verify root config detection: check for changes in `package.json`, etc.
- Count affected servers manually from detected list
- Verify impact logic in `Determine impact level` step

### JSON Array Format Issues
- If downstream workflows fail parsing JSON: check `jq` output syntax
- Verify proper escaping in YAML
- Test JSON validity: `echo 'json_string' | jq .`

## Related Workflows

- `.github/workflows/ci.yml` - Main CI pipeline (can call detect-changes)
- `.github/workflows/ruff.yml` - Python linting (can use python_changed output)
- (Future) TypeScript unified CI - Will use typescript_changed output
- (Future) Test orchestration - Will use affected_servers matrix

## References

- GitHub Actions: https://docs.github.com/en/actions
- dorny/paths-filter: https://github.com/dorny/paths-filter
- GitHub Expressions: https://docs.github.com/en/actions/learn-github-actions/expressions
- jq Manual: https://stedolan.github.io/jq/manual/
