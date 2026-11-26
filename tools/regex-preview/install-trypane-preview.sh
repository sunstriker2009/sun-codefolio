#!/usr/bin/env bash
set -euo pipefail

site_regex_dir=${1:?Pass the built CodeFolio regex directory}
trypane_commit=1236f49638e93e8509765b98b173cffda3c96833
trypane_version=0.1.0-preview.1
checkout_dir=$(mktemp -d)
trap 'rm -rf -- "$checkout_dir"' EXIT

git clone --quiet https://github.com/sunstriker2009/sun-trypane.git "$checkout_dir/trypane"
git -C "$checkout_dir/trypane" checkout --quiet --detach "$trypane_commit"
npm --prefix "$checkout_dir/trypane" ci --no-audit --no-fund
npm --prefix "$checkout_dir/trypane" run build
bash "$checkout_dir/trypane/tools-build-runtime.sh"
bash "$checkout_dir/trypane/tools-package-preview.sh" "$trypane_commit"
mkdir -p "$site_regex_dir/trypane"
tar -xzf "$checkout_dir/trypane/dist/package/trypane-regex-$trypane_version.tar.gz" -C "$site_regex_dir/trypane"
test -s "$site_regex_dir/trypane/trypane-regex-$trypane_version/src/pane.js"
test -s "$site_regex_dir/trypane/trypane-regex-$trypane_version/runtime/wwwroot/_framework/dotnet.js"
