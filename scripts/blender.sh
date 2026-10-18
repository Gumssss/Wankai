#!/bin/bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
blender_bin="${BLENDER_BIN:-}"
if [[ -z "$blender_bin" ]]; then
  for candidate in "/Applications/Blender.app/Contents/MacOS/Blender" "$HOME/Applications/Blender.app/Contents/MacOS/Blender"; do
    if [[ -x "$candidate" ]]; then blender_bin="$candidate"; break; fi
  done
fi
if [[ -z "$blender_bin" ]]; then blender_bin="$(command -v blender || true)"; fi
if [[ -z "$blender_bin" || ! -x "$blender_bin" ]]; then
  printf '%s\n' 'Blender was not found. Set BLENDER_BIN to the Blender executable.' >&2
  exit 1
fi

# Keep project preferences separate from the user's regular Blender profile.
export BLENDER_USER_CONFIG="$repo_root/.local/blender/config"
mkdir -p "$BLENDER_USER_CONFIG"
exec "$blender_bin" --disable-autoexec "$@"
