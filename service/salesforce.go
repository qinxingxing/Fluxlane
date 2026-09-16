package service

import (
	"bytes"
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/i18n"
)

const (
	defaultSalesforceAPIVersion   = "v61.0"
	defaultSalesforceLeadSource   = "Website"
	defaultSalesforceUsecaseField = "usecase__c"
	defaultSalesforceWebToLeadURL = "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8"
	salesforceHTTPTimeout         = 15 * time.Second
	salesforceJWTValidity         = 3 * time.Minute
	salesforceTokenExpirySkew     = 2 * time.Minute
	salesforceMaxResponseBody     = 1 << 20
)

var (
	errSalesInquiryInvalid    = errors.New(i18n.MsgInvalidParams)
	ErrSalesforceUnconfigured = errors.New("salesforce is not configured")
	errSalesforceSyncFailed   = errors.New("salesforce sync failed")
)

type salesforceConfig struct {
	ConsumerKey           string
	ClientSecret          string
	LoginURL              string
	JWTUsername           string
	JWTAudience           string
	PrivateKey            *rsa.PrivateKey
	APIVersion            string
	LeadSource            string
	UsecaseField          string
	WebToLeadOID          string
	WebToLeadURL          string
	WebToLeadUsecaseField string
}

type SalesforceClient struct {
	httpClient *http.Client
	config     salesforceConfig
	now        func() time.Time

	tokenMu     sync.Mutex
	accessToken string
	instanceURL string
	tokenExpiry time.Time
}

func NewSalesforceClientFromEnv() (*SalesforceClient, error) {
	cfg, err := loadSalesforceConfigFromEnv()
	if err != nil {
		return nil, err
	}
	if !cfg.configured() {
		return nil, ErrSalesforceUnconfigured
	}
	return &SalesforceClient{
		httpClient: &http.Client{Timeout: salesforceHTTPTimeout},
		config:     cfg,
		now:        time.Now,
	}, nil
}

func (c *SalesforceClient) CreateLead(ctx context.Context, inquiry dto.SalesInquiry) error {
	if c == nil || !c.config.configured() {
		return ErrSalesforceUnconfigured
	}
	if c.config.restConfigured() {
		return c.createLeadREST(ctx, inquiry)
	}
	return c.createLeadWebToLead(ctx, inquiry)
}

func NormalizeSalesInquiry(req dto.SalesInquiryRequest) (dto.SalesInquiry, error) {
	inquiry := dto.SalesInquiry{
		Company:        strings.TrimSpace(req.Company),
		Email:          strings.TrimSpace(req.Email),
		Phone:          strings.TrimSpace(req.Phone),
		RequestedModel: strings.TrimSpace(req.RequestedModel),
		MonthlyBudget:  strings.TrimSpace(req.MonthlyBudget),
		Description:    strings.TrimSpace(req.Description),
	}
	if inquiry.Company == "" || len(inquiry.Company) > dto.MaxSalesInquiryCompanyLen {
		return dto.SalesInquiry{}, errSalesInquiryInvalid
	}
	if inquiry.Email == "" || len(inquiry.Email) > dto.MaxSalesInquiryEmailLen {
		return dto.SalesInquiry{}, errSalesInquiryInvalid
	}
	if _, err := mail.ParseAddress(inquiry.Email); err != nil {
		return dto.SalesInquiry{}, errSalesInquiryInvalid
	}
	if !validSalesInquiryPhone(inquiry.Phone) {
		return dto.SalesInquiry{}, errSalesInquiryInvalid
	}
	if inquiry.RequestedModel == "" || len(inquiry.RequestedModel) > dto.MaxSalesInquiryModelLen {
		return dto.SalesInquiry{}, errSalesInquiryInvalid
	}
	if !validSalesInquiryBudget(inquiry.MonthlyBudget) {
		return dto.SalesInquiry{}, errSalesInquiryInvalid
	}
	if len(inquiry.Description) > dto.MaxSalesInquiryDescriptionLen {
		return dto.SalesInquiry{}, errSalesInquiryInvalid
	}
	return inquiry, nil
}

func IsSalesInquiryHoneypot(req dto.SalesInquiryRequest) bool {
	return strings.TrimSpace(req.Website) != ""
}

