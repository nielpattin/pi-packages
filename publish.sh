#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$script_dir"

packages_dir="$script_dir/packages"

if [ $# -eq 0 ]; then
  for dir in "$packages_dir"/*/; do
    pkg="$(basename "$dir")"
    if [ -f "$dir/package.json" ]; then
      echo "=== triggering publish: $pkg ==="
      gh workflow run publish.yml -f "package=$pkg"
    fi
  done
else
  for pkg in "$@"; do
    if [ ! -d "$packages_dir/$pkg" ] || [ ! -f "$packages_dir/$pkg/package.json" ]; then
      echo "error: package not found: $pkg" >&2
      exit 1
    fi
    echo "=== triggering publish: $pkg ==="
    gh workflow run publish.yml -f "package=$pkg"
  done
fi

echo "=== done ==="
