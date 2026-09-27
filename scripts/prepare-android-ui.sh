#!/usr/bin/env bash
# Sourced only by the disposable API 35 emulator runner and its contract tests.
# Never suppress ANRs or recover a test-app failure.
prepare_android_ui() {
  local serial=$1 report_dir=$2
  if [[ ! $serial =~ ^emulator-[0-9]+$ ]]; then
    echo '::error::UI preparation is restricted to the CI emulator.' >&2
    return 1
  fi
  mkdir -p "$report_dir" || return $?

  local attempt boot boot_ready=false
  for attempt in $(seq 1 60); do
    if boot=$(timeout 5s adb -s "$serial" shell getprop sys.boot_completed) &&
       [[ ${boot//$'\r'/} == 1 ]] &&
       timeout 5s adb -s "$serial" shell cmd package list packages >/dev/null 2>&1; then
      boot_ready=true
      break
    fi
    sleep 2
  done
  if [[ $boot_ready != true ]]; then
    echo '::error::Android boot/package services did not become ready.' >&2
    return 1
  fi

  timeout 15s adb -s "$serial" shell input keyevent 224 || return $?
  timeout 15s adb -s "$serial" shell wm dismiss-keyguard || return $?

  local window focus recovered=false stable=0
  # Check before launching HOME: an existing system dialog can block that launch.
  for attempt in $(seq 1 60); do
    if ! window=$(timeout 5s adb -s "$serial" shell dumpsys window displays); then
      echo '::error::Unable to inspect Android window readiness.' >&2
      return 1
    fi
    printf '%s\n' "$window" > "$report_dir/preflight-window.txt" || return $?
    focus=$(printf '%s\n' "$window" | sed -n '/mCurrentFocus=/p')
    if [[ $focus == *'Application Not Responding:'* ]]; then
      if [[ $focus != *'Application Not Responding: com.android.launcher3}'* || $recovered == true ]]; then
        echo '::error::Unexpected or persistent ANR blocks Android UI tests.' >&2
        return 1
      fi
      # Preserve the known cold-boot launcher failure before one scoped restart.
      printf '%s\n' "$window" > "$report_dir/launcher-anr-window.txt" || return $?
      timeout 15s adb -s "$serial" logcat -d -t 1000 \
        > "$report_dir/launcher-anr-logcat.txt" 2>&1 || true
      timeout 15s adb -s "$serial" shell am force-stop com.android.launcher3 || return $?
      recovered=true
      echo 'Restarted the disposable emulator launcher after a retained cold-boot ANR.'
    fi
    if (( attempt == 1 )) || [[ $focus == *'Application Not Responding:'* ]]; then
      timeout 30s adb -s "$serial" shell am start -W \
        -a android.intent.action.MAIN -c android.intent.category.HOME || return $?
      stable=0
    elif [[ $focus == *'com.android.launcher3/'* ]]; then
      stable=$((stable + 1))
      if (( stable >= 5 )); then
        echo 'Android launcher has stable foreground focus; starting real UI tests.'
        return 0
      fi
    else
      stable=0
    fi
    sleep 2
  done
  echo '::error::Android launcher did not acquire stable foreground focus.' >&2
  return 1
}
