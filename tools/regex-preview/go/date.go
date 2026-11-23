package main

import (
	"syscall/js"
	"time"
)

func runDate(_ js.Value, args []js.Value) any {
	recipe, input := args[0].String(), args[1].String()
	if recipe == "parse-date" {
		date, err := time.Parse("02/01/2006", input)
		if err != nil {
			return nil
		}
		return date.Format(time.DateOnly)
	}

	instant, err := time.Parse("2006-01-02T15:04:05Z", input)
	if err != nil {
		return nil
	}
	switch recipe {
	case "format-date":
		return instant.Format(time.DateOnly)
	case "utc-to-toronto":
		zoneBytes := make([]byte, args[2].Get("byteLength").Int())
		js.CopyBytesToGo(zoneBytes, args[2])
		zone, err := time.LoadLocationFromTZData("America/Toronto", zoneBytes)
		if err != nil {
			return map[string]any{"error": "Toronto time zone data could not be loaded."}
		}
		return instant.In(zone).Format(time.RFC3339)
	default:
		return nil
	}
}
