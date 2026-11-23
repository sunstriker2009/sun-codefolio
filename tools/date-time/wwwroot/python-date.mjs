import { loadPython } from '../shared/runtime-loaders.mjs?v=topics-2';

export async function startDatePython(readZone) {
  const python = await loadPython();
  const run = python.runPython([
    'from base64 import b64decode',
    'from datetime import datetime',
    'from io import BytesIO',
    'from zoneinfo import ZoneInfo',
    '',
    'def codefolio_date(recipe, text, zone):',
    '    try:',
    '        if recipe == "parse-date":',
    '            return datetime.strptime(text, "%d/%m/%Y").date().isoformat()',
    '        instant = datetime.fromisoformat(text)',
    '    except ValueError:',
    '        return None',
    '    if recipe == "utc-to-toronto":',
    '        toronto = ZoneInfo.from_file(BytesIO(b64decode(zone)), key="America/Toronto")',
    '        return instant.astimezone(toronto).isoformat()',
    '    return instant.date().isoformat()',
    '',
    'codefolio_date',
  ].join('\n'));
  let zone;
  return async (recipe, input) => {
    if (recipe === 'utc-to-toronto') zone ??= btoa(String.fromCharCode(...await readZone()));
    return run(recipe, input, zone ?? '');
  };
}
