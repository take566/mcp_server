# Idempotent setup for uv-based MCP servers (colab-mcp, serena).
# Pre-installs dependencies so MCP startup stays well under the 30s connect timeout.
$ErrorActionPreference = 'Stop'

$ColabRef  = 'b9ab3899e0f1fa493390b1fd6d54aa2e464ecdf1'  # pinned googlecolab/colab-mcp commit
$SerenaDir = if ($env:SERENA_DIR) { $env:SERENA_DIR } else { 'D:/work/serena' }

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) { throw 'uv not found on PATH' }

Write-Host "== colab-mcp @ $ColabRef"
uv tool install --force --from "git+https://github.com/googlecolab/colab-mcp@$ColabRef" colab-mcp
if ($LASTEXITCODE) { throw 'colab-mcp install failed' }

Write-Host "== serena in $SerenaDir"
uv sync --directory $SerenaDir
if ($LASTEXITCODE) { throw 'serena sync failed' }

Write-Host '== verify'
foreach ($c in @({ colab-mcp --help }, { uv run --no-sync --directory $SerenaDir serena --help })) {
  $t = Measure-Command { & $c *> $null }
  if ($LASTEXITCODE) { throw "verify failed: $c" }
  Write-Host ("{0:N1}s  {1}" -f $t.TotalSeconds, $c)
}