func leadRecord(inquiry dto.SalesInquiry, cfg salesforceConfig) map[string]any {
	return map[string]any{
		"LastName":            truncateRunes(inquiry.Company, 80),
		"Company":             inquiry.Company,
		"Email":               inquiry.Email,
		"Phone":               inquiry.Phone,
		"LeadSource":          cfg.LeadSource,
		leadUsecaseField(cfg): leadUsecase(inquiry),
	}
}

func (c *SalesforceClient) createLeadREST(ctx context.Context, inquiry dto.SalesInquiry) error {
	accessToken, instanceURL, err := c.getAccessToken(ctx)
	if err != nil {
		common.SysError("salesforce token: " + err.Error())
		return errSalesforceSyncFailed
	}
	payload, err := common.Marshal(leadRecord(inquiry, c.config))
	if err != nil {
		return errSalesforceSyncFailed
	}
	endpoint := strings.TrimRight(instanceURL, "/") + "/services/data/" + c.config.APIVersion + "/sobjects/Lead/"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return errSalesforceSyncFailed
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		common.SysError("salesforce lead create: " + err.Error())
		return errSalesforceSyncFailed
	}
	defer resp.Body.Close()
	body, _ := readLimitedBody(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		common.SysError(fmt.Sprintf("salesforce lead create status %d: %s", resp.StatusCode, truncateForLog(body)))
		return errSalesforceSyncFailed
	}
	return nil
}

func (c *SalesforceClient) createLeadWebToLead(ctx context.Context, inquiry dto.SalesInquiry) error {
	values := url.Values{}
	values.Set("oid", c.config.WebToLeadOID)
	values.Set("last_name", truncateRunes(inquiry.Company, 80))
	values.Set("company", inquiry.Company)
	values.Set("email", inquiry.Email)
	values.Set("phone", inquiry.Phone)
	values.Set("lead_source", c.config.LeadSource)
	values.Set(webToLeadUsecaseField(c.config), leadUsecase(inquiry))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.config.WebToLeadURL, strings.NewReader(values.Encode()))
	if err != nil {
		return errSalesforceSyncFailed
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		common.SysError("salesforce web-to-lead: " + err.Error())
		return errSalesforceSyncFailed
	}
	defer resp.Body.Close()
	_, _ = readLimitedBody(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		common.SysError(fmt.Sprintf("salesforce web-to-lead status %d", resp.StatusCode))
		return errSalesforceSyncFailed
	}
	return nil
}

