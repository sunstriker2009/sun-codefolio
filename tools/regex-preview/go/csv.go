package main

import (
	"encoding/csv"
	"encoding/json"
	"strings"
	"syscall/js"
)

func runCsv(_ js.Value, args []js.Value) any {
	reader := csv.NewReader(strings.NewReader(args[0].String()))
	reader.FieldsPerRecord = -1
	rows, err := reader.ReadAll()
	if err != nil {
		return "null"
	}
	if rows == nil {
		return "[]"
	}
	// Rows contain only strings, which encoding/json always supports.
	result, _ := json.Marshal(rows)
	return string(result)
}
