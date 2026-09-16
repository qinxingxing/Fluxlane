package controller

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
)

type fakeLeadCreator struct {
	lead   service.SalesforceLead
	called bool
	err    error
}

func (f *fakeLeadCreator) CreateLead(_ context.Context, lead service.SalesforceLead) error {
	f.called = true
	f.lead = lead
	return f.err
}

func TestSubmitSalesInquiry(t *testing.T) {
	require.NoError(t, i18n.Init())
	gin.SetMode(gin.TestMode)
	validBody := `{
		"company":"Fluxlane",
		"email":"ops@example.com",
		"phone":"+14155552671",
		"requested_model":"GPT-4o",
		"monthly_budget":"1000-5000",
		"description":"Need a gateway"
	}`

	t.Run("creates a Salesforce lead", func(t *testing.T) {
		fake := &fakeLeadCreator{}
		t.Cleanup(installLeadCreator(fake, nil))
		recorder := performSalesInquiry(t, validBody)
		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Contains(t, recorder.Body.String(), `"success":true`)
		assert.True(t, fake.called)
		assert.Equal(t, "Fluxlane", fake.lead.Company)
		assert.Equal(t, "ops@example.com", fake.lead.Email)
		assert.Contains(t, fake.lead.Usecase, "月度预算：$1,000 – $5,000")
	})

	t.Run("silently accepts a honeypot submission", func(t *testing.T) {
		fake := &fakeLeadCreator{}
		t.Cleanup(installLeadCreator(fake, nil))
		body := `{
			"company":"Spam Co",
			"email":"bot@example.com",
			"phone":"+14155552671",
			"requested_model":"GPT-4o",
			"monthly_budget":"0-1000",
			"website":"https://spam.example"
		}`
		recorder := performSalesInquiry(t, body)
		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Contains(t, recorder.Body.String(), `"success":true`)
		assert.False(t, fake.called)
	})

	t.Run("rejects an invalid budget", func(t *testing.T) {
		fake := &fakeLeadCreator{}
		t.Cleanup(installLeadCreator(fake, nil))
		body := `{
			"company":"Fluxlane",
			"email":"ops@example.com",
			"phone":"+14155552671",
			"requested_model":"GPT-4o",
			"monthly_budget":"5000-2000"
		}`
		recorder := performSalesInquiry(t, body)
		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Contains(t, recorder.Body.String(), `"success":false`)
		assert.False(t, fake.called)
	})

	t.Run("reports when Salesforce is not configured", func(t *testing.T) {
		t.Cleanup(installLeadCreator(nil, service.ErrSalesforceUnconfigured))
		recorder := performSalesInquiry(t, validBody)
		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Contains(t, recorder.Body.String(), `"success":false`)
	})
}

func performSalesInquiry(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/sales-inquiry", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	SubmitSalesInquiry(c)
	return recorder
}

func TestEnqueueRegistrationSalesforceLead(t *testing.T) {
	previous := enqueueSalesforceLead
	t.Cleanup(func() { enqueueSalesforceLead = previous })
	var got service.SalesforceLead
	var called bool
	enqueueSalesforceLead = func(lead service.SalesforceLead) {
		called = true
		got = lead
	}

	enqueueRegistrationSalesforceLead(nil)
	assert.False(t, called)

	enqueueRegistrationSalesforceLead(&model.User{
		Username:    "alice",
		Email:       "alice@example.com",
		DisplayName: "Alice",
	})
	assert.True(t, called)
	assert.Equal(t, "alice", got.Company)
	assert.Equal(t, "alice@example.com", got.Email)
	assert.Equal(t, "注册用户名：alice\n显示名称：Alice", got.Usecase)
}

func installLeadCreator(fake *fakeLeadCreator, createErr error) func() {
	previous := newSalesforceLeadCreator
	newSalesforceLeadCreator = func() (salesforceLeadCreator, error) {
		if createErr != nil {
			return nil, createErr
		}
		return fake, nil
	}
	return func() { newSalesforceLeadCreator = previous }
}
