# PowerShell script to load .env file and run cipher MCP server
# This script loads environment variables from .env file and passes them to cipher

param(
    [string[]]$Args
)

# Get workspace folder from environment or use script parent directory
$workspaceFolder = $env:workspaceFolder
if (-not $workspaceFolder) {
    # Try to get from parent of configs directory
    $workspaceFolder = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
}

# Path to .env file (in same directory as this script)
$envFile = Join-Path $PSScriptRoot ".env"

# Load .env file
if (Test-Path $envFile) {
    $ErrorActionPreference = "SilentlyContinue"
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        # Skip empty lines and comments
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
            return
        }
        # Parse KEY=VALUE
        if ($line -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            if ($value -match '^"(.*)"$') {
                $value = $matches[1]
            } elseif ($value -match "^'(.*)'$") {
                $value = $matches[1]
            }
            # Expand ${workspaceFolder} if present
            $value = $value -replace '\$\{workspaceFolder\}', $workspaceFolder
            # Set environment variable for current process
            [Environment]::SetEnvironmentVariable($key, $value, [EnvironmentVariableTarget]::Process)
        }
    }
    $ErrorActionPreference = "Continue"
}

# Set CIPHER_WORKSPACE
$env:CIPHER_WORKSPACE = Join-Path $workspaceFolder ".cipher"

# Set default embedder if not set
if (-not $env:CIPHER_EMBEDDER) {
    $env:CIPHER_EMBEDDER = "local"
}

# Run cipher
$cipherArgs = @("-y", "@byterover/cipher", "--mode", "mcp")
& npx $cipherArgs
