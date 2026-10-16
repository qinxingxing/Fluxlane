package controller

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/oauth"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func performSendEmailVerification(t *testing.T, email string) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/verification?email="+url.QueryEscape(email), nil)
	SendEmailVerification(c)
	return recorder
}

func performPasswordResetEmail(t *testing.T, email string) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/reset_password?email="+url.QueryEscape(email), nil)
	SendPasswordResetEmail(c)
	return recorder
}

func TestRegisterRejectsBlockedEmailDomainFromTheAPI(t *testing.T) {
	setupRegisterTestDB(t)
	require.NoError(t, common.RegisterVerificationCodeWithKey("user@maxxspace.com", "654321", common.EmailVerificationPurpose))

	recorder := performRegister(t, `{
		"username":"blocked",
		"password":"password12",
		"email":"  User@MaxXspace.COM ",
		"phone":"+8613800138000",
		"verification_code":"654321"
	}`)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), `"success":false`)
	assert.Contains(t, recorder.Body.String(), "user.email_domain_not_supported")
	_, err := model.GetUniqueUserByEmail("user@maxxspace.com")
	assert.Error(t, err)
}

func TestRegisterAllowsADomainThatOnlyContainsTheBlockedName(t *testing.T) {
	setupRegisterTestDB(t)
	require.NoError(t, common.RegisterVerificationCodeWithKey("user@notmaxxspace.com", "654321", common.EmailVerificationPurpose))

	recorder := performRegister(t, `{
		"username":"allowed",
		"password":"password12",
		"email":" user@notmaxxspace.com ",
		"phone":"+8613800138001",
		"verification_code":"654321"
	}`)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Body.String(), `"success":true`)
	user, err := model.GetUniqueUserByEmail("user@notmaxxspace.com")
	require.NoError(t, err)
	assert.Equal(t, common.UserStatusEnabled, user.Status)
}

func TestSendEmailVerificationRejectsBlockedDomainBeforeSending(t *testing.T) {
	setupRegisterTestDB(t)
	previousServer := common.SMTPServer
	previousAccount := common.SMTPAccount
	common.SMTPServer = ""
	common.SMTPAccount = ""
	t.Cleanup(func() {
		common.SMTPServer = previousServer
		common.SMTPAccount = previousAccount
	})

	blocked := performSendEmailVerification(t, "  User@MaxXspace.COM ")
	assert.Contains(t, blocked.Body.String(), `"success":false`)
	assert.Contains(t, blocked.Body.String(), "user.email_domain_not_supported")
	valid, err := common.VerifyCodeWithKey("user@maxxspace.com", "000000", common.EmailVerificationPurpose)
	require.NoError(t, err)
	assert.False(t, valid)

	allowed := performSendEmailVerification(t, "user@notmaxxspace.com")
	assert.NotContains(t, allowed.Body.String(), "user.email_domain_not_supported")
	assert.Contains(t, allowed.Body.String(), "SMTP")
}

func TestBlockedDomainDoesNotDisableAnExistingAccount(t *testing.T) {
	setupRegisterTestDB(t)
	previousServer := common.SMTPServer
	previousAccount := common.SMTPAccount
	common.SMTPServer = ""
	common.SMTPAccount = ""
	t.Cleanup(func() {
		common.SMTPServer = previousServer
		common.SMTPAccount = previousAccount
	})
	existing := model.User{
		Username:    "existing",
		Password:    "password12",
		DisplayName: "existing",
		Email:       "old@maxxspace.com",
		Phone:       "+8613800138000",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
	}
	require.NoError(t, existing.Insert(0))

	recorder := performPasswordResetEmail(t, "old@maxxspace.com")
	assert.Contains(t, recorder.Body.String(), `"success":true`)
	assert.NotContains(t, recorder.Body.String(), "user.email_domain_not_supported")

	user, err := model.GetUniqueUserByEmail("old@maxxspace.com")
	require.NoError(t, err)
	assert.Equal(t, common.UserStatusEnabled, user.Status)
}

type registrationOAuthProvider struct {
	taken bool
	user  model.User
}

func (p *registrationOAuthProvider) GetName() string { return "Test" }
func (p *registrationOAuthProvider) IsEnabled() bool { return true }
func (p *registrationOAuthProvider) ExchangeToken(context.Context, string, *gin.Context) (*oauth.OAuthToken, error) {
	return &oauth.OAuthToken{}, nil
}
func (p *registrationOAuthProvider) GetUserInfo(context.Context, *oauth.OAuthToken) (*oauth.OAuthUser, error) {
	return nil, nil
}
func (p *registrationOAuthProvider) IsUserIDTaken(string) bool { return p.taken }
func (p *registrationOAuthProvider) FillUserByProviderID(user *model.User, _ string) error {
	*user = p.user
	return nil
}
func (p *registrationOAuthProvider) SetProviderUserID(*model.User, string) {}
func (p *registrationOAuthProvider) GetProviderPrefix() string             { return "oauth_" }

func TestOAuthAutoRegisterRejectsBlockedEmailDomain(t *testing.T) {
	setupRegisterTestDB(t)
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/oauth", nil)

	_, err := findOrCreateOAuthUser(c, &registrationOAuthProvider{}, &oauth.OAuthUser{
		ProviderUserID: "new-provider-user",
		Email:          "  User@MaxXspace.COM ",
	}, "")
	require.ErrorAs(t, err, new(*OAuthEmailDomainBlockedError))
	_, lookupErr := model.GetUniqueUserByEmail("user@maxxspace.com")
	assert.Error(t, lookupErr)

	created, err := findOrCreateOAuthUser(c, &registrationOAuthProvider{}, &oauth.OAuthUser{
		ProviderUserID: "allowed-provider-user",
		Email:          "user@notmaxxspace.com",
	}, "")
	require.NoError(t, err)
	require.NotNil(t, created)
	assert.Equal(t, "user@notmaxxspace.com", created.Email)
	assert.Equal(t, common.UserStatusEnabled, created.Status)
}

func TestOAuthLoginKeepsExistingBlockedDomainAccount(t *testing.T) {
	setupRegisterTestDB(t)
	existing := model.User{
		Username:    "oauthold",
		Password:    "password12",
		DisplayName: "oauthold",
		Email:       "old@maxxspace.com",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
	}
	require.NoError(t, existing.Insert(0))

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/oauth", nil)
	user, err := findOrCreateOAuthUser(c, &registrationOAuthProvider{
		taken: true,
		user:  existing,
	}, &oauth.OAuthUser{
		ProviderUserID: "existing-provider-user",
		Email:          "old@maxxspace.com",
	}, "")

	require.NoError(t, err)
	require.Equal(t, existing.Id, user.Id)
	stored, lookupErr := model.GetUniqueUserByEmail("old@maxxspace.com")
	require.NoError(t, lookupErr)
	assert.Equal(t, common.UserStatusEnabled, stored.Status)
}
