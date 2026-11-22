#!/usr/bin/env bash
set -euo pipefail

regex_dir=${1:?Usage: bash tools/regex-preview/install-pcre2-runtime.sh REGEX_DIRECTORY}
version=10.49.3
archive="pcre2-wasm-$version.tgz"
runtime_dir="$regex_dir/_pcre2/$version"
download_dir=$(mktemp -d)
trap 'rm -rf -- "$download_dir"' EXIT

curl --fail --location --retry 3 --silent --show-error --output "$download_dir/$archive" \
  "https://registry.npmjs.org/pcre2-wasm/-/$archive"
(cd "$download_dir" && sha256sum --check <<CHECKSUMS
58f11ec03db3c0dacaef518c9ada186608b5a3819a19f6cdd598c0edda2238f6  $archive
CHECKSUMS
)

mkdir -p "$runtime_dir"
tar -xzf "$download_dir/$archive" -C "$runtime_dir" --strip-components=1 \
  package/package.json package/LICENSE package/NOTICE \
  package/lib/index.js package/dist/pcre2.js \
  package/js/pcre2.js package/js/regex.js package/js/utils.js package/js/errors.js package/js/constants.js
