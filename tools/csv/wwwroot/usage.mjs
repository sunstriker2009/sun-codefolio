import { parseCsv } from './parser.mjs?v=csv-1';

export function csvUsage(recipe, platform) {
  const input = JSON.stringify(recipe.examples[0].input);
  switch (platform) {
    case 'csharp':
      return [
        '#:package CsvHelper@33.1.0',
        'using System;',
        'using System.Collections.Generic;',
        'using System.Globalization;',
        'using System.IO;',
        'using System.Text.Json;',
        'using System.Text.Json.Serialization;',
        'using CsvHelper;',
        '',
        'using var reader = new StringReader(' + input + ');',
        'using var parser = new CsvParser(reader, CultureInfo.InvariantCulture);',
        'var rows = new List<string[]>();',
        'while (parser.Read())',
        '    rows.Add(parser.Record!);',
        'Console.WriteLine(JsonSerializer.Serialize(rows, CsvJsonContext.Default.ListStringArray));',
        '',
        '[JsonSerializable(typeof(List<string[]>))]',
        'internal partial class CsvJsonContext : JsonSerializerContext { }',
      ].join('\n');
    case 'go':
      return [
        'package main',
        '',
        'import (',
        '\t"encoding/csv"',
        '\t"encoding/json"',
        '\t"log"',
        '\t"os"',
        '\t"strings"',
        ')',
        '',
        'func main() {',
        '\treader := csv.NewReader(strings.NewReader(' + input + '))',
        '\treader.FieldsPerRecord = -1',
        '\trows, err := reader.ReadAll()',
        '\tif err != nil {',
        '\t\tlog.Fatal(err)',
        '\t}',
        '\tif err := json.NewEncoder(os.Stdout).Encode(rows); err != nil {',
        '\t\tlog.Fatal(err)',
        '\t}',
        '}',
      ].join('\n');
    case 'python':
      return [
        'import csv',
        'import json',
        'from io import StringIO',
        '',
        'text = ' + input,
        'reader = csv.reader(StringIO(text, newline=""), strict=True)',
        'print(json.dumps([row for row in reader if row]))',
      ].join('\n');
    default:
      return parseCsv.toString() + '\n\nconsole.log(parseCsv(' + input + '));';
  }
}
