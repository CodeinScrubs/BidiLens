#!/usr/bin/env bash
# Run inside the disposable Linux CI emulator, retaining evidence before shutdown.
set -euo pipefail

if [[ ! ${EMULATOR_PORT:-} =~ ^[0-9]+$ ]]; then
  echo '::error::EMULATOR_PORT must identify the CI emulator.' >&2
  exit 1
fi
export ANDROID_SERIAL="emulator-${EMULATOR_PORT}"
report_dir="android/build/ui-diagnostics"

collect_failure_evidence() {
  local result=$?
  trap - EXIT
  if (( result != 0 )); then
    mkdir -p "$report_dir" || exit "$result"
    # Diagnostics are best-effort and must not hide the original test failure.
    timeout 15s adb -s "$ANDROID_SERIAL" shell dumpsys window \
      > "$report_dir/window.txt" 2>&1 || true
    timeout 15s adb -s "$ANDROID_SERIAL" logcat -d -t 2000 \
      > "$report_dir/logcat.txt" 2>&1 || true
    timeout 15s adb -s "$ANDROID_SERIAL" exec-out screencap -p \
      > "$report_dir/screen.png" 2> "$report_dir/screen-error.txt" || true
  fi
  exit "$result"
}
trap collect_failure_evidence EXIT

source "$(dirname "$0")/prepare-android-ui.sh"
prepare_android_ui "$ANDROID_SERIAL" "$report_dir/preflight-views"

./android/gradlew -p android \
  :views:connectedDebugAndroidTest \
  --stacktrace --console=plain
# Views activity teardown returns to HOME. Validate that foreground again before
# Compose; do not retry or bypass any failing instrumentation test.
prepare_android_ui "$ANDROID_SERIAL" "$report_dir/preflight-compose"
./android/gradlew -p android \
  :compose:connectedDebugAndroidTest \
  --stacktrace --console=plain
