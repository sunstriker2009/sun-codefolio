export const platforms = {
  csharp: 'C# / .NET 10',
  javascript: 'JavaScript',
  python: 'Python',
  go: 'Go',
};

export const recipes = [
  {
    id: 'url-component',
    title: 'Encode a URL component',
    description: 'Percent-encode text for a single URL component such as a query value.',
    inputFormat: 'Spaces become %20. ASCII letters, digits, and - . _ ~ stay as written.',
    examples: [
      { input: 'München / 東京 +?', output: 'M%C3%BCnchen%20%2F%20%E6%9D%B1%E4%BA%AC%20%2B%3F' },
      { input: "a!()'*~", output: 'a%21%28%29%27%2A~' },
      { label: 'Leading and trailing spaces', input: '  x + y  ', output: '%20%20x%20%2B%20y%20%20' },
    ],
  },
  {
    id: 'base64-utf8',
    title: 'Round-trip Unicode through Base64',
    description: 'Encode UTF-8 bytes as standard Base64, then decode the bytes back to text.',
    inputFormat: 'Unicode text with spaces, emoji, or line breaks.',
    examples: [
      { input: 'café ☀️', output: 'Base64: Y2Fmw6kg4piA77iP\nDecoded: café ☀️' },
      { input: '東京 🚀', output: 'Base64: 5p2x5LqsIPCfmoA=\nDecoded: 東京 🚀' },
      { label: 'Leading byte-order mark', input: '\uFEFFhello', output: 'Base64: 77u/aGVsbG8=\nDecoded: \uFEFFhello' },
    ],
  },
  {
    id: 'json-string',
    title: 'Escape a JSON string',
    description: 'Serialize text as a quoted JSON string. Serializers may represent the same characters with different escapes.',
    inputFormat: 'Try quotes, backslashes, newlines, or tabs.',
    examples: [
      { label: 'Quotes, backslash, and whitespace', input: 'Line 1\n"quoted" \\ Tab\t' },
      { input: '  <tag> café 🚀 &  ' },
      { label: 'Empty string', input: '' },
    ],
  },
];

export function encodeComponent(text) {
  return encodeURIComponent(text).replace(/[!'()*]/g, value =>
    '%' + value.charCodeAt(0).toString(16).toUpperCase());
}

export function base64RoundTrip(text) {
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(text)));
  const decoded = new TextDecoder('utf-8', { ignoreBOM: true })
    .decode(Uint8Array.from(atob(encoded), value => value.charCodeAt(0)));
  return 'Base64: ' + encoded + '\nDecoded: ' + decoded;
}

export function encodeJavaScript(recipe, text) {
  switch (recipe) {
    case 'url-component': return encodeComponent(text);
    case 'base64-utf8': return base64RoundTrip(text);
    case 'json-string': return JSON.stringify(text);
    default: return null;
  }
}
