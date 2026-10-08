package common

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSendSMSRequiresConfiguration(t *testing.T) {
	restore := snapshotSMSSettings(t)
	defer restore()

	err := SendSMS("+8613800138000", "123456")
	assert.ErrorIs(t, err, ErrSMSNotConfigured)
}

func TestDeliverTencentSMSPostsTheVerificationCode(t *testing.T) {
	restore := snapshotSMSSettings(t)
	defer restore()

	SMSTencentSecretId = "secret-id"
	SMSTencentSecretKey = "secret-key"
	SMSTencentSdkAppId = "1400000000"
	SMSTencentSignName = "Fluxlane"
	SMSTencentTemplateId = "100001"
	SMSTencentRegion = "ap-guangzhou"
	smsNow = func() time.Time { return time.Unix(1_700_000_000, 0) }

	var gotBody string
	var gotAuth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		gotBody = string(body)
		gotAuth = r.Header.Get("Authorization")
		assert.Equal(t, smsTencentAction, r.Header.Get("X-TC-Action"))
		assert.Equal(t, "ap-guangzhou", r.Header.Get("X-TC-Region"))
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Response":{"SendStatusSet":[{"Code":"Ok"}],"RequestId":"req-1"}}`))
	}))
	defer server.Close()

	originalEndpoint := smsEndpoint
	originalClient := smsClient
	smsEndpoint = server.URL
	smsClient = server.Client()
	t.Cleanup(func() {
		smsEndpoint = originalEndpoint
		smsClient = originalClient
	})

	require.NoError(t, SendSMS("+8613800138000", "654321"))
	assert.Contains(t, gotBody, `"+8613800138000"`)
	assert.Contains(t, gotBody, `"654321"`)
	assert.Contains(t, gotBody, `"1400000000"`)
	assert.True(t, len(gotAuth) > 0)
	assert.Contains(t, gotAuth, "TC3-HMAC-SHA256 Credential=secret-id/")
}

func snapshotSMSSettings(t *testing.T) func() {
	t.Helper()
	secretID := SMSTencentSecretId
	secretKey := SMSTencentSecretKey
	appID := SMSTencentSdkAppId
	signName := SMSTencentSignName
	templateID := SMSTencentTemplateId
	region := SMSTencentRegion
	now := smsNow
	return func() {
		SMSTencentSecretId = secretID
		SMSTencentSecretKey = secretKey
		SMSTencentSdkAppId = appID
		SMSTencentSignName = signName
		SMSTencentTemplateId = templateID
		SMSTencentRegion = region
		smsNow = now
	}
}
