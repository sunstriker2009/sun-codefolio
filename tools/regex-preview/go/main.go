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
	if args[2].Bool() {
		return map[string]any{"status": "valid"}
	}

	text := args[1].String()
	offsets := expression.FindStringSubmatchIndex(text)
	if offsets == nil {
		return map[string]any{"status": "no-match"}
	}

	start, end := offsets[0], offsets[1]
	// Go indexes the UTF-8 string in bytes. The UI uses UTF-16 code units.
	index := 0
	for _, r := range text[:start] {
		index += utf16.RuneLen(r)
	}
	groups := make([]any, len(offsets)/2-1)
	for group := range groups {
		left, right := offsets[2*group+2], offsets[2*group+3]
		if left >= 0 {
			groups[group] = text[left:right]
		}
	}
	return map[string]any{
		"status": "match",
		"text":   text[start:end],
		"index":  index,
		"groups": groups,
	}
}

func main() {
	run := js.FuncOf(runRegex)
	js.Global().Get("codefolioGoRegexReady").Invoke(run)
	select {}
}
