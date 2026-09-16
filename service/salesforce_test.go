package service

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
)

func TestNormalizeSalesInquiry(t *testing.T) {
	valid := dto.SalesInquiryRequest{
		Company:        "Fluxlane",
		Email:          "ops@example.com",
		Phone:          "+86 138 0013 8000",
		RequestedModel: "GPT-4o, Claude",
		MonthlyBudget:  dto.SalesInquiryBudget1000To5000,
		Description:    "Need an OpenAI-compatible gateway.",
	}

	t.Run("accepts a complete inquiry", func(t *testing.T) {
		inquiry, err := NormalizeSalesInquiry(valid)
		require.NoError(t, err)
		assert.Equal(t, "Fluxlane", inquiry.Company)
		assert.Equal(t, "ops@example.com", inquiry.Email)
		assert.Equal(t, dto.SalesInquiryBudget1000To5000, inquiry.MonthlyBudget)
	})

	t.Run("trims whitespace and allows an empty description", func(t *testing.T) {
		req := valid
		req.Company = "  Fluxlane  "
		req.Description = "   "
		inquiry, err := NormalizeSalesInquiry(req)
		require.NoError(t, err)
		assert.Equal(t, "Fluxlane", inquiry.Company)
		assert.Equal(t, "", inquiry.Description)
	})

	t.Run("rejects missing or invalid fields", func(t *testing.T) {
		cases := []dto.SalesInquiryRequest{
			func() dto.SalesInquiryRequest { r := valid; r.Company = ""; return r }(),
			func() dto.SalesInquiryRequest { r := valid; r.Email = "not-an-email"; return r }(),
			func() dto.SalesInquiryRequest { r := valid; r.Phone = "123"; return r }(),
			func() dto.SalesInquiryRequest { r := valid; r.RequestedModel = ""; return r }(),
			func() dto.SalesInquiryRequest { r := valid; r.MonthlyBudget = "5000-2000"; return r }(),
			func() dto.SalesInquiryRequest {
				r := valid
				r.Description = strings.Repeat("x", dto.MaxSalesInquiryDescriptionLen+1)
				return r
			}(),
		}
		for _, req := range cases {
			_, err := NormalizeSalesInquiry(req)
			assert.Error(t, err)
			assert.True(t, IsSalesInquiryInvalid(err))
		}
	})
}

func TestIsSalesInquiryHoneypot(t *testing.T) {
	assert.False(t, IsSalesInquiryHoneypot(dto.SalesInquiryRequest{}))
	assert.True(t, IsSalesInquiryHoneypot(dto.SalesInquiryRequest{Website: "https://spam.example"}))
}

func TestLeadRecordMapsUsecaseField(t *testing.T) {
	inquiry := dto.SalesInquiry{
		Company:        "Fluxlane",
		Email:          "ops@example.com",
		Phone:          "+14155552671",
		RequestedModel: "Claude 4",
		MonthlyBudget:  dto.SalesInquiryBudget20000Plus,
		Description:    "Enterprise volume",
	}
	record := leadRecord(inquiry, salesforceConfig{LeadSource: "Website"})
	assert.Equal(t, "Fluxlane", record["LastName"])
	assert.Equal(t, "Fluxlane", record["Company"])
	assert.Equal(t, "ops@example.com", record["Email"])
	assert.Equal(t, "+14155552671", record["Phone"])
	assert.Equal(t, "Website", record["LeadSource"])
	assert.Equal(
		t,
		"月度预算：More than $20,000\n需求模型：Claude 4\n需求详细描述：Enterprise volume",
		record["usecase__c"],
	)
	_, hasDescription := record["Description"]
	assert.False(t, hasDescription)
}

func TestLeadUsecaseOmitsEmptyDescription(t *testing.T) {
	got := leadUsecase(dto.SalesInquiry{
		RequestedModel: "GPT-4o",
		MonthlyBudget:  dto.SalesInquiryBudget0To1000,
	})
	assert.Equal(t, "月度预算：$0 – $1,000\n需求模型：GPT-4o", got)
}

