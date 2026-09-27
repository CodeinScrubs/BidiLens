#!/usr/bin/env bash
# Deterministic command-contract probes; real clipboard/device tests stay separate.
set -euo pipefail
source "$(dirname "$0")/prepare-android-ui.sh"
test_root=$(mktemp -d)
cleanup() {
  # Only these known files/directories are created by the probes.
  rm -f -- "$test_root"/*.txt
  rmdir -- "$test_root"
}
trap cleanup EXIT

timeout() { shift; "$@"; }
sleep() { :; }
adb() {
  local command
  command="$*"
  printf '%s\n' "$command" >> "$test_root/commands.txt"
  case "$command" in
    *'getprop sys.boot_completed')
      if [[ $mode == boot-failure ]]; then printf '0\r\n'; else printf '1\r\n'; fi
      [[ $mode != boot-command-failure ]] ;;
    *'cmd package list packages') [[ $mode != package-failure ]] ;;
    *'shell dumpsys window displays')
      [[ $mode != inspect-failure ]] || return 1
      if [[ $mode == foreign-anr ]]; then
        echo 'mCurrentFocus=Window{abc u0 Application Not Responding: example.test}'
      elif [[ $mode == persistent-anr ]] || { [[ $mode == launcher-anr || $mode == restart-failure ]] && [[ ! -f $test_root/restarted.txt ]]; }; then
        echo 'mCurrentFocus=Window{abc u0 Application Not Responding: com.android.launcher3}'
      elif [[ $mode == focus-failure ]]; then
        echo 'mCurrentFocus=null'
      else
        echo 'mCurrentFocus=Window{abc u0 com.android.launcher3/.uioverrides.QuickstepLauncher}'
      fi ;;
    *'shell am force-stop com.android.launcher3')
      [[ $mode != restart-failure ]] || return 1
      printf 'restarted\n' > "$test_root/restarted.txt" ;;
    *'shell am start -W -a android.intent.action.MAIN -c android.intent.category.HOME')
      [[ $mode != launch-failure ]] ;;
    *'logcat -d -t 1000') echo 'retained launcher log' ;;
    *'shell input keyevent 224'|*'shell wm dismiss-keyguard') return 0 ;;
    *) echo "Unexpected adb probe: $command" >&2; return 1 ;;
  esac
}

passed=0
if (( $# == 0 )); then
  set -- healthy launcher-anr persistent-anr foreign-anr boot-failure boot-command-failure package-failure inspect-failure focus-failure launch-failure restart-failure
fi
for mode in "$@"; do
  rm -f -- "$test_root"/*.txt
  result=0
  # A real runner uses errexit. Execute each probe in that same failure context.
  set +e
  (set -e; prepare_android_ui emulator-5554 "$test_root") > "$test_root/output.txt" 2>&1
  result=$?
  set -e
  case "$mode" in
    healthy|launcher-anr) [[ $result == 0 ]] || { cat "$test_root/output.txt"; exit 1; } ;;
    *) [[ $result != 0 ]] || { echo "Unexpected readiness success: $mode" >&2; exit 1; } ;;
  esac
  restarts=$(sed -n '/shell am force-stop /p' "$test_root/commands.txt" | wc -l)
  case "$mode" in
    launcher-anr|persistent-anr|restart-failure) [[ $restarts == 1 ]] ;;
    *) [[ $restarts == 0 ]] ;;
  esac
  if [[ $mode == launcher-anr || $mode == persistent-anr ]]; then
    [[ -s $test_root/launcher-anr-window.txt && -s $test_root/launcher-anr-logcat.txt ]]
  fi
  if [[ $mode == healthy || $mode == launcher-anr ]]; then
    # The launch sample itself does not count toward five stable focus samples.
    [[ $(sed -n '/shell dumpsys window/p' "$test_root/commands.txt" | wc -l) -ge 6 ]]
  fi
  passed=$((passed + 1))
done
rm -f -- "$test_root"/*.txt
if (prepare_android_ui physical-device "$test_root") > "$test_root/output.txt" 2>&1; then
  echo 'Physical-device preparation must be rejected.' >&2
  exit 1
fi
[[ ! -e $test_root/commands.txt ]]
echo "Android UI readiness: $((passed + 1)) command-contract probes passed."
