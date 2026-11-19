#!/bin/bash
# validate-workflow.sh
# Sanity checks for the npm workspaces + CI configuration.
# Run from the repository root. Servers are derived from the root package.json
# "workspaces" field; there is a single root package-lock.json (no per-server
# lockfiles, no pnpm/bun).

set -e

echo "Validating npm workspaces / CI configuration..."
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Check 1: required root files
echo "Checking root files..."
for f in package.json package-lock.json .github/workflows/ci.yml; do
  if [ -f "$f" ]; then
    echo -e "${GREEN}  OK $f exists${NC}"
  else
    echo -e "${RED}  ERROR: $f not found${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check 2: no per-server lockfiles inside workspaces
echo ""
echo "Checking workspaces..."
WORKSPACES=$(jq -r '.workspaces[]' package.json | tr -d '\r')
for ws in $WORKSPACES; do
  if [ ! -f "$ws/package.json" ]; then
    echo -e "${RED}  ERROR: $ws/package.json not found${NC}"
    ERRORS=$((ERRORS + 1))
    continue
  fi
  echo -e "${GREEN}  OK $ws${NC}"

  for lock in package-lock.json pnpm-lock.yaml bun.lock bun.lockb yarn.lock; do
    if [ -f "$ws/$lock" ]; then
      echo -e "${RED}    ERROR: per-workspace lockfile $ws/$lock (use the root package-lock.json only)${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  done

  SDK_VERSION=$(jq -r '.dependencies["@modelcontextprotocol/sdk"] // .devDependencies["@modelcontextprotocol/sdk"] // "Not found"' "$ws/package.json" | tr -d '\r')
  if [ "$SDK_VERSION" = "Not found" ]; then
    echo -e "${YELLOW}    WARNING: no MCP SDK dependency${NC}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "    SDK: $SDK_VERSION"
  fi

  BUILD_SCRIPT=$(jq -r '.scripts.build // "Not found"' "$ws/package.json" | tr -d '\r')
  if [ "$BUILD_SCRIPT" = "Not found" ]; then
    echo -e "${YELLOW}    WARNING: no build script${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
done

# Check 3: SDK versions unified across workspaces
echo ""
echo "Checking SDK version unification..."
DISTINCT=$(for ws in $WORKSPACES; do
  jq -r '.dependencies["@modelcontextprotocol/sdk"] // .devDependencies["@modelcontextprotocol/sdk"] // empty' "$ws/package.json"
done | tr -d '\r' | sort -u)
COUNT=$(echo -n "$DISTINCT" | grep -c . || true)
if [ "$COUNT" -le 1 ]; then
  echo -e "${GREEN}  OK single SDK version: ${DISTINCT:-none}${NC}"
else
  echo -e "${RED}  ERROR: multiple SDK versions:${NC}"
  echo "$DISTINCT"
  ERRORS=$((ERRORS + 1))
fi

# Check 4: workflows reference no pnpm/bun
echo ""
echo "Checking workflows for pnpm/bun leftovers..."
if grep -nEi 'pnpm|bun(\.lock|x| install| run)' .github/workflows/*.yml; then
  echo -e "${YELLOW}  WARNING: pnpm/bun references found above${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}  OK none${NC}"
fi

# Check 5: YAML syntax
echo ""
echo "Validating workflow YAML syntax..."
if command -v yamllint &> /dev/null; then
  if yamllint -d relaxed .github/workflows/; then
    echo -e "${GREEN}  OK YAML syntax valid${NC}"
  else
    echo -e "${RED}  ERROR: YAML syntax errors detected${NC}"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo -e "${YELLOW}  WARNING: yamllint not installed, skipping (pip install yamllint)${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "========================================="
echo "Validation Summary"
echo "========================================="
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}Validation passed.${NC}"
  exit 0
fi
echo -e "${RED}Validation failed with $ERRORS error(s).${NC}"
exit 1
