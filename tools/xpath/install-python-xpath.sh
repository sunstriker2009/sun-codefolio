#!/usr/bin/env bash
set -euo pipefail

output_dir=$1
version=314.0.8
wheel=lxml-6.1.3-cp314-cp314-pyemscripten_2026_0_wasm32.whl
target="$output_dir/_python"
mkdir -p "$target"
download=$(mktemp)
trap 'rm -f -- "$download"' EXIT
curl --fail --location --retry 3 --silent --show-error --output "$download" \
  "https://cdn.jsdelivr.net/pyodide/v$version/full/$wheel"
printf '6a0b98f57a538cb6af4868c3499efec2bb52f7ed59fed94b7fbf195d6e40281f  %s\n' "$download" | sha256sum --check
cp "$download" "$target/$wheel"
