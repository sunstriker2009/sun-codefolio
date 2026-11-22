using System;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

[SupportedOSPlatform("browser")]
public static partial class RegexRunner
{
    public static void Main() { }

    [JSExport]
    public static string? Validate(string pattern)
    {
        try
        {
            _ = new Regex(pattern, RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(250));
            return null;
        }
        catch (ArgumentException error)
        {
            return error.Message;
        }
    }

    [JSExport]
    public static string Test(string pattern, string input)
    {
        try
        {
            var match = Regex.Match(input, pattern, RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(250));
            if (!match.Success) return "{\"status\":\"no-match\"}";

            var groups = new string?[match.Groups.Count - 1];
            for (var i = 1; i < match.Groups.Count; i++)
                groups[i - 1] = match.Groups[i].Success ? match.Groups[i].Value : null;

            return JsonSerializer.Serialize(new RegexResult("match", match.Value, match.Index, groups),
                RegexJsonContext.Default.RegexResult);
        }
        catch (RegexMatchTimeoutException)
        {
            return "{\"status\":\"timeout\"}";
        }
        catch (ArgumentException error)
        {
            return JsonSerializer.Serialize(new RegexError("invalid", error.Message),
                RegexJsonContext.Default.RegexError);
        }
    }
}

internal sealed record RegexResult(string Status, string Text, int Index, string?[] Groups);

internal sealed record RegexError(string Status, string Message);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(RegexResult))]
[JsonSerializable(typeof(RegexError))]
internal partial class RegexJsonContext : JsonSerializerContext { }
