using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Xml;
using System.Xml.XPath;

[SupportedOSPlatform("browser")]
public static partial class XPathRunner
{
    private const int MaxResults = 100;
    private const int MaxNodePreview = 1200;

    [JSExport]
    public static string Run(string xml, string query, string bindings)
    {
        XPathOutput result;
        try
        {
            using var reader = XmlReader.Create(new StringReader(xml), new XmlReaderSettings
            {
                DtdProcessing = DtdProcessing.Prohibit,
                XmlResolver = null,
            });
            var document = new XPathDocument(reader, XmlSpace.Preserve);
            var navigator = document.CreateNavigator();
            var namespaces = new XmlNamespaceManager(navigator.NameTable);
            var mappings = JsonSerializer.Deserialize(bindings, XPathJsonContext.Default.DictionaryStringString);
            if (mappings is not null)
                foreach (var (prefix, uri) in mappings) namespaces.AddNamespace(prefix, uri);

            result = navigator.Evaluate(query, namespaces) switch
            {
                XPathNodeIterator nodes => ListNodes(nodes),
                bool flag => new XPathOutput("scalar", "boolean", flag ? "true" : "false"),
                double number => new XPathOutput("scalar", "number", number.ToString(CultureInfo.InvariantCulture)),
                string value => new XPathOutput("scalar", "string", value),
                _ => new XPathOutput("invalid", Message: "This XPath result type is unavailable."),
            };
        }
        catch (XmlException error)
        {
            result = new XPathOutput("invalid", Message: "XML error. " + error.Message);
        }
        catch (XPathException error)
        {
            result = new XPathOutput("invalid", Message: "XPath error. " + error.Message);
        }
        catch (ArgumentException error)
        {
            result = new XPathOutput("invalid", Message: "Namespace error. " + error.Message);
        }
        return JsonSerializer.Serialize(result, XPathJsonContext.Default.XPathOutput);
    }

    private static XPathOutput ListNodes(XPathNodeIterator iterator)
    {
        var nodes = new List<XPathSelection>();
        while (iterator.MoveNext())
        {
            if (nodes.Count == MaxResults) return new XPathOutput("nodes", Nodes: nodes, Truncated: true);
            var node = iterator.Current!;
            var kind = node.NodeType switch
            {
                XPathNodeType.Root => "document",
                XPathNodeType.Whitespace or XPathNodeType.SignificantWhitespace => "text",
                XPathNodeType.ProcessingInstruction => "processing-instruction",
                _ => node.NodeType.ToString().ToLowerInvariant(),
            };
            var value = node.NodeType is XPathNodeType.Element or XPathNodeType.Root ? node.OuterXml : node.Value;
            if (value.Length > MaxNodePreview) value = value[..MaxNodePreview] + "…";
            nodes.Add(new XPathSelection(kind, node.LocalName, value));
        }
        return new XPathOutput("nodes", Nodes: nodes);
    }
}

internal sealed record XPathSelection(string Kind, string Name, string Value);
internal sealed record XPathOutput(string Status, string? Kind = null, string? Value = null,
    List<XPathSelection>? Nodes = null, bool Truncated = false, string? Message = null);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(XPathOutput))]
[JsonSerializable(typeof(Dictionary<string, string>))]
internal partial class XPathJsonContext : JsonSerializerContext { }
