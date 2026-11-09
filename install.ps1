# RESBOT installer for Windows (PowerShell 5.1+ / 7+).
#   irm https://raw.githubusercontent.com/Bujjinga/Resbot/main/install.ps1 | iex
# Args: --dry-run, --uninstall [--purge]   (or env RESBOT_DRY_RUN=1 when piped to iex)
# Env:  RESBOT_VERSION=<tag>, RESBOT_HOME=<dir>, RESBOT_PREFIX=<dir> (default %LOCALAPPDATA%\resbot)
$ErrorActionPreference = 'Stop'
$Repo = 'Bujjinga/Resbot'
$Ref = if ($env:RESBOT_VERSION) { $env:RESBOT_VERSION } else { 'main' }
$argv = @($args)
$Dry = ($argv -contains '--dry-run') -or ($argv -contains '-DryRun') -or ($env:RESBOT_DRY_RUN -eq '1')
$Prefix = if ($env:RESBOT_PREFIX) { $env:RESBOT_PREFIX } else { Join-Path $env:LOCALAPPDATA 'resbot' }
$BinDir = Join-Path $Prefix 'bin'
$Profile_ = if ($env:RESBOT_PROFILE) { $env:RESBOT_PROFILE } else { $PROFILE.CurrentUserCurrentHost }
$Mark = '# added by resbot installer'

function Say($m) { Write-Host $m }
function Fail($m, $fix) { Say "[x] $m"; if ($fix) { Say "    fix: $fix" }; exit 1 }
function Run([scriptblock]$b, [string]$desc) {
  if ($Dry) { Say "+ $desc" } else { $global:LASTEXITCODE = 0; & $b; if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { Fail "$desc failed (exit $LASTEXITCODE)" } }
}
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { '' }

if (($argv -contains '--uninstall') -or ($argv -contains '-Uninstall')) {
  $pass = @($argv | Where-Object { $_ -in '--purge', '--dry-run' })
  $home_ = if ($env:RESBOT_HOME) { $env:RESBOT_HOME } else { Join-Path $HOME '.resbot' }
  $cands = @((Join-Path $home_ 'uninstall.ps1'))
  if ($ScriptDir) { $cands = @((Join-Path $ScriptDir 'uninstall.ps1')) + $cands }
  foreach ($u in $cands) { if (Test-Path $u) { & $u @pass; exit $LASTEXITCODE } }
  $tmp = Join-Path ([IO.Path]::GetTempPath()) 'resbot-uninstall.ps1'
  Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/$Repo/$Ref/uninstall.ps1" -OutFile $tmp
  & $tmp @pass; exit $LASTEXITCODE
}

# 1. Prerequisites
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { Fail 'Claude Code not found' 'install Claude Code (https://docs.claude.com/en/docs/claude-code), then rerun this installer' }
Say "[ok] Claude Code $((& claude --version) | Select-Object -First 1)"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'Node.js not found' 'install Node 18+ (https://nodejs.org, or: winget install OpenJS.NodeJS.LTS)' }
$nodeMajor = [int]((& node -p "process.versions.node.split('.')[0]") | Select-Object -First 1)
if ($nodeMajor -lt 18) { Fail "Node $(& node --version) is too old" 'install Node 18+ (https://nodejs.org)' }
Say "[ok] Node $(& node --version)"

