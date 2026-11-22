# CodeFolio Regex runner preview

This preview exercises the C# runner for the planned Regex reference. Open the signed-integer pattern, enter test text, and select **Test pattern**. The first test downloads .NET WebAssembly and starts it in a browser worker. Later tests reuse the worker.

## Run the preview locally

Install the .NET 10 SDK and its WebAssembly workload. Build into a fresh output directory and serve it over HTTP.

```sh
dotnet workload install wasm-tools
preview_dir=$(mktemp -d)
bash tools/regex-preview/build-preview.sh "$preview_dir"
python3 -m http.server 8000 --directory "$preview_dir"
```

Open [the local preview](http://localhost:8000/sun-codefolio/regex/). The matching examples are `-42` and `+7`. Check that `3.5`, an empty input, and a number with a trailing newline produce **No match**.

The [Regex preview workflow](../../.github/workflows/regex-preview.yml) publishes the same folder layout as a build artifact. Unzip it and serve its top-level directory. The `sun-codefolio/regex/` path mirrors the planned GitHub Pages project URL.
