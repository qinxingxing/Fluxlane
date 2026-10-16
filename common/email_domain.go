package common

import "strings"

// NormalizeEmailDomainList parses a comma- or newline-separated domain list.
// Each domain is trimmed and lowercased. Matching is exact, so maxxspace.com
// does not include notmaxxspace.com.
func NormalizeEmailDomainList(value string) []string {
	parts := strings.FieldsFunc(value, func(r rune) bool {
		return r == ',' || r == '\n' || r == '\r'
	})
	seen := make(map[string]struct{}, len(parts))
	domains := make([]string, 0, len(parts))
	for _, part := range parts {
		domain := strings.ToLower(strings.TrimSpace(part))
		if domain == "" {
			continue
		}
		if _, ok := seen[domain]; ok {
			continue
		}
		seen[domain] = struct{}{}
		domains = append(domains, domain)
	}
	return domains
}

func registrationEmailDomain(email string) (string, bool) {
	parts := strings.Split(strings.TrimSpace(email), "@")
	if len(parts) != 2 {
		return "", false
	}
	local := strings.TrimSpace(parts[0])
	domain := strings.ToLower(strings.TrimSpace(parts[1]))
	if local == "" || domain == "" {
		return "", false
	}
	return domain, true
}

// IsRegistrationEmailDomainBlocked reports whether a new registration must be
// rejected. The address is trimmed, then the domain is lowercased and compared
// exactly with EmailDomainBlacklist. Existing accounts are not affected.
func IsRegistrationEmailDomainBlocked(email string) bool {
	domain, ok := registrationEmailDomain(email)
	if !ok {
		return false
	}
	for _, blocked := range EmailDomainBlacklist {
		if strings.ToLower(strings.TrimSpace(blocked)) == domain {
			return true
		}
	}
	return false
}
