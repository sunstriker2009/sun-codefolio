export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let mode = 'unquoted';

  function finishField() {
    row.push(field);
    field = '';
    mode = 'unquoted';
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (mode === 'quoted') {
      if (char !== '"') {
        field += char;
      } else if (text[i + 1] === '"') {
        field += char;
        i++;
      } else {
        mode = 'closed';
      }
    } else if (char === ',') {
      finishField();
    } else if (char === '\n') {
      if (row.length || field || mode === 'closed') {
        finishField();
        rows.push(row);
        row = [];
      }
    } else if (mode === 'closed') {
      throw new SyntaxError('Expected a comma or line break after the closing quote.');
    } else if (char === '"') {
      if (field) throw new SyntaxError('A quoted field must start with a double quote.');
      mode = 'quoted';
    } else {
      field += char;
    }
  }

  if (mode === 'quoted') throw new SyntaxError('A quoted field is missing its closing quote.');
  if (row.length || field || mode === 'closed') {
    finishField();
    rows.push(row);
  }
  return rows;
}
