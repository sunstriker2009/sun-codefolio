<!-- SUN BRANDING START -->
# CodeFolio by Sun

![CodeFolio by Sun](branding/assets/readme-banner.png)

A searchable library for customizing and reusing code snippets.
<!-- SUN BRANDING END -->

## Snippet workspace

[Open CodeFolio](https://sunstriker2009.github.io/sun-codefolio/)

CodeFolio is an interactive reference for Git, JavaScript, C#, and XPath. Browse the left menu by language and topic, or search the full catalog by task or exact syntax. Browse or search up to eight results per page. Open a snippet for a worked example and a shareable link. Mark it as a favorite to find it again in **Favorites** in the catalog menu. Favorites are saved in the current browser. Edit its parameters in the builder and copy the generated code, or save a named variant to reuse its values. Variants are scoped to the current browser and site. Saving a variant with the same name replaces it for that snippet.

### Run locally

Serve the repository root over HTTP, for example with Python 3.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000>. The workspace runs in the browser and only generates text for you to copy. Clipboard access uses localhost or HTTPS, with manual selection available when the clipboard is blocked.

### Git history variants

In the running workspace, open **View a file’s commit history** and enter a path relative to the repository root.

| Variant name | Local branch | Commit count | Show file change details |
| --- | --- | --- | --- |
| Release review | A local release branch, such as `release/v1` | 10 | On |
| Daily changelog | Leave blank for the current branch | 5 | Off |

Enter the name and select **Save variant**. Reopen the snippet later and select the saved name to restore the fields. You can edit the values and copy the new command, or save the edited values again.

### Maintain the catalog

Add entries to `app/catalog.mjs`. Give each snippet a stable ID, language, topic, search aliases and use cases, a worked example with prerequisites and expected behavior, and related snippet IDs. Define typed fields and defaults, then verify the generated example against its target shell, runtime, or evaluator before opening a PR.

Run the catalog checks with Node.js 24.

```sh
node --test tests/catalog.test.mjs
```

When changing the page markup or frontend modules together, update their asset version query strings in `index.html` and `app/workspace.mjs` so a browser can fetch the matching files after a Pages deployment.
