package common

import "strings"

const PublicBrandNameDefault = "Fluxlane"
const PublicDocsLinkDefault = "https://doc.fluxlane.ai"

func isUpstreamProductName(value string) bool {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, " ", "")
	normalized = strings.ReplaceAll(normalized, "-", "")
	normalized = strings.ReplaceAll(normalized, "_", "")
	return normalized == "newapi" || normalized == "newapi.ai" || normalized == "newapiconsole"
}

// PublicBrandName is the name shown on www/console chrome and Passkey prompts.
func PublicBrandName(name string) string {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" || isUpstreamProductName(trimmed) {
		return PublicBrandNameDefault
	}
	folded := strings.ToLower(trimmed)
	if folded == "fluxlane.ai" || folded == "flux lane.ai" {
		return "Fluxlane.ai"
	}
	if folded == "fluxlane" || folded == "flux lane" {
		return PublicBrandNameDefault
	}
	replaced := strings.ReplaceAll(trimmed, "FluxLane", "Fluxlane")
	return strings.ReplaceAll(replaced, "Flux Lane", "Fluxlane")
}

// PublicDocsLink drops leftover New API documentation hosts.
func PublicDocsLink(link string) string {
	trimmed := strings.TrimSpace(link)
	if trimmed == "" {
		return PublicDocsLinkDefault
	}
	lower := strings.ToLower(trimmed)
	if strings.Contains(lower, "newapi.pro") || strings.Contains(lower, "newapi.ai") || strings.Contains(lower, "docs.newapi") {
		return PublicDocsLinkDefault
	}
	return trimmed
}
