import json
from io import BytesIO
from math import isinf, isnan
from lxml import etree

MAX_RESULTS = 100
MAX_NODE_PREVIEW = 1200


def describe_node(node):
    name = ""
    if isinstance(node, etree._Comment):
        kind, value = "comment", node.text or ""
    elif isinstance(node, etree._ProcessingInstruction):
        kind, name, value = "processing-instruction", node.target, node.text or ""
    elif isinstance(node, etree._Element):
        kind, name = "element", etree.QName(node).localname
        value = etree.tostring(node, encoding="unicode", with_tail=False)
    elif isinstance(node, tuple):
        kind, name, value = "namespace", node[0] or "", node[1]
    elif getattr(node, "is_attribute", False):
        kind, name, value = "attribute", node.attrname.rsplit("}", 1)[-1], str(node)
    else:
        kind, value = "text", str(node)
    if len(value) > MAX_NODE_PREVIEW:
        value = value[:MAX_NODE_PREVIEW] + "…"
    return {"kind": kind, "name": name, "value": value}


def codefolio_xpath(xml, query, bindings):
    try:
        parser = etree.XMLParser(encoding="UTF-8", resolve_entities=False, load_dtd=False, no_network=True)
        document = etree.parse(BytesIO(xml.encode("utf-8")), parser)
        if document.docinfo.doctype:
            return json.dumps({"status": "invalid", "message": "DOCTYPE declarations are disabled."})
        result = document.xpath(query, namespaces=json.loads(bindings), regexp=False)
    except etree.XMLSyntaxError as error:
        return json.dumps({"status": "invalid", "message": "XML error. " + str(error)})
    except (etree.XPathError, ValueError) as error:
        return json.dumps({"status": "invalid", "message": "XPath error. " + str(error)})

    if isinstance(result, list):
        return json.dumps({
            "status": "nodes",
            "nodes": [describe_node(node) for node in result[:MAX_RESULTS]],
            "truncated": len(result) > MAX_RESULTS,
        })
    if isinstance(result, bool):
        kind, value = "boolean", "true" if result else "false"
    elif isinstance(result, float):
        kind = "number"
        if isnan(result):
            value = "NaN"
        elif isinf(result):
            value = "Infinity" if result > 0 else "-Infinity"
        else:
            value = str(int(result)) if result.is_integer() else str(result)
    else:
        kind, value = "string", str(result)
    return json.dumps({"status": "scalar", "kind": kind, "value": value})