func TestSalesforceClientCreateLeadREST(t *testing.T) {
	key := mustRSAKey(t)
	var gotAuth string
	var gotBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		switch r.URL.Path {
		case "/services/oauth2/token":
			assert.Equal(t, http.MethodPost, r.Method)
			assert.Equal(t, "application/x-www-form-urlencoded", r.Header.Get("Content-Type"))
			values, err := url.ParseQuery(string(body))
			require.NoError(t, err)
			assert.Equal(t, "urn:ietf:params:oauth:grant-type:jwt-bearer", values.Get("grant_type"))
			assert.NotEmpty(t, values.Get("assertion"))
			w.Header().Set("Content-Type", "application/json")
			payload, err := common.Marshal(map[string]any{
				"access_token": "token-1",
				"instance_url": "http://" + r.Host,
				"expires_in":   7200,
			})
			require.NoError(t, err)
			_, _ = w.Write(payload)
		case "/services/data/v61.0/sobjects/Lead/":
			assert.Equal(t, http.MethodPost, r.Method)
			gotAuth = r.Header.Get("Authorization")
			require.NoError(t, common.Unmarshal(body, &gotBody))
			w.WriteHeader(http.StatusCreated)
			created, err := common.Marshal(map[string]any{"id": "00Qxx0000000001", "success": true})
			require.NoError(t, err)
			_, _ = w.Write(created)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(server.Close)

	client := &SalesforceClient{
		httpClient: server.Client(),
		now:        time.Now,
		config: salesforceConfig{
			ConsumerKey: "consumer",
			JWTUsername: "user@example.com",
			JWTAudience: server.URL,
			PrivateKey:  key,
			APIVersion:  defaultSalesforceAPIVersion,
			LeadSource:  defaultSalesforceLeadSource,
		},
	}
	err := client.CreateLead(context.Background(), dto.SalesInquiry{
		Company:        "Fluxlane",
		Email:          "ops@example.com",
		Phone:          "+14155552671",
		RequestedModel: "GPT-4o",
		MonthlyBudget:  dto.SalesInquiryBudget0To1000,
	})
	require.NoError(t, err)
	assert.Equal(t, "Bearer token-1", gotAuth)
	assert.Equal(t, "Fluxlane", gotBody["Company"])
	assert.Equal(t, "ops@example.com", gotBody["Email"])
	assert.Equal(
		t,
		"月度预算：$0 – $1,000\n需求模型：GPT-4o",
		gotBody["usecase__c"],
	)
	_, hasDescription := gotBody["Description"]
	assert.False(t, hasDescription)
}

func TestSalesforceClientCreateLeadWebToLead(t *testing.T) {
	var got url.Values
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		values, err := url.ParseQuery(string(body))
		require.NoError(t, err)
		got = values
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	}))
	t.Cleanup(server.Close)

	client := &SalesforceClient{
		httpClient: server.Client(),
		now:        time.Now,
		config: salesforceConfig{
			LeadSource:            defaultSalesforceLeadSource,
			WebToLeadOID:          "00Dxx0000000001",
			WebToLeadURL:          server.URL,
			WebToLeadUsecaseField: "00Nusecase",
		},
	}
	err := client.CreateLead(context.Background(), dto.SalesInquiry{
		Company:        "Fluxlane",
		Email:          "ops@example.com",
		Phone:          "+14155552671",
		RequestedModel: "Gemini",
		MonthlyBudget:  dto.SalesInquiryBudget5000To20000,
		Description:    "Batch jobs",
	})
	require.NoError(t, err)
	assert.Equal(t, "00Dxx0000000001", got.Get("oid"))
	assert.Equal(t, "Fluxlane", got.Get("company"))
	assert.Equal(t, "ops@example.com", got.Get("email"))
	assert.Equal(
		t,
		"月度预算：$5,000 – $20,000\n需求模型：Gemini\n需求详细描述：Batch jobs",
		got.Get("00Nusecase"),
	)
	assert.Empty(t, got.Get("description"))
}

