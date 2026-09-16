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

	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/service"
)

type fakeLeadCreator struct {
	inquiry dto.SalesInquiry
	called  bool
	err     error
}

func (f *fakeLeadCreator) CreateLead(_ context.Context, inquiry dto.SalesInquiry) error {
	f.called = true
	f.inquiry = inquiry
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
		assert.Equal(t, "Fluxlane", fake.inquiry.Company)
		assert.Equal(t, dto.SalesInquiryBudget1000To5000, fake.inquiry.MonthlyBudget)
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
