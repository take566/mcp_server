#!/bin/bash
# validate-workflow.sh
# Validation script for ts-mcp-ci.yml workflow configuration

set -e

echo "🔍 Validating TypeScript MCP CI/CD Workflow..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Workflow file exists
echo "✓ Checking workflow file existence..."
if [ ! -f ".github/workflows/ts-mcp-ci.yml" ]; then
  echo -e "${RED}❌ ERROR: ts-mcp-ci.yml not found${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}  ✓ ts-mcp-ci.yml exists${NC}"
fi

# Check 2: detect-changes.yml dependency
echo "✓ Checking detect-changes.yml dependency..."
if [ ! -f ".github/workflows/detect-changes.yml" ]; then
  echo -e "${RED}❌ ERROR: detect-changes.yml not found (required dependency)${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}  ✓ detect-changes.yml exists${NC}"
fi

# Check 3: Validate all servers have package.json
echo "✓ Checking server package.json files..."
SERVERS=(
  "claude-mem"
  "gdrive-mcp"
  "markdownify-mcp"
  "mcp-obsidian-src"
  "mcp-server-kubernetes"
  "Ollama-mcp"
  "package"
)

for server in "${SERVERS[@]}"; do
  if [ ! -f "mcp_servers/$server/package.json" ]; then
    echo -e "${RED}  ❌ ERROR: mcp_servers/$server/package.json not found${NC}"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}  ✓ $server/package.json exists${NC}"
  fi
done

# Check 4: Validate package manager lockfiles
echo ""
echo "✓ Checking package manager configurations..."
for server in "${SERVERS[@]}"; do
  if [ -f "mcp_servers/$server/bun.lockb" ]; then
    PM="bun"
  elif [ -f "mcp_servers/$server/pnpm-lock.yaml" ]; then
    PM="pnpm"
  elif [ -f "mcp_servers/$server/package-lock.json" ]; then
    PM="npm"
  else
    PM="unknown"
    echo -e "${YELLOW}  ⚠️  WARNING: $server has no lockfile (will default to npm)${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi

  if [ "$PM" != "unknown" ]; then
    echo -e "${GREEN}  ✓ $server: $PM detected${NC}"
  fi
done

# Check 5: Validate SDK versions
echo ""
echo "✓ Checking MCP SDK versions..."
RECOMMENDED_VERSION="1.25.3"

for server in "${SERVERS[@]}"; do
  if [ -f "mcp_servers/$server/package.json" ]; then
    SDK_VERSION=$(jq -r '.dependencies["@modelcontextprotocol/sdk"] // .devDependencies["@modelcontextprotocol/sdk"] // "Not found"' "mcp_servers/$server/package.json")

    if [ "$SDK_VERSION" = "Not found" ]; then
      echo -e "${YELLOW}  ⚠️  WARNING: $server has no MCP SDK dependency${NC}"
      WARNINGS=$((WARNINGS + 1))
    else
      # Extract version number (remove ^ or ~)
      VERSION_NUM=$(echo "$SDK_VERSION" | sed 's/[\^~]//g')
      echo -e "${GREEN}  ✓ $server: $SDK_VERSION${NC}"

      # Check if version is outdated
      if [[ "$VERSION_NUM" =~ ^1\.([0-9]+)\. ]]; then
        MINOR_VERSION="${BASH_REMATCH[1]}"
        if [ "$MINOR_VERSION" -lt 25 ]; then
          echo -e "${YELLOW}    ⚠️  Consider updating to ^$RECOMMENDED_VERSION${NC}"
          WARNINGS=$((WARNINGS + 1))
        fi
      fi
    fi
  fi
done

# Check 6: Validate build scripts
echo ""
echo "✓ Checking build scripts in package.json..."
for server in "${SERVERS[@]}"; do
  if [ -f "mcp_servers/$server/package.json" ]; then
    BUILD_SCRIPT=$(jq -r '.scripts.build // "Not found"' "mcp_servers/$server/package.json")

    if [ "$BUILD_SCRIPT" = "Not found" ]; then
      echo -e "${RED}  ❌ ERROR: $server has no build script${NC}"
      ERRORS=$((ERRORS + 1))
    else
      echo -e "${GREEN}  ✓ $server: build script exists${NC}"
    fi
  fi
done

# Check 7: Validate workflow syntax (basic YAML check)
echo ""
echo "✓ Validating workflow YAML syntax..."
if command -v yamllint &> /dev/null; then
  if yamllint -d relaxed .github/workflows/ts-mcp-ci.yml; then
    echo -e "${GREEN}  ✓ YAML syntax valid${NC}"
  else
    echo -e "${RED}  ❌ ERROR: YAML syntax errors detected${NC}"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo -e "${YELLOW}  ⚠️  WARNING: yamllint not installed, skipping syntax validation${NC}"
  echo "     Install with: pip install yamllint"
  WARNINGS=$((WARNINGS + 1))
fi

# Check 8: Verify matrix configuration
echo ""
echo "✓ Checking matrix configuration alignment..."
WORKFLOW_SERVERS=$(grep -A 10 "matrix:" .github/workflows/ts-mcp-ci.yml | grep -E "server:.*\[" | wc -l)

if [ "$WORKFLOW_SERVERS" -eq 0 ]; then
  echo -e "${GREEN}  ✓ Dynamic matrix configured (uses detect-changes output)${NC}"
else
  echo -e "${YELLOW}  ⚠️  WARNING: Static matrix detected, should use dynamic matrix${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "========================================="
echo "Validation Summary"
echo "========================================="
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! Workflow is ready for deployment.${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Validation passed with warnings. Review warnings above.${NC}"
  exit 0
else
  echo -e "${RED}❌ Validation failed with $ERRORS error(s). Fix errors before deployment.${NC}"
  exit 1
fi
