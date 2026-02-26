# Change Detection Workflow - Usage Examples

## Example 1: Basic Integration in CI Workflow

```yaml
name: CI with Change Detection

on:
  push:
    branches: [main]
  pull_request:

jobs:
  # First, detect what changed
  detect:
    uses: ./.github/workflows/detect-changes.yml

  # Then, use the outputs to conditionally run jobs
  build-typescript:
    needs: detect
    if: needs.detect.outputs.typescript_changed == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Build TypeScript servers
        run: npm run build

  lint-python:
    needs: detect
    if: needs.detect.outputs.python_changed == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Lint Python tools
        run: ruff check tools/

  # Always show the summary
  summary:
    needs: detect
    runs-on: ubuntu-latest
    steps:
      - name: Print change summary
        run: |
          echo "Impact Level: ${{ needs.detect.outputs.impact_level }}"
          echo "Affected Servers: ${{ needs.detect.outputs.affected_servers }}"
          echo "All Servers: ${{ needs.detect.outputs.all_servers }}"
```

## Example 2: Matrix-Based Testing

Test each affected server independently:

```yaml
name: Test Affected Servers

on: [push, pull_request]

jobs:
  detect:
    uses: ./.github/workflows/detect-changes.yml

  test:
    needs: detect
    if: fromJson(needs.detect.outputs.affected_servers)[0] != null
    runs-on: ubuntu-latest
    strategy:
      matrix:
        server: ${{ fromJson(needs.detect.outputs.affected_servers) }}
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies for ${{ matrix.server }}
        run: |
          cd "mcp_servers/${{ matrix.server }}"
          npm install
      - name: Build ${{ matrix.server }}
        run: |
          cd "mcp_servers/${{ matrix.server }}"
          npm run build
      - name: Test ${{ matrix.server }}
        run: |
          cd "mcp_servers/${{ matrix.server }}"
          npm test || true
```

## Example 3: Impact-Based Notifications

Send notifications only for critical changes:

```yaml
name: Impact-Based Notifications

on: [push, pull_request]

jobs:
  detect:
    uses: ./.github/workflows/detect-changes.yml

  notify-critical:
    needs: detect
    if: needs.detect.outputs.impact_level == 'CRITICAL'
    runs-on: ubuntu-latest
    steps:
      - name: Send Slack notification for CRITICAL changes
        uses: 8398a7/action-slack@v3
        with:
          status: 'warning'
          text: |
            CRITICAL changes detected!
            Impact Level: ${{ needs.detect.outputs.impact_level }}
            Affected Servers: ${{ needs.detect.outputs.affected_servers }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      - name: Create GitHub issue
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Critical changes detected - requires review',
              body: `Impact Level: ${{ needs.detect.outputs.impact_level }}\n\nAffected Servers: ${{ needs.detect.outputs.affected_servers }}`
            })

  notify-high:
    needs: detect
    if: needs.detect.outputs.impact_level == 'HIGH'
    runs-on: ubuntu-latest
    steps:
      - name: Add review request comment
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `⚠️ HIGH impact changes detected! Multiple servers affected:\n${{ needs.detect.outputs.affected_servers }}`
            })
```

## Example 4: Comprehensive Testing Strategy

Run different test suites based on impact level:

```yaml
name: Comprehensive Testing

on: [push, pull_request]

jobs:
  detect:
    uses: ./.github/workflows/detect-changes.yml

  quick-test:
    needs: detect
    if: needs.detect.outputs.impact_level == 'LOW'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Quick test affected server
        run: |
          server_name=$(echo '${{ needs.detect.outputs.affected_servers }}' | jq -r '.[0]')
          cd "mcp_servers/$server_name"
          npm install
          npm test

  full-test:
    needs: detect
    if: needs.detect.outputs.impact_level == 'MEDIUM'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        server: ${{ fromJson(needs.detect.outputs.affected_servers) }}
    steps:
      - uses: actions/checkout@v4
      - name: Full test for ${{ matrix.server }}
        run: |
          cd "mcp_servers/${{ matrix.server }}"
          npm install
          npm run lint
          npm run typecheck
          npm test
          npm run build

  comprehensive-test:
    needs: detect
    if: needs.detect.outputs.impact_level == 'HIGH' || needs.detect.outputs.impact_level == 'CRITICAL'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        server: ${{ fromJson(needs.detect.outputs.all_servers) }}
    steps:
      - uses: actions/checkout@v4
      - name: Comprehensive test for ${{ matrix.server }}
        run: |
          cd "mcp_servers/${{ matrix.server }}"
          npm install
          npm run lint
          npm run typecheck
          npm test
          npm run build
      - name: Integration tests
        run: npm run test:integration
      - name: Build documentation
        run: npm run docs:build || true
```

## Example 5: Conditional Deployment

Only deploy when appropriate, based on impact analysis:

