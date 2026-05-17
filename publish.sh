#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"

publish_one() {
   local pkg="$1"
   echo "=== triggering publish: $pkg ==="
   cd "$script_dir"
   gh workflow run publish.yml -f "package=$pkg"
}

if [ $# -eq 0 ]; then
   for dir in "$script_dir"/*/; do
      pkg="$(basename "$dir")"
      if [ -f "$dir/package.json" ]; then
         publish_one "$pkg"
      fi
   done
else
   for pkg in "$@"; do
      if [ ! -d "$script_dir/$pkg" ] || [ ! -f "$script_dir/$pkg/package.json" ]; then
         echo "error: package not found: $pkg" >&2
         exit 1
      fi
      publish_one "$pkg"
   done
fi

echo "=== done ==="
