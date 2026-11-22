const runtime = new URL('./_python/314.0.8/', import.meta.url);

export async function startPythonRegex() {
  const { loadPyodide } = await import(new URL('pyodide.mjs', runtime));
  const python = await loadPyodide({ indexURL: runtime.href });
  const run = python.runPython(`
import json
import re

def _codefolio_regex(pattern, text, validate):
    try:
        regex = re.compile(pattern)
    except (re.error, OverflowError, RecursionError) as error:
        return json.dumps({"status": "invalid", "message": str(error)})

    if validate:
        return ""

    match = regex.search(text)
    if match is None:
        return '{"status":"no-match"}'

    # The shared UI reports indices in UTF-16 code units, as in .NET and JavaScript.
    index = len(text[:match.start()].encode("utf-16-le", "surrogatepass")) // 2
    return json.dumps({
        "status": "match",
        "text": match.group(),
        "index": index,
        "groups": match.groups(),
    })

_codefolio_regex
`);

  return {
    match: (pattern, input) => JSON.parse(run(pattern, input, false)),
    validate: pattern => {
      const result = run(pattern, '', true);
      return result ? JSON.parse(result).message : null;
    },
  };
}
