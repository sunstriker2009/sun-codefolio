import { formatToronto } from './recipes.mjs?v=date-topics-1';

export function dateUsage(recipe, platform) {
  const input = JSON.stringify(recipe.examples[0].input);
  const parse = recipe.id === 'parse-date';
  const toronto = recipe.id === 'utc-to-toronto';

  switch (platform) {
    case 'csharp': {
      const lines = ['using System;', 'using System.Globalization;', '', 'var input = ' + input + ';'];
      if (parse) {
        lines.push('var date = DateOnly.ParseExact(input, "dd/MM/yyyy", CultureInfo.InvariantCulture);',
          'Console.WriteLine(date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));');
      } else {
        lines.push('var instant = DateTimeOffset.ParseExact(input, "yyyy-MM-dd\'T\'HH:mm:ss\'Z\'",',
          '    CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal);');
        if (toronto) {
          lines.push('var zone = TimeZoneInfo.FindSystemTimeZoneById("America/Toronto");',
            'var local = TimeZoneInfo.ConvertTime(instant, zone);',
            'Console.WriteLine(local.ToString("yyyy-MM-dd\'T\'HH:mm:sszzz", CultureInfo.InvariantCulture));');
        } else {
          lines.push('Console.WriteLine(instant.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));');
        }
      }
      return lines.join('\n');
    }
    case 'javascript':
      if (parse) return [
        'const input = ' + input + ';',
        'const [day, month, year] = input.split("/");',
        'const iso = [year, month, day].join("-");',
        'const date = new Date(iso + "T00:00:00Z");',
        'if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {',
        '  throw new Error("Invalid date");',
        '}',
        'console.log(iso);',
      ].join('\n');
      if (toronto) return formatToronto.toString() + '\n\nconsole.log(formatToronto(new Date(' + input + ')));';
      return 'const instant = new Date(' + input + ');\nconsole.log(instant.toISOString().slice(0, 10));';
    case 'python': {
      const lines = ['from datetime import datetime'];
      if (toronto) lines.push('from zoneinfo import ZoneInfo');
      lines.push('');
      if (parse) {
        lines.push('date = datetime.strptime(' + input + ', "%d/%m/%Y").date()', 'print(date.isoformat())');
      } else {
        lines.push('instant = datetime.fromisoformat(' + input + ')');
        lines.push(toronto ? 'print(instant.astimezone(ZoneInfo("America/Toronto")).isoformat())'
          : 'print(instant.date().isoformat())');
      }
      return lines.join('\n');
    }
    case 'go': {
      const lines = ['package main', '', 'import (', '\t"fmt"', '\t"time"', ')', '', 'func main() {'];
      const layout = parse ? '"02/01/2006"' : 'time.RFC3339';
      lines.push('\tvalue, err := time.Parse(' + layout + ', ' + input + ')', '\tif err != nil {', '\t\tpanic(err)', '\t}');
      if (toronto) lines.push('\tzone, err := time.LoadLocation("America/Toronto")', '\tif err != nil {',
        '\t\tpanic(err)', '\t}', '\tfmt.Println(value.In(zone).Format(time.RFC3339))');
      else lines.push('\tfmt.Println(value.Format(time.DateOnly))');
      return [...lines, '}'].join('\n');
    }
  }
}
