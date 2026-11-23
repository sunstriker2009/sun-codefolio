const runtime = new URL('./_python/314.0.8/', import.meta.url);

export async function startPythonRegex() {
  const { loadPyodide } = await import(new URL('pyodide.mjs', runtime));
  const python = await loadPyodide({ indexURL: runtime.href });
  const run = python.runPython(`
import json
import re
from itertools import islice

def _codefolio_regex(pattern, text, limit):
    try:
        regex = re.compile(pattern)
    except (re.error, OverflowError, RecursionError) as error:
        return json.dumps({"status": "invalid", "message": str(error)})

    if not limit:
        return ""

    matches = []
    index = previous = 0
    for match in islice(regex.finditer(text), limit):
        # The shared UI uses UTF-16 indices. Scan only the gap since the previous start.
        start = match.start()
        index += len(text[previous:start].encode("utf-16-le", "surrogatepass")) // 2
        previous = start
        matches.append({
            "text": match.group(),
            "index": index,
            "groups": match.groups(),
            "named": [{"name": name, "value": value} for name, value in match.groupdict().items()],
        })
    if not matches:
        return '{"status":"no-match"}'

    return json.dumps({"status": "match", "matches": matches})

_codefolio_regex
`);

  return {
    match: (pattern, input, limit) => JSON.parse(run(pattern, input, limit)),
    validate: pattern => {
      const result = run(pattern, '', 0);
      return result ? JSON.parse(result).message : null;
    },
  };
}
