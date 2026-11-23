using System;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

[SupportedOSPlatform("browser")]
public static partial class EncodingRunner
{
    [JSExport]
    public static string? Run(string recipe, string input) => recipe switch
    {
        "url-component" => Uri.EscapeDataString(input),
        "base64-utf8" => RoundTrip(input),
        "json-string" => JsonSerializer.Serialize(input, EncodingJsonContext.Default.String),
        _ => null,
    };

    private static string RoundTrip(string input)
    {
        var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(input));
        var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(encoded));
        return $"Base64: {encoded}\nDecoded: {decoded}";
    }
}

[JsonSerializable(typeof(string))]
internal partial class EncodingJsonContext : JsonSerializerContext { }
