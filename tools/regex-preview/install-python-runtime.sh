#!/usr/bin/env bash
set -euo pipefail

regex_dir=${1:?Usage: bash tools/regex-preview/install-python-runtime.sh REGEX_DIRECTORY}
mkdir -p "$regex_dir"
regex_dir=$(cd "$regex_dir" && pwd)
version=314.0.8
archive="pyodide-core-$version.tar.bz2"
runtime_dir="$regex_dir/_python/$version"
download_dir=$(mktemp -d)
trap 'rm -rf -- "$download_dir"' EXIT

cd "$download_dir"
curl --fail --location --retry 3 --silent --show-error --output "$archive" \
  "https://github.com/pyodide/pyodide/releases/download/$version/$archive"
curl --fail --location --retry 3 --silent --show-error --output LICENSE.pyodide \
  "https://raw.githubusercontent.com/pyodide/pyodide/$version/LICENSE"
curl --fail --location --retry 3 --silent --show-error --output LICENSE.cpython \
  "https://raw.githubusercontent.com/python/cpython/v3.14.2/LICENSE"
sha256sum --check <<CHECKSUMS
ff3e5f9d9bc8e98ff30b99515535fc24d375994f47a978c61975d653e162ca37  $archive
1f256ecad192880510e84ad60474eab7589218784b9a50bc7ceee34c2b91f1d5  LICENSE.pyodide
b0e25a78cffb43f4d92de8b61ccfa1f1f98ecbc22330b54b5251e7b6ba010231  LICENSE.cpython
CHECKSUMS

mkdir -p "$runtime_dir"
tar -xjf "$archive" -C "$runtime_dir" --strip-components=1 \
  pyodide/pyodide.mjs pyodide/pyodide.asm.mjs pyodide/pyodide.asm.wasm \
  pyodide/pyodide-lock.json pyodide/python_stdlib.zip
cp LICENSE.pyodide LICENSE.cpython "$runtime_dir/"
