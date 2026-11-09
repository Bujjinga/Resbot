# PowerShell completion for resbot
Register-ArgumentCompleter -Native -CommandName resbot -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)
  $cmds = 'install','update','uninstall','doctor','graph','version','help','new','open','research','report','paper','log','ideas','status','compare','export','pull','output','lb','watch','completions'
  $words = $commandAst.CommandElements | ForEach-Object { $_.ToString() }
  if ($words.Count -le 1 -or ($words.Count -eq 2 -and $wordToComplete)) {
    $list = $cmds
  } else {
    switch ($words[1]) {
      'completions' { $list = 'bash','zsh','pwsh' }
      'uninstall'   { $list = @('--purge') }
      'watch'       { $list = @('--every') }
      { $_ -in 'report','log','ideas','status','compare','export' } {
        $list = @(Get-ChildItem -Directory -Name resbot-workspace -ErrorAction SilentlyContinue)
        if ($words[1] -eq 'export') { $list += '--zip' }
      }
      default { $list = @() }
    }
  }
  $list | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
    [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
  }
}
