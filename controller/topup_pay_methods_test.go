package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFilterTopUpPayMethods_UsesPayMethodsAsSourceOfTruth(t *testing.T) {
	originalCompliance := operation_setting.GetPaymentSetting().ComplianceConfirmed
	originalPayMethods := operation_setting.PayMethods
	originalStripeSecret := setting.StripeApiSecret
	originalStripeWebhook := setting.StripeWebhookSecret
	originalStripePrice := setting.StripePriceId
	originalWaffoEnabled := setting.WaffoEnabled
	originalWaffoSandbox := setting.WaffoSandbox
	originalWaffoSandboxKey := setting.WaffoSandboxApiKey
	originalWaffoSandboxPrivate := setting.WaffoSandboxPrivateKey
	originalWaffoSandboxPublic := setting.WaffoSandboxPublicCert
	originalWaffoMerchant := setting.WaffoMerchantId

	t.Cleanup(func() {
		ps := operation_setting.GetPaymentSetting()
		ps.ComplianceConfirmed = originalCompliance
		operation_setting.PayMethods = originalPayMethods
		setting.StripeApiSecret = originalStripeSecret
		setting.StripeWebhookSecret = originalStripeWebhook
		setting.StripePriceId = originalStripePrice
		setting.WaffoEnabled = originalWaffoEnabled
		setting.WaffoSandbox = originalWaffoSandbox
		setting.WaffoSandboxApiKey = originalWaffoSandboxKey
		setting.WaffoSandboxPrivateKey = originalWaffoSandboxPrivate
		setting.WaffoSandboxPublicCert = originalWaffoSandboxPublic
		setting.WaffoMerchantId = originalWaffoMerchant
	})

	ps := operation_setting.GetPaymentSetting()
	ps.ComplianceConfirmed = true
	ps.ComplianceTermsVersion = operation_setting.CurrentComplianceTermsVersion

	setting.StripeApiSecret = "sk_test"
	setting.StripeWebhookSecret = "whsec_test"
	setting.StripePriceId = "price_test"
	setting.WaffoEnabled = true
	setting.WaffoSandbox = true
	setting.WaffoSandboxApiKey = "sandbox-key"
	setting.WaffoSandboxPrivateKey = "sandbox-private"
	setting.WaffoSandboxPublicCert = "sandbox-public"
	setting.WaffoMerchantId = "1000011103"

	operation_setting.PayMethods = []map[string]string{
		{"name": "Alipay", "type": "alipay"},
		{"name": "Waffo", "type": model.PaymentMethodWaffo},
	}

	methods, enableWaffo := filterTopUpPayMethods(operation_setting.PayMethods)
	require.Len(t, methods, 2)
	assert.Equal(t, "alipay", methods[0]["type"])
	assert.Equal(t, model.PaymentMethodWaffo, methods[1]["type"])
	assert.True(t, enableWaffo)

	operation_setting.PayMethods = []map[string]string{
		{"name": "Alipay", "type": "alipay"},
	}
	methods, enableWaffo = filterTopUpPayMethods(operation_setting.PayMethods)
	require.Len(t, methods, 1)
	assert.Equal(t, "alipay", methods[0]["type"])
	assert.False(t, enableWaffo, "Stripe credentials must not re-inject Stripe or enable Waffo when not listed")

	for _, method := range methods {
		assert.NotEqual(t, "stripe", method["type"])
	}
}
