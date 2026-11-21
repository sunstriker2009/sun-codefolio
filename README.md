<!-- SUN BRANDING START -->
# CodeFolio by Sun

![CodeFolio by Sun](branding/assets/readme-banner.png)

A searchable library for customizing and reusing code snippets.
<!-- SUN BRANDING END -->

## Snippet workspace

CodeFolio is an interactive reference for Git, JavaScript, C#, and XPath. Search by task, keyword, or language, then open a snippet to see an example. Edit its parameters in the builder and copy the generated code, or save a named variant to reuse its values. Variants are scoped to the current browser and site. Saving a variant with the same name replaces it for that snippet.

### Run locally

Serve the repository root over HTTP, for example with Python 3.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000>. The workspace runs in the browser and only generates text for you to copy. Clipboard access uses localhost or HTTPS, with manual selection available when the clipboard is blocked.

The catalog lives in `app/catalog.mjs`. Each entry defines its language, search keywords, example, editable fields, and code generator. Run the catalog checks with Node.js 24.

```sh
node --test tests/catalog.test.mjs
```
