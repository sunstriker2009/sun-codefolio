# CodeFolio roadmap

CodeFolio is a cross-language reference with runnable Regex, Date & Time, Encoding & Escaping, XPath, and CSV examples. [Open CodeFolio](https://sunstriker2009.github.io/sun-codefolio/). The original snippet workspace now lives in [Playground by Sun](https://sunstriker2009.github.io/sun-playground/).

## Phase 1 complete

CodeFolio is live as a browser-based reference across five topics. Regex is the lead topic, with 21 built-in patterns and five engine options. Custom patterns, saved test cases, favorites, and personal tags use browser-local storage and JSON backups. The Topics index is the site entry point, and direct Regex and legacy snippet links still resolve.

### Shipped milestones

| Milestone | What shipped |
| --- | --- |
| M0 · Starter workspace | Snippets across four catalogs, keyword search, and an interactive builder. |
| M1 · Search and shareable references | Search by task or exact syntax and share a link to a worked example. |
| M2 · Reusable variants | Customize snippets with typed controls and save named variants in your browser. |
| M3 · First release | Launched the public site with 12 reviewed snippets. |
| M4 · Catalog expansion | Added Git history tools and C# Regex examples for named captures, date formatting, repeated words, and more. |
| M5 · Workspace improvements | Added mobile snippet navigation, a unified Filters panel, favorites, tags, and personal backups. |
| M6 · Practical C# Regex | Extract structured log records, mask IDs while keeping the last four digits, and distinguish a match timeout from a completed search. |
| M7 · JavaScript example validation | Added runtime checks for the generated array filtering, joining, and property extraction examples. |
| M8 · Practical C# LINQ | Added examples for selecting the latest record per group, joining collections by key, and finding duplicates by a composite key. |
| M10 · Regex reference | Browse and test common patterns at `/regex/` with C# and JavaScript. |
| M11 · Custom Regex patterns | Create, edit, duplicate, and test your own patterns with a separate expression per platform. Transfer custom patterns, tags, and favorites in a JSON backup. |
| M12 · Python Regex | Browse, test, and save Python patterns using Python’s standard `re` engine. |
| M13 · PCRE2 | Browse, test, and save patterns using PCRE2. See how to wrap raw expressions for PHP’s `preg_match`. |
| M14 · Go Regex | Browse, test, and save patterns using Go’s standard `regexp` engine, with guidance on Go’s syntax and match offsets. Manual iPhone Safari verification is complete. |
| M15 · Playground split | Made Regex the CodeFolio home page and moved the original snippet workspace to Playground. Existing snippet links forward to their new home. |
| M16 · Practical Regex recipes | Shipped an initial set of three worked extraction recipes covering log lines, key-value fields, and quoted strings. The larger 8–12-recipe goal is deferred. |
| M17 · Better Try It results | Find and highlight the first match or the first 100 matches. Inspect numbered and named captures for any displayed match. |
| M18 · Saved test cases | Save named match and no-match cases with custom patterns. Run them against the selected engine, including after edits, and transfer them in Regex backups. |
| M19 · Date & Time and Topics | Browse topics and run date formatting, UTC-to-Toronto conversion, and explicit-format parsing in C#, JavaScript, Python, and Go. Existing Regex links continue to resolve. |
| M20 · Encoding & Escaping | Encode URL components, round-trip Unicode through Base64, and serialize JSON strings in C#, JavaScript, Python, and Go. |
| M21 · XPath | Query XML in C#, browser JavaScript, or Python. Inspect elements, attributes, text, and scalar results, and bind prefixes for namespaced documents. |
| M22 · CSV | Parse quoted commas, escaped quotes, and multiline fields in C#, JavaScript, Python, and Go. Inspect CSV records as arrays of strings and copy platform-specific usage examples. |
| Regex catalog and detail polish | Added the Saved test cases tab, a bordered Try It result, more validation patterns, built-in validator and extractor tags, and deletion of personal tags. |

### Deferred at closeout

- **M23 · Regex Replace Preview.** Skipped for the M21–M22 release and carried into the Phase 2 proposal.
- **M16 · Remaining recipe expansion.** The initial three recipes shipped. Further additions are part of the Phase 2 catalog proposal.
- **M9 · Broader mobile performance baseline.** Deferred. The earlier manual iPhone Safari check is complete.

## Phase 2 proposal

Phase 2 can start when development resumes. The sequence below is proposed.

| Order | Focus | Proposed outcome |
| --- | --- | --- |
| 1 | Regex Replace Preview | Show replacement output before copying the expression into code. Cover numbered and named substitutions, show engine-specific syntax, and verify first and all matches. |
| 2 | Catalog depth and discovery | Expand the practical extraction recipes with expected results, edge cases, and platform notes. Add cross-topic discovery as the catalog grows. |
| 3 | Mobile and maintenance | Record cold and repeat runner timings, check accessibility and keyboard use, and review runtime updates and backup compatibility as part of a batched release. |

Keep the static site and browser-local data model as the starting point. A custom domain or account sync would need a separate decision and a data-portability plan.
