# Windows installer test: temp prefix/profile + fake `claude` shim. Mirrors test/install.test.sh.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$T = Join-Path ([IO.Path]::GetTempPath()) ("resbot-test-" + [guid]::NewGuid())
New-Item -ItemType Directory -Force (Join-Path $T 'fakebin') | Out-Null
$env:RESBOT_PREFIX = Join-Path $T 'prefix'
$env:RESBOT_PROFILE = Join-Path $T 'profile.ps1'
$env:RESBOT_NO_UPDATE_CHECK = '1'
$env:RESBOT_DOCTOR_OFFLINE = '1'
$env:FAKE_LOG = Join-Path $T 'claude.log'
$env:FAKE_STATE = Join-Path $T 'state'
$savedUserPath = [Environment]::GetEnvironmentVariable('Path', 'User')

@'
$S = $env:FAKE_STATE; New-Item -ItemType Directory -Force $S | Out-Null
$a = $args -join ' '
Add-Content $env:FAKE_LOG $a
switch -regex ($a) {
  '^--version$' { '9.9.9 (Claude Code)' }
  '^plugin marketplace list --json$' { if (Test-Path "$S\mk") { '[{"name":"resbot-local"}]' } else { '[]' } }
  '^plugin list --json$' { if (Test-Path "$S\pl") { '[{"id":"resbot@resbot-local"}]' } else { '[]' } }
  '^plugin marketplace add ' { New-Item -Force "$S\mk" | Out-Null }
  '^plugin install resbot@resbot-local$' { if (-not (Test-Path "$S\mk")) { exit 1 }; New-Item -Force "$S\pl" | Out-Null }
  '^plugin uninstall resbot@resbot-local$' { Remove-Item -Force "$S\pl" }
  '^plugin marketplace remove resbot-local$' { Remove-Item -Force "$S\mk" }
  '^mcp list$' { 'claude.ai Consensus: connected' }
}
exit 0
'@ | Set-Content -Encoding ASCII (Join-Path $T 'fakebin\fakeclaude.ps1')
"@powershell -NoProfile -ExecutionPolicy Bypass -File `"%~dp0fakeclaude.ps1`" %*" | Set-Content -Encoding ASCII (Join-Path $T 'fakebin\claude.cmd')
$env:Path = "$(Join-Path $T 'fakebin');$env:Path"

function Ok($m) { Write-Host "  [ok] $m" }
function Die($m) { Write-Host "  [x] $m"; if (Test-Path $env:FAKE_LOG) { Get-Content $env:FAKE_LOG }; exit 1 }
$log = { Get-Content -Raw $env:FAKE_LOG }

try {
  Write-Host 'dry run'
  $out = (& powershell -NoProfile -ExecutionPolicy Bypass -File "$Root\install.ps1" --dry-run) -join "`n"
  if ($LASTEXITCODE -ne 0) { Die "dry run exit $LASTEXITCODE`n$out" }
  if ($out -notmatch '\+ claude plugin marketplace add') { Die "dry run should print add`n$out" }
  if (Test-Path "$env:RESBOT_PREFIX\bin\resbot.cmd") { Die 'dry run must not write the shim' }
  Ok 'dry run changes nothing'

  Write-Host 'install'
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$Root\install.ps1" | Out-Null
  if ($LASTEXITCODE -ne 0) { Die "install exit $LASTEXITCODE" }
  if ((& $log) -notmatch [regex]::Escape("plugin marketplace add $Root")) { Die 'marketplace add not called with the checkout' }
  if ((& $log) -notmatch 'plugin install resbot@resbot-local') { Die 'plugin install not called' }
  if (-not (Test-Path "$env:RESBOT_PREFIX\bin\resbot.cmd")) { Die 'shim missing' }
  if (-not ((Get-Content $env:RESBOT_PROFILE) -match 'added by resbot installer')) { Die 'completions not in profile' }
  if (-not (([Environment]::GetEnvironmentVariable('Path', 'User') -split ';') -contains "$env:RESBOT_PREFIX\bin")) { Die 'user PATH not updated' }
  Ok 'installed, shim, completions, PATH'

  $env:Path = "$env:RESBOT_PREFIX\bin;$env:Path"
  $ver = (& resbot version) | Select-Object -First 1
  $want = (node -p "require('$($Root -replace '\\','/')/package.json').version")
  if ($ver -ne $want) { Die "resbot version '$ver' != '$want'" }
  Ok 'resbot version'

  $doc = (& resbot doctor) -join "`n"
  if ($LASTEXITCODE -ne 0) { Die "doctor failed`n$doc" }
  if ($doc -notmatch 'plugin resbot@resbot-local installed') { Die "doctor should see the plugin`n$doc" }
  Ok 'doctor passes'

  & powershell -NoProfile -ExecutionPolicy Bypass -File "$Root\install.ps1" | Out-Null
  if ((& $log) -notmatch 'plugin update resbot@resbot-local') { Die 'reinstall should update' }
  if (@(Get-Content $env:RESBOT_PROFILE | Where-Object { $_ -match 'added by resbot installer' }).Count -ne 1) { Die 'profile line duplicated' }
  Ok 'second run updates in place'

  Write-Host 'uninstall'
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$Root\uninstall.ps1" --purge | Out-Null
  if (Test-Path $env:RESBOT_PREFIX) { Die 'prefix not removed' }
  if ((Get-Content $env:RESBOT_PROFILE) -match 'added by resbot installer') { Die 'profile line not removed' }
  if (([Environment]::GetEnvironmentVariable('Path', 'User') -split ';') -contains "$env:RESBOT_PREFIX\bin") { Die 'PATH entry not removed' }
  if ((Test-Path "$env:FAKE_STATE\pl") -or (Test-Path "$env:FAKE_STATE\mk")) { Die 'plugin/marketplace not removed' }
  Ok 'uninstall removes everything'
  Write-Host 'ALL INSTALLER TESTS PASSED'
} finally {
  [Environment]::SetEnvironmentVariable('Path', $savedUserPath, 'User')
  Remove-Item -Recurse -Force $T -ErrorAction SilentlyContinue
}
