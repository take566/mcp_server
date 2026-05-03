#!/bin/bash
# Generate .env from 1Password using .env.tpl template
# Usage: bash generate-env.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TPL_FILE="$SCRIPT_DIR/.env.tpl"
ENV_FILE="$SCRIPT_DIR/.env"

if ! command -v op &> /dev/null; then
  echo "Error: 1Password CLI (op) is not installed"
  exit 1
fi

echo "Generating .env from 1Password..."
op inject -i "$TPL_FILE" -o "$ENV_FILE"

if [ $? -eq 0 ]; then
  echo "Successfully generated $ENV_FILE"
else
  echo "Failed to generate .env. Make sure you're signed in: op signin"
  exit 1
fi
