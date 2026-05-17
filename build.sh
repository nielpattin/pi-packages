#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"

build_one() {
   local pkg="$1"
   echo "=== building $pkg ==="
   cd "$script_dir/$pkg"
   npm install --package-lock-only
   npm run build
   cd "$script_dir"
}

if [ $# -eq 0 ]; then
   for dir in "$script_dir"/*/; do
      pkg="$(basename "$dir")"
      if [ -f "$dir/package.json" ]; then
         build_one "$pkg"
      fi
   done
else
   for pkg in "$@"; do
      if [ ! -d "$script_dir/$pkg" ] || [ ! -f "$script_dir/$pkg/package.json" ]; then
         echo "error: package not found: $pkg" >&2
         exit 1
      fi
      build_one "$pkg"
   done
fi

echo "=== done ==="
