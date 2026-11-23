package main

import (
	"encoding/base64"
	"encoding/json"
	"net/url"
	"strings"
	"syscall/js"
)

func runEncoding(_ js.Value, args []js.Value) any {
	recipe, input := args[0].String(), args[1].String()
	switch recipe {
	case "url-component":
		return strings.ReplaceAll(url.QueryEscape(input), "+", "%20")
	case "base64-utf8":
		encoded := base64.StdEncoding.EncodeToString([]byte(input))
		decoded, err := base64.StdEncoding.DecodeString(encoded)
		if err != nil {
			return nil
		}
		return "Base64: " + encoded + "\nDecoded: " + string(decoded)
	case "json-string":
		encoded, err := json.Marshal(input)
		if err != nil {
			return nil
		}
		return string(encoded)
	default:
		return nil
	}
}
