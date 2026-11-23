#!/usr/bin/env bash
set -euo pipefail

output_dir=${1:?Usage: bash tools/regex-preview/build-preview.sh OUTPUT_DIR}
repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
publish_dir=$(mktemp -d)
trap 'rm -rf -- "$publish_dir"' EXIT

dotnet publish "$repo_root/tools/regex-preview/CodeFolio.RegexPreview.csproj" \
  --configuration Release --output "$publish_dir"

site_dir="$output_dir/sun-codefolio"
mkdir -p "$site_dir/regex" "$site_dir/date-time" "$site_dir/encoding"
cp -R "$repo_root/shared" "$repo_root/branding" "$site_dir/"
cp "$repo_root/index.html" "$repo_root/redirect.mjs" "$site_dir/"
cp -R "$repo_root/tools/date-time/wwwroot/." "$site_dir/date-time/"
cp -R "$repo_root/tools/encoding/wwwroot/." "$site_dir/encoding/"
cp -R "$publish_dir/wwwroot/." "$site_dir/regex/"
bash "$repo_root/tools/regex-preview/install-python-runtime.sh" "$site_dir/regex"
bash "$repo_root/tools/regex-preview/install-pcre2-runtime.sh" "$site_dir/regex"
bash "$repo_root/tools/regex-preview/build-go-runtime.sh" "$site_dir/regex"
go_root=$(GOTOOLCHAIN=local go env GOROOT)
unzip -p "$go_root/lib/time/zoneinfo.zip" America/Toronto > "$site_dir/date-time/toronto.tzif"
test -s "$site_dir/regex/index.html"
test -s "$site_dir/regex/_framework/dotnet.js"
test -s "$site_dir/date-time/toronto.tzif"
test -s "$site_dir/encoding/index.html"
printf 'Site built at %s/\n' "$site_dir"
