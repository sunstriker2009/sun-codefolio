#!/usr/bin/env bash
set -euo pipefail

regex_dir=${1:?Usage: bash tools/regex-preview/build-go-runtime.sh REGEX_DIRECTORY}
source_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
go_root=$(GOTOOLCHAIN=local go env GOROOT)
runtime_dir="$regex_dir/_go"

mkdir -p "$runtime_dir"
GOTOOLCHAIN=local CGO_ENABLED=0 GOOS=js GOARCH=wasm \
  go build -trimpath -ldflags='-s -w' -o "$runtime_dir/regex.wasm" "$source_dir/go/main.go" "$source_dir/go/date.go"
cp "$go_root/lib/wasm/wasm_exec.js" "$go_root/LICENSE" "$runtime_dir/"
