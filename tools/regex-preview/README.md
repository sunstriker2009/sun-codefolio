# CodeFolio Regex reference

The Regex reference runs C#, JavaScript, Python, PCRE2, and Go in browser workers. The first test or validation for C# loads .NET 10 WebAssembly. Python loads Pyodide and runs CPython’s standard `re` module. PCRE2 loads its WebAssembly runtime and accepts raw expressions in UTF-8 mode. Go runs the standard library’s `regexp` package in WebAssembly and converts byte offsets to the UTF-16 units shown in Try It. Test text and custom expressions stay in the browser. Custom patterns have a title and an expression for each platform you supply. Each engine validates its expressions before save or import. Regex backups include custom patterns, saved test cases, personal tags, and favorites. The catalog provides built-in validator and extractor tags. Use **Filters → Tags** to delete a personal tag from every pattern.

Try It defaults to **First match**. Select **Find all** to highlight up to 100 matches in a copy of the input and inspect the numbered and named captures of each match. The preview marks empty matches with `∅`. Partial-character matches reported by an engine appear in the match inspector.

For a TryPane integration preview, open the Regex URL with `?trypane=1`. The C# Try It tab uses TryPane's versioned Regex bundle while CodeFolio continues to own the pattern, test text, examples, and saved cases. Selecting another platform uses CodeFolio's existing runner. Remove the query parameter to return to the normal C# Try It. The site build pins TryPane merge commit `375e1b5d442f1b77726f994df75f8c2315ef2c7f` at `0.1.0-preview.1`; the installer builds it from source and copies the bundle into the site. This preview does not replace the default interface. iPhone Safari acceptance is still pending in TryPane's roadmap.

On a custom pattern, open the **Saved test cases** tab and edit the pattern to add up to 20 named cases with input and an expected match or no-match result. **Run cases** uses the selected engine and works while you edit the pattern. Saving the pattern stores its test cases in this browser and includes them in Regex backups. Ordinary Try It input stays in the current page.

## Build and run

Use Node.js 24, the .NET 10 SDK with its WebAssembly workload, and the Go SDK version in [`.go-version`](.go-version). The build downloads and verifies the pinned [Pyodide core runtime](https://github.com/pyodide/pyodide/tree/314.0.8) and [PCRE2 WebAssembly package](https://github.com/gudoshnikovn/pcre2-wasm). It builds the Go runtime and the pinned TryPane bundle from source and publishes all runtime assets alongside the site. Build into a fresh output directory and serve it over HTTP.

```sh
dotnet workload install wasm-tools
preview_dir=$(mktemp -d)
bash tools/regex-preview/build-preview.sh "$preview_dir"
python3 -m http.server 8000 --directory "$preview_dir"
```

Open [the Topics index](http://localhost:8000/sun-codefolio/) to browse [Regex](http://localhost:8000/sun-codefolio/regex/), [Date & Time](http://localhost:8000/sun-codefolio/date-time/), [Encoding & Escaping](http://localhost:8000/sun-codefolio/encoding/), [XPath](http://localhost:8000/sun-codefolio/xpath/), and [CSV](http://localhost:8000/sun-codefolio/csv/). The [preview workflow](../../.github/workflows/regex-preview.yml) tests and uploads the same site build. The topics share the .NET, Python, and Go packages. The Date & Time worker reads Toronto time-zone data from the pinned Go SDK’s zone database. Python XPath loads a checksum-pinned lxml wheel only when requested.

## Publish

The [Pages workflow](../../.github/workflows/publish-pages.yml) publishes the Topics index and all five topic pages. It runs on changes to site files when the repository’s Pages source is set to **GitHub Actions**.
