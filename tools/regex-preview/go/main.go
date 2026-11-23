package main

import (
	"regexp"
	"syscall/js"
	"unicode/utf16"
)

func runRegex(_ js.Value, args []js.Value) any {
	expression, err := regexp.Compile(args[0].String())
	if err != nil {
		return map[string]any{"status": "invalid", "message": err.Error()}
	}
	limit := args[2].Int()
	if limit == 0 {
		return map[string]any{"status": "valid"}
	}

	text := args[1].String()
	results := expression.FindAllStringSubmatchIndex(text, limit)
	if len(results) == 0 {
		return map[string]any{"status": "no-match"}
	}

	// Go uses byte offsets. The UI uses UTF-16 offsets.
	utf16Offsets := make([]int, len(text)+1)
	index := 0
	for byteIndex, r := range text {
		utf16Offsets[byteIndex] = index
		index += utf16.RuneLen(r)
	}
	utf16Offsets[len(text)] = index

	names := expression.SubexpNames()
	matches := make([]any, 0, len(results))
	for _, offsets := range results {
		groups := make([]any, len(names)-1)
		var named []any
		for group, name := range names[1:] {
			left, right := offsets[2*group+2], offsets[2*group+3]
			if left >= 0 {
				groups[group] = text[left:right]
			}
			if name != "" {
				named = append(named, map[string]any{"name": name, "value": groups[group]})
			}
		}
		matches = append(matches, map[string]any{
			"text":   text[offsets[0]:offsets[1]],
			"index":  utf16Offsets[offsets[0]],
			"groups": groups,
			"named":  named,
		})
	}
	return map[string]any{"status": "match", "matches": matches}
}

func main() {
	regex := js.FuncOf(runRegex)
	date := js.FuncOf(runDate)
	encoding := js.FuncOf(runEncoding)
	js.Global().Get("codefolioGoReady").Invoke(regex, date, encoding)
	select {}
}
