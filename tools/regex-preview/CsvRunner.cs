using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text.Json;
using System.Text.Json.Serialization;
using CsvHelper;
using CsvHelper.Configuration;

[SupportedOSPlatform("browser")]
public static partial class CsvRunner
{
    [JSExport]
    public static string Run(string input)
    {
        using var reader = new StringReader(input);
        using var parser = new CsvParser(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            ExceptionMessagesContainRawData = false,
        });
        var rows = new List<string[]>();
        try
        {
            while (parser.Read())
                rows.Add(parser.Record!);
        }
        catch (BadDataException)
        {
            return "null";
        }
        return JsonSerializer.Serialize(rows, CsvJsonContext.Default.ListStringArray);
    }
}

[JsonSerializable(typeof(List<string[]>))]
internal partial class CsvJsonContext : JsonSerializerContext { }
