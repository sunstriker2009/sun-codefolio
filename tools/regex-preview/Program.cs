using System;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text.RegularExpressions;

[SupportedOSPlatform("browser")]
public static partial class RegexRunner
{
    public static void Main() { }

    [JSExport]
    public static string Test(string pattern, string input)
    {
        try
        {
            return Regex.IsMatch(input, pattern, RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(250))
                ? "match"
                : "no-match";
        }
        catch (RegexMatchTimeoutException)
        {
            return "timeout";
        }
    }
}
