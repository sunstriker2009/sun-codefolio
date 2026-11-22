# CodeFolio Regex reference

The Regex reference runs JavaScript in a browser worker and starts .NET 10 WebAssembly on the first C# test. The engine processes text locally. Custom patterns have a title and an expression for each platform you supply. Each engine validates its expressions before save or import. Regex backups include custom patterns, tags, and favorites.

## Build and run

Use the .NET 10 SDK and its WebAssembly workload. Build into a fresh output directory and serve it over HTTP.

```sh
dotnet workload install wasm-tools
preview_dir=$(mktemp -d)
bash tools/regex-preview/build-preview.sh "$preview_dir"
python3 -m http.server 8000 --directory "$preview_dir"
```

Open [the Regex page](http://localhost:8000/sun-codefolio/regex/), or open the snippet library at [the site root](http://localhost:8000/sun-codefolio/). The [Regex preview workflow](../../.github/workflows/regex-preview.yml) publishes the same site tree as a build artifact.

## Publish

The [Pages workflow](../../.github/workflows/publish-pages.yml) builds the snippet library and Regex page in one artifact. It publishes on changes to site files once the repository’s Pages source is set to **GitHub Actions**. Run **Publish CodeFolio** from `main` for the first deployment after switching the source.
