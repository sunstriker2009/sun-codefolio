function phpString(text) {
  return "'" + text.replaceAll('\\', '\\\\').replaceAll("'", "\\'") + "'";
}

export function recipeUsage(engine, expression, sample) {
  const pattern = JSON.stringify(expression);
  const text = JSON.stringify(sample);
  switch (engine) {
    case 'csharp':
      return [
        'using System;',
        'using System.Text.RegularExpressions;',
        '',
        'var match = Regex.Match(' + text + ', ' + pattern + ');',
        'if (match.Success)',
        '    Console.WriteLine(match.Groups[1].Value);',
      ].join('\n');
    case 'javascript':
      return [
        'const regex = new RegExp(' + pattern + ');',
        'const match = regex.exec(' + text + ');',
        'if (match) console.log(match[1]);',
      ].join('\n');
    case 'python':
      return [
        'import re',
        '',
        'match = re.search(' + pattern + ', ' + text + ')',
        'if match:',
        '    print(match.group(1))',
      ].join('\n');
    case 'pcre2':
      return [
        '<?php',
        'if (preg_match(' + phpString('~' + expression.replaceAll('~', '\\~') + '~u') + ', ' + phpString(sample) + ', $match) === 1) {',
        '    echo $match[1], PHP_EOL;',
        '}',
      ].join('\n');
    case 'go':
      return [
        'package main',
        '',
        'import (',
        '\t"fmt"',
        '\t"regexp"',
        ')',
        '',
        'func main() {',
        '\tre := regexp.MustCompile(' + pattern + ')',
        '\tif match := re.FindStringSubmatch(' + text + '); match != nil {',
        '\t\tfmt.Println(match[1])',
        '\t}',
        '}',
      ].join('\n');
  }
}
