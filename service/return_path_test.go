package service

import (
	"testing"

	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/stretchr/testify/assert"
)

func TestPaymentReturnURLUsesFrontendBaseURL(t *testing.T) {
	previousFrontend := system_setting.FrontendBaseURL
	previousServer := system_setting.ServerAddress
	t.Cleanup(func() {
		system_setting.FrontendBaseURL = previousFrontend
		system_setting.ServerAddress = previousServer
	})

	system_setting.ServerAddress = "https://api.fluxlane.ai"
	system_setting.FrontendBaseURL = "https://console.fluxlane.ai/"
	t.Setenv("FRONTEND_BASE_URL", "")

	assert.Equal(t, "https://console.fluxlane.ai/wallet", PaymentReturnURL("/wallet"))
	assert.Equal(t, "https://console.fluxlane.ai/usage-logs", PaymentReturnURL("/usage-logs"))
}

func TestGetCallbackAddressStaysOnServerAddress(t *testing.T) {
	previousFrontend := system_setting.FrontendBaseURL
	previousServer := system_setting.ServerAddress
	previousCallback := operation_setting.CustomCallbackAddress
	t.Cleanup(func() {
		system_setting.FrontendBaseURL = previousFrontend
		system_setting.ServerAddress = previousServer
		operation_setting.CustomCallbackAddress = previousCallback
	})

	system_setting.ServerAddress = "https://api.fluxlane.ai"
	system_setting.FrontendBaseURL = "https://console.fluxlane.ai"
	operation_setting.CustomCallbackAddress = ""
	t.Setenv("FRONTEND_BASE_URL", "https://console.fluxlane.ai")

	assert.Equal(t, "https://api.fluxlane.ai", GetCallbackAddress())
	assert.Equal(t, "https://console.fluxlane.ai/wallet", PaymentReturnURL("/wallet"))
}
