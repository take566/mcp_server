# Test script to verify cipher environment variables are loaded correctly
# Run this script to check if ANTHROPIC_API_KEY is properly set

$envFile = Join-Path $PSScriptRoot ".env"

Write-Host "=== Cipher Environment Variable Test ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $envFile)) {
    Write-Host "✗ ERROR: .env file not found at: $envFile" -ForegroundColor Red
    exit 1
}

Write-Host "✓ .env file found: $envFile" -ForegroundColor Green
Write-Host ""

# Load .env file
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        # Remove quotes if present
        if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") {
            $value = $matches[1]
        }
        $envVars[$key] = $value
    }
}

# Check ANTHROPIC_API_KEY
if ($envVars.ContainsKey("ANTHROPIC_API_KEY")) {
    $apiKey = $envVars["ANTHROPIC_API_KEY"]
    if ($apiKey -eq "your_anthropic_api_key_here" -or [string]::IsNullOrWhiteSpace($apiKey)) {
        Write-Host "✗ ANTHROPIC_API_KEY is set to placeholder or empty" -ForegroundColor Red
        Write-Host "  Please update it in: $envFile" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Current value: $apiKey" -ForegroundColor Yellow
    } else {
        Write-Host "✓ ANTHROPIC_API_KEY is set" -ForegroundColor Green
        Write-Host "  Length: $($apiKey.Length) characters" -ForegroundColor Gray
        Write-Host "  First 20 chars: $($apiKey.Substring(0, [Math]::Min(20, $apiKey.Length)))..." -ForegroundColor Gray
    }
} else {
    Write-Host "✗ ANTHROPIC_API_KEY not found in .env file" -ForegroundColor Red
    Write-Host "  Please add it to: $envFile" -ForegroundColor Yellow
}

Write-Host ""

# Check OPENAI_API_KEY (optional)
if ($envVars.ContainsKey("OPENAI_API_KEY")) {
    $openaiKey = $envVars["OPENAI_API_KEY"]
    if ($openaiKey -eq "your_openai_api_key_here" -or [string]::IsNullOrWhiteSpace($openaiKey)) {
        Write-Host "⚠ OPENAI_API_KEY is set to placeholder (optional)" -ForegroundColor Yellow
    } else {
        Write-Host "✓ OPENAI_API_KEY is set (optional)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test cipher server, run:" -ForegroundColor Yellow
Write-Host "  node configs\win_config\load-env-and-run-cipher.cjs" -ForegroundColor White
