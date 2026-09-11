package system_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetFrontendBaseURLPrefersAdminOptionThenEnvThenServerAddress(t *testing.T) {
	previousFrontend := FrontendBaseURL
	previousServer := ServerAddress
	t.Cleanup(func() {
		FrontendBaseURL = previousFrontend
		ServerAddress = previousServer
	})

	ServerAddress = "https://api.fluxlane.ai/"
	FrontendBaseURL = ""
	t.Setenv("FRONTEND_BASE_URL", "")
	assert.Equal(t, "https://api.fluxlane.ai", GetFrontendBaseURL())

	t.Setenv("FRONTEND_BASE_URL", "https://console.fluxlane.ai/")
	assert.Equal(t, "https://console.fluxlane.ai", GetFrontendBaseURL())

	FrontendBaseURL = "https://console.fluxlane.ai"
	t.Setenv("FRONTEND_BASE_URL", "https://www.fluxlane.ai")
	assert.Equal(t, "https://console.fluxlane.ai", GetFrontendBaseURL())
}