# 2. Source
if ($ScriptDir -and (Test-Path (Join-Path $ScriptDir '.claude-plugin\marketplace.json')) -and -not $env:RESBOT_HOME) {
  $Src = $ScriptDir
  Say "[ok] using checkout $Src"
} else {
  $Src = if ($env:RESBOT_HOME) { $env:RESBOT_HOME } else { Join-Path $HOME '.resbot' }
  if (Get-Command git -ErrorAction SilentlyContinue) {
    if (Test-Path (Join-Path $Src '.git')) {
      Say "- updating $Src ($Ref)"
      Run { git -C $Src fetch --quiet --tags origin } "git fetch"
      Run { git -C $Src checkout --quiet $Ref } "git checkout $Ref"
      if ($Ref -eq 'main') { Run { git -C $Src pull --quiet --ff-only origin main } "git pull" }
    } else {
      Say "- cloning $Repo ($Ref) into $Src"
      Run { git clone --quiet --depth 1 --branch $Ref "https://github.com/$Repo.git" $Src } "git clone $Repo"
    }
  } else {
    Say "- git not found; downloading zip ($Ref) into $Src"
    if ($Dry) { Say "+ download https://codeload.github.com/$Repo/zip/$Ref" } else {
      $zip = Join-Path ([IO.Path]::GetTempPath()) "resbot-$Ref.zip"
      $tmp = Join-Path ([IO.Path]::GetTempPath()) "resbot-$Ref"
      Invoke-WebRequest -UseBasicParsing "https://codeload.github.com/$Repo/zip/$Ref" -OutFile $zip
      if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
      Expand-Archive -Force $zip $tmp
      New-Item -ItemType Directory -Force $Src | Out-Null
      Copy-Item -Recurse -Force (Join-Path (Get-ChildItem $tmp | Select-Object -First 1).FullName '*') $Src
    }
  }
}

# 3. Plugin (idempotent)
if (((& claude plugin marketplace list --json) -join "`n") -match '"resbot-local"') {
  Run { claude plugin marketplace update resbot-local } 'claude plugin marketplace update resbot-local'
} else {
  Run { claude plugin marketplace add $Src } "claude plugin marketplace add $Src"
}
if (((& claude plugin list --json) -join "`n") -match '"resbot@resbot-local"') {
  Run { claude plugin update resbot@resbot-local } 'claude plugin update resbot@resbot-local'
} else {
  Run { claude plugin install resbot@resbot-local } 'claude plugin install resbot@resbot-local'
}

# 4. resbot on PATH
$cmdShim = "@echo off`r`nnode `"$Src\bin\resbot.js`" %*`r`n"
Run { New-Item -ItemType Directory -Force $BinDir | Out-Null; Set-Content -Encoding ASCII (Join-Path $BinDir 'resbot.cmd') $cmdShim } "write $BinDir\resbot.cmd"
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not (($userPath -split ';') -contains $BinDir)) {
  Run { [Environment]::SetEnvironmentVariable('Path', (@($userPath, $BinDir) | Where-Object { $_ }) -join ';', 'User') } "add $BinDir to user PATH"
  Say "[ok] added $BinDir to your user PATH (open a new terminal)"
}
if (-not (($env:Path -split ';') -contains $BinDir)) { $env:Path = "$BinDir;$env:Path" }
Say "[ok] resbot -> $BinDir\resbot.cmd"

# 5. Completions
$comp = Join-Path $Prefix 'resbot-completion.ps1'
Run { Copy-Item -Force (Join-Path $Src 'completions\resbot.ps1') $comp } "copy completions to $comp"
$line = ". `"$comp`" $Mark"
$hasLine = (Test-Path $Profile_) -and ((Get-Content $Profile_ -ErrorAction SilentlyContinue) -contains $line)
if (-not $hasLine) {
  Run { New-Item -ItemType Directory -Force (Split-Path $Profile_) | Out-Null; Add-Content -Path $Profile_ -Value $line } "add completions to $Profile_"
}
Say '[ok] PowerShell completions installed'

Say ''
Say "RESBOT installed$(if ($Dry) { ' (dry run)' } else { ' (resbot@resbot-local)' })."
Say 'Next:'
Say '  1. resbot doctor                       # check everything'
Say '  2. Install + connect Claude in Chrome  # https://claude.ai/chrome, then /chrome in Claude Code'
Say '  3. Sign in to kaggle.com in Chrome yourself'
Say '  4. resbot open <kaggle-notebook-url> "<goal>"'
Say '     or inside Claude Code: /resbot:ch7 <kaggle-notebook-url> <goal>'
