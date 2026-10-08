package common

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	smsTencentHost    = "sms.tencentcloudapi.com"
	smsTencentService = "sms"
	smsTencentAction  = "SendSms"
	smsTencentVersion = "2021-01-11"
)

var (
	SMSTencentSecretId   = ""
	SMSTencentSecretKey  = ""
	SMSTencentSdkAppId   = ""
	SMSTencentSignName   = ""
	SMSTencentTemplateId = ""
	SMSTencentRegion     = "ap-guangzhou"

	ErrSMSNotConfigured = errors.New("sms is not configured")
	ErrSMSSendFailed    = errors.New("sms send failed")

	smsEndpoint = "https://" + smsTencentHost
	smsClient   = &http.Client{Timeout: 10 * time.Second}
	smsNow      = time.Now
)

type tencentSendSMSBody struct {
	PhoneNumberSet   []string `json:"PhoneNumberSet"`
	SmsSdkAppId      string   `json:"SmsSdkAppId"`
	SignName         string   `json:"SignName"`
	TemplateId       string   `json:"TemplateId"`
	TemplateParamSet []string `json:"TemplateParamSet"`
}

type tencentSMSResponse struct {
	Response struct {
		Error *struct {
			Code    string `json:"Code"`
			Message string `json:"Message"`
		} `json:"Error"`
		SendStatusSet []struct {
			Code    string `json:"Code"`
			Message string `json:"Message"`
		} `json:"SendStatusSet"`
		RequestId string `json:"RequestId"`
	} `json:"Response"`
}

func SMSConfigured() bool {
	return strings.TrimSpace(SMSTencentSecretId) != "" &&
		strings.TrimSpace(SMSTencentSecretKey) != "" &&
		strings.TrimSpace(SMSTencentSdkAppId) != "" &&
		strings.TrimSpace(SMSTencentSignName) != "" &&
		strings.TrimSpace(SMSTencentTemplateId) != ""
}

func SendSMS(phone string, code string) error {
	if !SMSConfigured() {
		return ErrSMSNotConfigured
	}
	return deliverTencentSMS(phone, code)
}

func deliverTencentSMS(phone string, code string) error {
	payload, err := Marshal(tencentSendSMSBody{
		PhoneNumberSet:   []string{phone},
		SmsSdkAppId:      strings.TrimSpace(SMSTencentSdkAppId),
		SignName:         strings.TrimSpace(SMSTencentSignName),
		TemplateId:       strings.TrimSpace(SMSTencentTemplateId),
		TemplateParamSet: []string{code},
	})
	if err != nil {
		return err
	}

	timestamp := smsNow().Unix()
	region := strings.TrimSpace(SMSTencentRegion)
	if region == "" {
		region = "ap-guangzhou"
	}
	authorization := tencentAuthorization(string(payload), timestamp)

	request, err := http.NewRequest(http.MethodPost, smsEndpoint, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", authorization)
	request.Header.Set("Content-Type", "application/json; charset=utf-8")
	request.Header.Set("Host", smsTencentHost)
	request.Header.Set("X-TC-Action", smsTencentAction)
	request.Header.Set("X-TC-Timestamp", fmt.Sprintf("%d", timestamp))
	request.Header.Set("X-TC-Version", smsTencentVersion)
	request.Header.Set("X-TC-Region", region)

	response, err := smsClient.Do(request)
	if err != nil {
		return fmt.Errorf("%w: %s", ErrSMSSendFailed, err.Error())
	}
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return fmt.Errorf("%w: %s", ErrSMSSendFailed, err.Error())
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("%w: status %d", ErrSMSSendFailed, response.StatusCode)
	}

	var parsed tencentSMSResponse
	if err := Unmarshal(body, &parsed); err != nil {
		return fmt.Errorf("%w: %s", ErrSMSSendFailed, err.Error())
	}
	if parsed.Response.Error != nil {
		return fmt.Errorf("%w: %s", ErrSMSSendFailed, parsed.Response.Error.Code)
	}
	if len(parsed.Response.SendStatusSet) == 0 || parsed.Response.SendStatusSet[0].Code != "Ok" {
		status := ""
		if len(parsed.Response.SendStatusSet) > 0 {
			status = parsed.Response.SendStatusSet[0].Code
		}
		return fmt.Errorf("%w: %s", ErrSMSSendFailed, status)
	}
	return nil
}

func tencentAuthorization(payload string, timestamp int64) string {
	date := time.Unix(timestamp, 0).UTC().Format("2006-01-02")
	canonicalHeaders := "content-type:application/json; charset=utf-8\nhost:" + smsTencentHost + "\n"
	signedHeaders := "content-type;host"
	canonicalRequest := strings.Join([]string{
		http.MethodPost,
		"/",
		"",
		canonicalHeaders,
		signedHeaders,
		sha256Hex(payload),
	}, "\n")
	credentialScope := date + "/" + smsTencentService + "/tc3_request"
	stringToSign := strings.Join([]string{
		"TC3-HMAC-SHA256",
		fmt.Sprintf("%d", timestamp),
		credentialScope,
		sha256Hex(canonicalRequest),
	}, "\n")
	secretDate := hmacSHA256([]byte("TC3"+SMSTencentSecretKey), date)
	secretService := hmacSHA256(secretDate, smsTencentService)
	secretSigning := hmacSHA256(secretService, "tc3_request")
	signature := hex.EncodeToString(hmacSHA256(secretSigning, stringToSign))
	return fmt.Sprintf(
		"TC3-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		SMSTencentSecretId,
		credentialScope,
		signedHeaders,
		signature,
	)
}

func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func hmacSHA256(key []byte, value string) []byte {
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write([]byte(value))
	return mac.Sum(nil)
}
