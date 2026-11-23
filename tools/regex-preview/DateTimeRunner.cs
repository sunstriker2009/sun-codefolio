using System;
using System.Globalization;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;

[SupportedOSPlatform("browser")]
public static partial class DateTimeRunner
{
    private const string IsoDate = "yyyy-MM-dd";
    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

    [JSExport]
    public static string? Run(string recipe, string input)
    {
        if (recipe == "parse-date")
        {
            return DateOnly.TryParseExact(input, "dd/MM/yyyy", Invariant, DateTimeStyles.None, out var date)
                ? date.ToString(IsoDate, Invariant)
                : null;
        }

        if (!DateTimeOffset.TryParseExact(input, "yyyy-MM-dd'T'HH:mm:ss'Z'", Invariant,
            DateTimeStyles.AssumeUniversal, out var instant)) return null;
        return recipe switch
        {
            "format-date" => instant.ToString(IsoDate, Invariant),
            "utc-to-toronto" => TimeZoneInfo.ConvertTime(instant,
                TimeZoneInfo.FindSystemTimeZoneById("America/Toronto")).ToString("yyyy-MM-dd'T'HH:mm:sszzz", Invariant),
            _ => null,
        };
    }
}
