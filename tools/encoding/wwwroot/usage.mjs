import { base64RoundTrip, encodeComponent } from './recipes.mjs?v=topics-2';

export function encodingUsage(recipe, platform) {
  const input = JSON.stringify(recipe.examples[0].input);
  const url = recipe.id === 'url-component';
  const base64 = recipe.id === 'base64-utf8';

  switch (platform) {
    case 'javascript':
      if (url) return encodeComponent.toString() + '\n\nconsole.log(encodeComponent(' + input + '));';
      if (base64) return base64RoundTrip.toString() + '\n\nconsole.log(base64RoundTrip(' + input + '));';
      return 'console.log(JSON.stringify(' + input + '));';
    case 'csharp': {
      const lines = ['using System;'];
      if (base64) lines.push('using System.Text;');
      if (!url && !base64) lines.push('using System.Text.Json;');
      lines.push('', 'var input = ' + input + ';');
      if (url) lines.push('Console.WriteLine(Uri.EscapeDataString(input));');
      else if (base64) lines.push(
        'var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(input));',
        'var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(encoded));',
        'Console.WriteLine($"Base64: {encoded}");',
        'Console.WriteLine($"Decoded: {decoded}");',
      );
      else lines.push('Console.WriteLine(JsonSerializer.Serialize(input));');
      return lines.join('\n');
    }
    case 'python':
      if (url) return ['from urllib.parse import quote', '', 'print(quote(' + input + ', safe=""))'].join('\n');
      if (base64) return [
        'from base64 import b64encode, b64decode',
        '',
        'text = ' + input,
        'encoded = b64encode(text.encode("utf-8")).decode("ascii")',
        'decoded = b64decode(encoded).decode("utf-8")',
        'print("Base64:", encoded)',
        'print("Decoded:", decoded)',
      ].join('\n');
      return 'import json\n\nprint(json.dumps(' + input + '))';
    case 'go': {
      const imports = url ? ['fmt', 'net/url', 'strings'] : [base64 ? 'encoding/base64' : 'encoding/json', 'fmt'];
      const lines = ['package main', '', 'import (', ...imports.map(value => '\t' + JSON.stringify(value)),
        ')', '', 'func main() {', '\tinput := ' + input];
      if (url) lines.push('\tfmt.Println(strings.ReplaceAll(url.QueryEscape(input), "+", "%20"))');
      else if (base64) lines.push(
        '\tencoded := base64.StdEncoding.EncodeToString([]byte(input))',
        '\tdecoded, err := base64.StdEncoding.DecodeString(encoded)',
        '\tif err != nil {',
        '\t\tpanic(err)',
        '\t}',
        '\tfmt.Printf("Base64: %s\\nDecoded: %s\\n", encoded, decoded)',
      );
      else lines.push('\tencoded, err := json.Marshal(input)', '\tif err != nil {', '\t\tpanic(err)', '\t}', '\tfmt.Println(string(encoded))');
      return [...lines, '}'].join('\n');
    }
  }
}
