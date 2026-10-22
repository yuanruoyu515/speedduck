#!/bin/bash
set -euo pipefail
task_root="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$task_root/scripts/build-ui.py"
xcodebuild -project "$task_root/Safari/speedduck/speedduck.xcodeproj" -scheme speedduck -configuration Release -derivedDataPath "$task_root/build" CODE_SIGNING_ALLOWED=NO MACOSX_DEPLOYMENT_TARGET=14.0
if [[ -n "${SIGNING_IDENTITY:-}" ]]; then
  app="$task_root/build/Build/Products/Release/speedduck.app"
  codesign --force --sign "$SIGNING_IDENTITY" --options runtime --timestamp=none --entitlements "$task_root/scripts/entitlements.plist" "$app/Contents/PlugIns/speedduck Extension.appex"
  codesign --force --sign "$SIGNING_IDENTITY" --options runtime --timestamp=none --entitlements "$task_root/scripts/entitlements.plist" "$app"
  codesign --verify --deep --strict "$app"
fi
