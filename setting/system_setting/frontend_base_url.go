package system_setting

import (
	"os"
	"strings"
)

// FrontendBaseURL is the public origin of the web console. Payment providers
// redirect browsers here after checkout. ServerAddress remains the API origin
// for OAuth, webhooks, and other server-side callbacks.
var FrontendBaseURL = ""

func GetFrontendBaseURL() string {
	if base := strings.TrimRight(strings.TrimSpace(FrontendBaseURL), "/"); base != "" {
		return base
	}
	if base := strings.TrimRight(strings.TrimSpace(os.Getenv("FRONTEND_BASE_URL")), "/"); base != "" {
		return base
	}
	return strings.TrimRight(strings.TrimSpace(ServerAddress), "/")
}
