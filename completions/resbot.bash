# bash completion for resbot
_resbot() {
  local cur prev cmds
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  cmds="install update uninstall doctor graphify version help new open research report paper log ideas status compare export pull output lb watch completions"
  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "$cmds" -- "$cur") ); return
  fi
  case "$prev" in
    completions) COMPREPLY=( $(compgen -W "bash zsh pwsh" -- "$cur") ); return ;;
    uninstall) COMPREPLY=( $(compgen -W "--purge" -- "$cur") ); return ;;
    export) COMPREPLY=( $(compgen -W "--zip $(ls resbot-workspace 2>/dev/null)" -- "$cur") ); return ;;
    report|log|ideas|status|compare) COMPREPLY=( $(compgen -W "$(ls resbot-workspace 2>/dev/null)" -- "$cur") ); return ;;
    watch) COMPREPLY=( $(compgen -W "--every" -- "$cur") ); return ;;
    paper) COMPREPLY=( $(compgen -f -X '!*.pdf' -- "$cur") ); return ;;
  esac
}
complete -F _resbot resbot
