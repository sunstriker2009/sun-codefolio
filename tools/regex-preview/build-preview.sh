#!/usr/bin/env bash
set -euo pipefail

output_dir=${1:?Usage: bash tools/regex-preview/build-preview.sh OUTPUT_DIR}
repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
publish_dir=$(mktemp -d)
trap 'rm -rf -- "$publish_dir"' EXIT

dotnet publish "$repo_root/tools/regex-preview/CodeFolio.RegexPreview.csproj" \
  --configuration Release --output "$publish_dir"

site_dir="$output_dir/sun-codefolio"
mkdir -p "$site_dir/regex" "$site_dir/app" "$site_dir/branding/assets/icons"
cp -R "$publish_dir/wwwroot/." "$site_dir/regex/"
cp "$repo_root/app/styles.css" "$site_dir/app/"
cp "$repo_root/branding/assets/icons/icon-64.png" "$site_dir/branding/assets/icons/"

test -s "$site_dir/regex/index.html"
test -s "$site_dir/regex/_framework/dotnet.js"
printf 'Preview built at %s/regex/\n' "$site_dir"
