# RESBOT uninstaller for Windows. Args: --purge (also delete ~\.resbot and the update cache), --dry-run.
# Workspaces (resbot-workspace\) are never touched.
$ErrorActionPreference = 'Stop'
$argv = @($args)
$Dry = ($argv -contains '--dry-run') -or ($env:RESBOT_DRY_RUN -eq '1')
$Purge = ($argv -contains '--purge') -or ($argv -contains '-Purge')
$Prefix = if ($env:RESBOT_PREFIX) { $env:RESBOT_PREFIX } else { Join-Path $env:LOCALAPPDATA 'resbot' }
$BinDir = Join-Path $Prefix 'bin'
$Profile_ = if ($env:RESBOT_PROFILE) { $env:RESBOT_PROFILE } else { $PROFILE.CurrentUserCurrentHost }
$HomeDir = if ($env:RESBOT_HOME) { $env:RESBOT_HOME } else { Join-Path $HOME '.resbot' }
$Mark = '# added by resbot installer'
function Say($m) { Write-Host $m }
function Run([scriptblock]$b, [string]$desc) { if ($Dry) { Say "+ $desc" } else { & $b } }

if (Get-Command claude -ErrorAction SilentlyContinue) {
  if (((& claude plugin list --json) -join "`n") -match '"resbot@resbot-local"') { Run { claude plugin uninstall resbot@resbot-local } 'claude plugin uninstall resbot@resbot-local' }
  if (((& claude plugin marketplace list --json) -join "`n") -match '"resbot-local"') { Run { claude plugin marketplace remove resbot-local } 'claude plugin marketplace remove resbot-local' }
}
Say '[ok] plugin and marketplace removed'

if (Test-Path $Prefix) { Run { Remove-Item -Recurse -Force $Prefix } "remove $Prefix" }
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -and (($userPath -split ';') -contains $BinDir)) {
  Run { [Environment]::SetEnvironmentVariable('Path', (($userPath -split ';') | Where-Object { $_ -and $_ -ne $BinDir }) -join ';', 'User') } "remove $BinDir from user PATH"
}
if (Test-Path $Profile_) {
  $lines = @(Get-Content $Profile_)
  if ($lines | Where-Object { $_ -like "*$Mark" }) {
    Run { Set-Content -Path $Profile_ -Value @($lines | Where-Object { $_ -notlike "*$Mark" }) } "remove resbot lines from $Profile_"
  }
}
Say '[ok] shim, PATH entry and completions removed'

if ($Purge) {
  foreach ($d in @($HomeDir, (Join-Path $HOME '.cache\resbot'))) { if (Test-Path $d) { Run { Remove-Item -Recurse -Force $d } "remove $d" } }
  Say "[ok] purged $HomeDir"
}
Say 'RESBOT uninstalled. Your resbot-workspace folders were kept.'
