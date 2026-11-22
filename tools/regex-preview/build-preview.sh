#!/usr/bin/env bash
set -euo pipefail

output_dir=${1:?Usage: bash tools/regex-preview/build-preview.sh OUTPUT_DIR}
repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
publish_dir=$(mktemp -d)
trap 'rm -rf -- "$publish_dir"' EXIT

dotnet publish "$repo_root/tools/regex-preview/CodeFolio.RegexPreview.csproj" \
  --configuration Release --output "$publish_dir"

site_dir="$output_dir/sun-codefolio"
mkdir -p "$site_dir/regex"
cp -R "$repo_root/app" "$repo_root/branding" "$site_dir/"
cp -R "$publish_dir/wwwroot/." "$site_dir/regex/"
sed 's/id="site-nav" aria-label="CodeFolio" hidden/id="site-nav" aria-label="CodeFolio"/' \
  "$repo_root/index.html" > "$site_dir/index.html"

test -s "$site_dir/regex/index.html"
test -s "$site_dir/regex/_framework/dotnet.js"
printf 'Site built at %s/\n' "$site_dir"
