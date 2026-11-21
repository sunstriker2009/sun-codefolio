# CodeFolio development roadmap

[The Ecosystem Product Ideas handoff](https://github.com/sunstriker2009/sun-ecosystem/blob/35c4056e22c2e311c42a220de704c76605b859a5/docs/product-ideas.md#codefolio-by-sun) defines CodeFolio as a searchable reference for practical snippets. The first release covers Git, JavaScript, C#, and XPath. It supports two workflows: generate and copy a snippet immediately, or save named parameter values in the current browser and reuse them later.

| Milestone | Status | Outcome |
| --- | --- | --- |
| M0 · Starter workspace | Complete | Six starter snippets, keyword search, language filters, a live builder, and locally saved variants |
| M1 · Search and shareable reference | Complete | Find a snippet by task or syntax and open a shareable page with a worked example |
| M2 · Typed builder and reusable variants | Complete | Customize a snippet with typed controls and reliably reopen, edit, and copy saved values |
| M3 · First release | Complete | Ship a reviewed catalog and verify the two workflows on the first supported hosting target |
| M4 · Catalog expansion | Complete | Two Git history tasks and a focused C# Regex collection |
| M5 · UI refinement | In progress | Mobile snippet navigation, simpler search filters, and easier access to snippet actions |

## M0 · Starter workspace

[PR #11](https://github.com/sunstriker2009/sun-codefolio/pull/11) merged the static workspace and six entries across the four starting languages. The workspace already supports editing fields, copying generated text, and saving, replacing, loading, and deleting a named variant in the current browser. Catalog tests cover validated defaults and quoting. Simulated interaction checks covered the main flows. Mobile rendering and native clipboard permissions still need real-browser verification.

## M1 · Search and shareable reference

1. Define a catalog entry format with a stable snippet ID, language or tool, title, aliases, use cases, example code, and related snippet IDs. Validate IDs and cross-references in CI.
2. Index example code along with titles, aliases, use cases, and explanations. Rank exact title or syntax matches ahead of broader matches and retain language or tool filters.
3. Give each entry a stable, shareable URL. Show prerequisites, a realistic example, expected output or behavior, relevant side effects, and related snippets. Keep shared URLs limited to the public catalog entry.

**Complete when** a task query such as `find old changes to a file` and a syntax query such as `git log --oneline` both surface the Git history snippet. Syntax queries such as `items.Take(` and `//*[@` retain their punctuation, and filters narrow the results. Each of the six starter entries opens directly from a copied URL in a fresh session and survives reload. Automated checks cover representative queries and an unknown snippet URL.

**First implementation PR** — add catalog metadata and regression queries for plain-language and syntax search. Follow with a PR for shareable URLs and complete reference entries.

## M2 · Typed builder and reusable variants

1. Define a type, default, and applicable constraints for each parameter. Support text, integer, choice, and toggle controls where the snippet needs them.
2. Update the preview on edit and apply quoting or escaping for the target language or command. Show validation feedback and disable copy and save while the values are invalid.
3. Preserve existing browser-saved variants through catalog and builder changes. Store parameter values under stable snippet IDs and handle invalid or outdated values with an actionable message. Keep variants local to the current browser.
4. Use the Git history snippet as the worked builder example. Support a branch, commit count, and a file-change detail toggle. Explain each setting and show how to save “Release review” and “Daily changelog” variants.

**Complete when** both Git history variants can be saved, reopened after reload, edited, and copied independently. Tests cover existing variant data, invalid inputs, and representative literal escaping for Git, JavaScript, and XPath, as well as numeric bounds for C#. Generate-and-copy works without creating a variant.

## M3 · First release

1. As a proposed release target, build a curated catalog of at least three reviewed snippets per starting language. Check examples against the documented prerequisites and expected behavior.
2. Verify direct links, search, both builder workflows, and variant persistence in real browsers. Include desktop Chromium and mobile Safari, keyboard navigation, narrow layouts, and the manual copy fallback when native clipboard access is unavailable.
3. Choose the initial hosting target and verify direct links and clipboard access on its HTTPS origin. Document local startup, how to add a catalog entry, browser-local storage behavior, and the release checks.

### Release verification

- [x] Three snippets per language. The twelve worked examples were checked with Git, Node.js, .NET 10, and an XPath evaluator.
- [x] Desktop Chromium passed direct links, keyboard search, clipboard copy, manual copy fallback, saved-variant persistence, and a 390px layout on localhost.
- [x] The repository owner confirmed the live iPhone Safari check for search, parameter editing, clipboard copy, and reopening a saved variant after reload.
- [x] Verified [CodeFolio on GitHub Pages](https://sunstriker2009.github.io/sun-codefolio/) over HTTPS. Chrome passed search, direct snippet links after reload, copy to clipboard, and saving and reloading a named variant.

**Complete when** CI is green and the browser and hosting checks above pass. Accounts and cross-device variant sync are follow-up decisions.

## M4 · Git history and C# Regex

- Trace changes to a line with Git and review the commits between two release tags.
- Extract a named group from a structured line, rearrange date components with substitutions, and detect repeated words with a backreference in C#.
- The Regex collection also covers build-time generation for reusable ticket validation and literal searches with escaped input.
- Each entry has a worked example, a configurable builder, and a stable link. Search tests cover plain-language and syntax queries. The generated examples were checked against Git and .NET 10.

## M5 · UI refinement

Complete this pass before expanding the catalogs again.

- [x] **Mobile snippet navigation.** Open snippets in a dedicated detail view on narrow screens. **Back to results** restores the search, tag filters, catalog, topic, page, and scroll position. Direct snippet links open the detail view, and desktop keeps the side-by-side layout.
- [ ] **Search filter controls.** Keep text search prominent. Place tag and scope controls under **Filters** and show active filters as removable chips.
- [ ] **Snippet actions.** Add **Copy link** near the title and **Jump to builder** after the example. Keep the generated-code copy action beside the output.
