package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/stretchr/testify/assert"
)

func TestPaymentReturnPathUsesFrontendOriginNotServerAddress(t *testing.T) {
	previousFrontend := system_setting.FrontendBaseURL
	previousServer := system_setting.ServerAddress
	t.Cleanup(func() {
		system_setting.FrontendBaseURL = previousFrontend
		system_setting.ServerAddress = previousServer
	})

	system_setting.ServerAddress = "https://api.fluxlane.ai"
	system_setting.FrontendBaseURL = "https://console.fluxlane.ai"
	t.Setenv("FRONTEND_BASE_URL", "")

	assert.Equal(
		t,
		"https://console.fluxlane.ai/wallet?pay=success",
		paymentReturnPath("/wallet?pay=success"),
	)
	assert.Equal(
		t,
		"https://console.fluxlane.ai/usage-logs",
		paymentReturnPath("/usage-logs"),
	)
}
