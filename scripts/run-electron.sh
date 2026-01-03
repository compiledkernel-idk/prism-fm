#!/bin/sh
set -e

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ELECTRON_BIN="${ELECTRON_BIN:-electron}"

EXTRA_ARGS=""
if [ -n "$WAYLAND_DISPLAY" ] || [ "$XDG_SESSION_TYPE" = "wayland" ]; then
  if [ -z "$ELECTRON_OZONE_PLATFORM_HINT" ]; then
    export ELECTRON_OZONE_PLATFORM_HINT=wayland
  fi
  EXTRA_ARGS="--ozone-platform=wayland --enable-features=UseOzonePlatform"
fi

exec "$ELECTRON_BIN" "$APP_DIR" $EXTRA_ARGS "$@"