func TestNormalizeSalesforceLoginURL(t *testing.T) {
	assert.Equal(
		t,
		"https://aidroplet.my.salesforce.cn",
		normalizeSalesforceLoginURL("https://aidroplet.lightning.sfcrmapps.cn/"),
	)
	assert.Equal(
		t,
		"https://acme.my.salesforce.com",
		normalizeSalesforceLoginURL("acme.lightning.force.com"),
	)
	assert.Equal(
		t,
		"https://login.salesforce.cn",
		normalizeSalesforceLoginURL("https://login.salesforce.cn/"),
	)
}

func TestNewSalesforceClientFromEnvClientCredentials(t *testing.T) {
	t.Setenv("SALESFORCE_CONSUMER_KEY", "consumer")
	t.Setenv("SALESFORCE_CLIENT_SECRET", "secret")
	t.Setenv("SALESFORCE_ORG_URL", "https://aidroplet.lightning.sfcrmapps.cn/")
	t.Setenv("SALESFORCE_JWT_USERNAME", "")
	t.Setenv("SALESFORCE_JWT_PRIVATE_KEY", "")
	t.Setenv("SALESFORCE_JWT_PRIVATE_KEY_BASE64", "")
	t.Setenv("SALESFORCE_WEB_TO_LEAD_OID", "")
	client, err := NewSalesforceClientFromEnv()
	require.NoError(t, err)
	assert.True(t, client.config.clientCredentialsConfigured())
	assert.Equal(t, "https://aidroplet.my.salesforce.cn", client.config.LoginURL)
	assert.Equal(t, defaultSalesforceUsecaseField, client.config.UsecaseField)
}

func TestSalesforceClientCreateLeadClientCredentials(t *testing.T) {
	var grant string
	var gotBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		switch r.URL.Path {
		case "/services/oauth2/token":
			values, err := url.ParseQuery(string(body))
			require.NoError(t, err)
			grant = values.Get("grant_type")
			assert.Equal(t, "consumer", values.Get("client_id"))
			assert.Equal(t, "secret", values.Get("client_secret"))
			w.Header().Set("Content-Type", "application/json")
			payload, err := common.Marshal(map[string]any{
				"access_token": "token-cc",
				"instance_url": "http://" + r.Host,
				"expires_in":   3600,
			})
			require.NoError(t, err)
			_, _ = w.Write(payload)
		case "/services/data/v61.0/sobjects/Lead/":
			require.NoError(t, common.Unmarshal(body, &gotBody))
			w.WriteHeader(http.StatusCreated)
			created, err := common.Marshal(map[string]any{"id": "00Qxx0000000002", "success": true})
			require.NoError(t, err)
			_, _ = w.Write(created)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(server.Close)

	client := &SalesforceClient{
		httpClient: server.Client(),
		now:        time.Now,
		config: salesforceConfig{
			ConsumerKey:  "consumer",
			ClientSecret: "secret",
			LoginURL:     server.URL,
			APIVersion:   defaultSalesforceAPIVersion,
			LeadSource:   defaultSalesforceLeadSource,
		},
	}
	err := client.CreateLead(context.Background(), dto.SalesInquiry{
		Company:        "Fluxlane",
		Email:          "ops@example.com",
		Phone:          "+14155552671",
		RequestedModel: "GPT-4o",
		MonthlyBudget:  dto.SalesInquiryBudget1000To5000,
		Description:    "Need a gateway",
	})
	require.NoError(t, err)
	assert.Equal(t, "client_credentials", grant)
	assert.Equal(
		t,
		"月度预算：$1,000 – $5,000\n需求模型：GPT-4o\n需求详细描述：Need a gateway",
		gotBody["usecase__c"],
	)
}

func mustRSAKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	return key
}
