# CodeFolio Regex reference

The Regex reference runs C#, JavaScript, Python, and PCRE2 in browser workers. The first test or validation for C# loads .NET 10 WebAssembly. Python loads Pyodide and runs CPython’s standard `re` module. PCRE2 loads its WebAssembly runtime and accepts raw expressions in UTF-8 mode. Test text and custom expressions stay in the browser. Custom patterns have a title and an expression for each platform you supply. Each engine validates its expressions before save or import. Regex backups include custom patterns, tags, and favorites.

## Build and run

Use the .NET 10 SDK and its WebAssembly workload. The build downloads and verifies the pinned [Pyodide core runtime](https://github.com/pyodide/pyodide/tree/314.0.8) and [PCRE2 WebAssembly package](https://github.com/gudoshnikovn/pcre2-wasm) and publishes their browser assets alongside the site. Build into a fresh output directory and serve it over HTTP.

```sh
dotnet workload install wasm-tools
preview_dir=$(mktemp -d)
bash tools/regex-preview/build-preview.sh "$preview_dir"
python3 -m http.server 8000 --directory "$preview_dir"
```

Open [the Regex page](http://localhost:8000/sun-codefolio/regex/), or open the snippet library at [the site root](http://localhost:8000/sun-codefolio/). The [Regex preview workflow](../../.github/workflows/regex-preview.yml) publishes the same site tree as a build artifact.

## Publish

The [Pages workflow](../../.github/workflows/publish-pages.yml) builds the snippet library and Regex page in one artifact. It publishes on changes to site files once the repository’s Pages source is set to **GitHub Actions**. Run **Publish CodeFolio** from `main` for the first deployment after switching the source.