type salesforceTokenResponse struct {
	AccessToken      string `json:"access_token"`
	InstanceURL      string `json:"instance_url"`
	TokenType        string `json:"token_type"`
	ExpiresIn        int    `json:"expires_in"`
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

func (c *SalesforceClient) getAccessToken(ctx context.Context) (string, string, error) {
	now := c.now()
	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()
	if c.accessToken != "" && now.Add(salesforceTokenExpirySkew).Before(c.tokenExpiry) {
		return c.accessToken, c.instanceURL, nil
	}
	form, tokenURL, err := c.tokenRequest()
	if err != nil {
		return "", "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, err := readLimitedBody(resp.Body)
	if err != nil {
		return "", "", err
	}
	var token salesforceTokenResponse
	if err := common.Unmarshal(body, &token); err != nil {
		return "", "", err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 || token.AccessToken == "" || token.InstanceURL == "" {
		if token.Error != "" {
			if token.ErrorDescription != "" {
				return "", "", fmt.Errorf("token exchange: %s (%s)", token.Error, token.ErrorDescription)
			}
			return "", "", fmt.Errorf("token exchange: %s", token.Error)
		}
		return "", "", fmt.Errorf("token exchange status %d", resp.StatusCode)
	}
	c.accessToken = token.AccessToken
	c.instanceURL = token.InstanceURL
	expiresIn := token.ExpiresIn
	if expiresIn <= 0 {
		expiresIn = 7200
	}
	c.tokenExpiry = now.Add(time.Duration(expiresIn) * time.Second)
	return c.accessToken, c.instanceURL, nil
}

func (c *SalesforceClient) tokenRequest() (url.Values, string, error) {
	form := url.Values{}
	if c.config.jwtConfigured() {
		assertion, err := c.signedJWT(c.now())
		if err != nil {
			return nil, "", err
		}
		form.Set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
		form.Set("assertion", assertion)
		return form, strings.TrimRight(c.config.JWTAudience, "/") + "/services/oauth2/token", nil
	}
	if c.config.clientCredentialsConfigured() {
		form.Set("grant_type", "client_credentials")
		form.Set("client_id", c.config.ConsumerKey)
		form.Set("client_secret", c.config.ClientSecret)
		return form, strings.TrimRight(c.config.LoginURL, "/") + "/services/oauth2/token", nil
	}
	return nil, "", ErrSalesforceUnconfigured
}

func (c *SalesforceClient) signedJWT(now time.Time) (string, error) {
	claims := jwt.MapClaims{
		"iss": c.config.ConsumerKey,
		"sub": c.config.JWTUsername,
		"aud": c.config.JWTAudience,
		"exp": now.Add(salesforceJWTValidity).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(c.config.PrivateKey)
}

func loadSalesforceConfigFromEnv() (salesforceConfig, error) {
	loginURL := strings.TrimSpace(os.Getenv("SALESFORCE_LOGIN_URL"))
	if loginURL == "" {
		loginURL = strings.TrimSpace(os.Getenv("SALESFORCE_ORG_URL"))
	}
	cfg := salesforceConfig{
		ConsumerKey:           strings.TrimSpace(os.Getenv("SALESFORCE_CONSUMER_KEY")),
		ClientSecret:          strings.TrimSpace(os.Getenv("SALESFORCE_CLIENT_SECRET")),
		LoginURL:              normalizeSalesforceLoginURL(loginURL),
		JWTUsername:           strings.TrimSpace(os.Getenv("SALESFORCE_JWT_USERNAME")),
		JWTAudience:           strings.TrimSpace(common.GetEnvOrDefaultString("SALESFORCE_JWT_AUDIENCE", "https://login.salesforce.com")),
		APIVersion:            strings.TrimSpace(common.GetEnvOrDefaultString("SALESFORCE_API_VERSION", defaultSalesforceAPIVersion)),
		LeadSource:            strings.TrimSpace(common.GetEnvOrDefaultString("SALESFORCE_LEAD_SOURCE", defaultSalesforceLeadSource)),
		UsecaseField:          strings.TrimSpace(common.GetEnvOrDefaultString("SALESFORCE_FIELD_USECASE", defaultSalesforceUsecaseField)),
		WebToLeadOID:          strings.TrimSpace(os.Getenv("SALESFORCE_WEB_TO_LEAD_OID")),
		WebToLeadURL:          strings.TrimSpace(common.GetEnvOrDefaultString("SALESFORCE_WEB_TO_LEAD_URL", defaultSalesforceWebToLeadURL)),
		WebToLeadUsecaseField: strings.TrimSpace(common.GetEnvOrDefaultString("SALESFORCE_WEB_TO_LEAD_FIELD_USECASE", defaultSalesforceUsecaseField)),
	}
	keyMaterial := strings.TrimSpace(os.Getenv("SALESFORCE_JWT_PRIVATE_KEY_BASE64"))
	if keyMaterial == "" {
		keyMaterial = strings.TrimSpace(os.Getenv("SALESFORCE_JWT_PRIVATE_KEY"))
	}
	if keyMaterial != "" {
		privateKey, err := parseRSAPrivateKey(keyMaterial)
		if err != nil {
			return salesforceConfig{}, fmt.Errorf("salesforce private key: %w", err)
		}
		cfg.PrivateKey = privateKey
	}
	jwtIntent := cfg.JWTUsername != "" || cfg.PrivateKey != nil
	if jwtIntent && !cfg.jwtConfigured() {
		return salesforceConfig{}, fmt.Errorf("salesforce JWT configuration is incomplete")
	}
	clientIntent := cfg.ClientSecret != "" || (cfg.ConsumerKey != "" && !jwtIntent && cfg.WebToLeadOID == "")
	if clientIntent && !cfg.clientCredentialsConfigured() && !cfg.jwtConfigured() {
		return salesforceConfig{}, fmt.Errorf("salesforce OAuth configuration is incomplete")
	}
	return cfg, nil
}

func (cfg salesforceConfig) jwtConfigured() bool {
	return cfg.ConsumerKey != "" && cfg.JWTUsername != "" && cfg.PrivateKey != nil && cfg.JWTAudience != ""
}

func (cfg salesforceConfig) clientCredentialsConfigured() bool {
	return cfg.ConsumerKey != "" && cfg.ClientSecret != "" && cfg.LoginURL != ""
}

func (cfg salesforceConfig) restConfigured() bool {
	return cfg.jwtConfigured() || cfg.clientCredentialsConfigured()
}

func (cfg salesforceConfig) configured() bool {
	return cfg.restConfigured() || cfg.WebToLeadOID != ""
}

func normalizeSalesforceLoginURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if !strings.Contains(raw, "://") {
		raw = "https://" + raw
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" {
		return strings.TrimRight(raw, "/")
	}
	host := strings.ToLower(parsed.Host)
	switch {
	case strings.HasSuffix(host, ".lightning.sfcrmapps.cn"):
		sub := strings.TrimSuffix(host, ".lightning.sfcrmapps.cn")
		return "https://" + sub + ".my.salesforce.cn"
	case strings.HasSuffix(host, ".lightning.force.com"):
		sub := strings.TrimSuffix(host, ".lightning.force.com")
		return "https://" + sub + ".my.salesforce.com"
	}
	parsed.Path = ""
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return strings.TrimRight(parsed.String(), "/")
}

func parseRSAPrivateKey(raw string) (*rsa.PrivateKey, error) {
	pemBytes := []byte(strings.ReplaceAll(raw, `\n`, "\n"))
	if !strings.Contains(string(pemBytes), "BEGIN") {
		decoded, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(raw, "\n", ""))
		if err != nil {
			return nil, err
		}
		pemBytes = decoded
	}
	block, _ := pem.Decode(pemBytes)
	if block == nil {
		return nil, errors.New("PEM block not found")
	}
	if key, err := x509.ParsePKCS8PrivateKey(block.Bytes); err == nil {
		rsaKey, ok := key.(*rsa.PrivateKey)
		if !ok {
			return nil, errors.New("not an RSA private key")
		}
		return rsaKey, nil
	}
	return x509.ParsePKCS1PrivateKey(block.Bytes)
}

func validSalesInquiryBudget(value string) bool {
	switch value {
	case dto.SalesInquiryBudget0To1000,
		dto.SalesInquiryBudget1000To5000,
		dto.SalesInquiryBudget5000To20000,
		dto.SalesInquiryBudget20000Plus:
		return true
	default:
		return false
	}
}

func validSalesInquiryPhone(value string) bool {
	if value == "" || len(value) > dto.MaxSalesInquiryPhoneLen {
		return false
	}
	digits := 0
	for _, r := range value {
		if unicode.IsDigit(r) {
			digits++
			continue
		}
		switch r {
		case '+', ' ', '-', '(', ')', '.', '/':
			continue
		default:
			return false
		}
	}
	return digits >= 6 && digits <= 15
}

func leadUsecase(inquiry dto.SalesInquiry) string {
	var b strings.Builder
	b.WriteString("月度预算：")
	b.WriteString(budgetLabel(inquiry.MonthlyBudget))
	b.WriteString("\n需求模型：")
	b.WriteString(inquiry.RequestedModel)
	if inquiry.Description != "" {
		b.WriteString("\n需求详细描述：")
		b.WriteString(inquiry.Description)
	}
	return b.String()
}

func leadUsecaseField(cfg salesforceConfig) string {
	if cfg.UsecaseField != "" {
		return cfg.UsecaseField
	}
	return defaultSalesforceUsecaseField
}

func webToLeadUsecaseField(cfg salesforceConfig) string {
	if cfg.WebToLeadUsecaseField != "" {
		return cfg.WebToLeadUsecaseField
	}
	return defaultSalesforceUsecaseField
}

func budgetLabel(value string) string {
	switch value {
	case dto.SalesInquiryBudget0To1000:
		return "$0 – $1,000"
	case dto.SalesInquiryBudget1000To5000:
		return "$1,000 – $5,000"
	case dto.SalesInquiryBudget5000To20000:
		return "$5,000 – $20,000"
	case dto.SalesInquiryBudget20000Plus:
		return "More than $20,000"
	default:
		return value
	}
}

func truncateRunes(value string, max int) string {
	if max <= 0 {
		return ""
	}
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}
	return string(runes[:max])
}

func readLimitedBody(r io.Reader) ([]byte, error) {
	return io.ReadAll(io.LimitReader(r, salesforceMaxResponseBody))
}

func truncateForLog(body []byte) string {
	const max = 500
	if len(body) <= max {
		return string(body)
	}
	return string(body[:max])
}

func IsSalesforceUnconfigured(err error) bool {
	return errors.Is(err, ErrSalesforceUnconfigured)
}

func IsSalesInquiryInvalid(err error) bool {
	return errors.Is(err, errSalesInquiryInvalid)
}