```yaml
name: Conditional Deployment

on:
  push:
    branches: [main, production]

jobs:
  detect:
    uses: ./.github/workflows/detect-changes.yml

  deploy-dev:
    needs: detect
    if: github.ref == 'refs/heads/main' && needs.detect.outputs.impact_level != 'CRITICAL'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to development
        run: |
          echo "Deploying affected servers to dev:"
          echo '${{ needs.detect.outputs.affected_servers }}' | jq .

  deploy-staging:
    needs: detect
    if: github.ref == 'refs/heads/main' && (needs.detect.outputs.impact_level == 'LOW' || needs.detect.outputs.impact_level == 'MEDIUM')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          echo "Deploying affected servers to staging:"
          echo '${{ needs.detect.outputs.affected_servers }}' | jq .

  require-approval-critical:
    needs: detect
    if: needs.detect.outputs.impact_level == 'CRITICAL'
    runs-on: ubuntu-latest
    steps:
      - name: Wait for approval before production deployment
        run: |
          echo "CRITICAL changes detected. Manual approval required for deployment."
          echo "Affected servers: ${{ needs.detect.outputs.affected_servers }}"
          exit 1  # Block automatic deployment
```

## Example 6: Cache Strategy Based on Impact

Use targeted caching for faster builds:

```yaml
name: Smart Caching Strategy

on: [push, pull_request]

jobs:
  detect:
    uses: ./.github/workflows/detect-changes.yml

  build:
    needs: detect
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      # For HIGH/CRITICAL: full cache invalidation (always rebuild)
      - name: Cache (HIGH/CRITICAL impact)
        if: needs.detect.outputs.impact_level == 'HIGH' || needs.detect.outputs.impact_level == 'CRITICAL'
        uses: actions/cache@v3
        with:
          path: node_modules
          key: node-modules-${{ github.run_id }}  # Always unique, forces rebuild

      # For MEDIUM/LOW: use standard cache with timeout
      - name: Cache (MEDIUM/LOW impact)
        if: needs.detect.outputs.impact_level == 'MEDIUM' || needs.detect.outputs.impact_level == 'LOW'
        uses: actions/cache@v3
        with:
          path: node_modules
          key: node-modules-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            node-modules-

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build
```

## Example 7: Documentation Updates

Auto-update documentation based on changes:

```yaml
name: Documentation Updates

on:
  push:
    branches: [main]

jobs:
  detect:
    uses: ./.github/workflows/detect-changes.yml

  update-docs:
    needs: detect
    if: needs.detect.outputs.affected_servers != '[]'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate server documentation
        run: |
          servers='${{ needs.detect.outputs.affected_servers }}'
          echo "$servers" | jq -r '.[]' | while read server; do
            echo "Generating docs for $server"
            # Generate markdown from server README or config
            [ -f "mcp_servers/$server/README.md" ] && \
              cp "mcp_servers/$server/README.md" "docs/servers/$server.md"
          done

      - name: Commit documentation changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/
          git commit -m "docs: update server documentation for affected servers" || true
          git push
```

## Example 8: Multi-Region Build Matrix

Build and test across multiple regions/configurations:

```yaml
name: Multi-Region Testing

on: [push, pull_request]

jobs:
  detect:
    uses: ./.github/workflows/detect-changes.yml

  test-matrix:
    needs: detect
    if: fromJson(needs.detect.outputs.affected_servers)[0] != null
    runs-on: ubuntu-latest
    strategy:
      matrix:
        server: ${{ fromJson(needs.detect.outputs.affected_servers) }}
        node-version: [16, 18, 20]
        include:
          - server: python-tool
            python-version: '3.9'
          - server: python-tool
            python-version: '3.11'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        if: matrix.node-version != null
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Setup Python ${{ matrix.python-version }}
        if: matrix.python-version != null
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}

      - name: Test ${{ matrix.server }} (Node ${{ matrix.node-version }}, Python ${{ matrix.python-version }})
        run: |
          echo "Testing ${{ matrix.server }}"
          # Add your test commands here
```

## Troubleshooting Examples

### Getting affected servers as a string

```yaml
- name: Get first affected server
  run: |
    first_server=$(echo '${{ needs.detect.outputs.affected_servers }}' | jq -r '.[0]')
    echo "First affected server: $first_server"
```

### Checking if specific server is affected

```yaml
- name: Check if specific server was affected
  run: |
    if echo '${{ needs.detect.outputs.affected_servers }}' | jq -e '.[] | select(. == "claude-mem")' > /dev/null; then
      echo "claude-mem was affected"
    fi
```

### Logging outputs for debugging

```yaml
- name: Debug outputs
  run: |
    echo "Impact Level: ${{ needs.detect.outputs.impact_level }}"
    echo "TypeScript Changed: ${{ needs.detect.outputs.typescript_changed }}"
    echo "Python Changed: ${{ needs.detect.outputs.python_changed }}"
    echo "Affected Servers:"
    echo '${{ needs.detect.outputs.affected_servers }}' | jq .
    echo "All Servers:"
    echo '${{ needs.detect.outputs.all_servers }}' | jq .
```

## Best Practices

1. **Always validate JSON arrays**: Use `fromJson()` function when passing arrays to matrix
2. **Check for empty arrays**: Use `if: fromJson(...)[0] != null` before using in matrices
3. **Cache selectively**: Only cache when beneficial (avoid caching CRITICAL changes)
4. **Use conditional steps**: Minimize false positives with precise `if` conditions
5. **Document decisions**: Add comments explaining why certain jobs run or skip
6. **Monitor impact levels**: Review actual impact levels to refine thresholds
7. **Test the workflow**: Use `act` or GitHub's workflow validation to test locally
8. **Keep filters updated**: When adding servers, update path filters
9. **Handle edge cases**: Account for changes to multiple server types
10. **Use matrices wisely**: Balance parallel efficiency with resource usage
