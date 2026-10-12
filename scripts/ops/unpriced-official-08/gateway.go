package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
)

const maxResponseBytes = 8 << 20

type gateway struct {
	baseURL string
	token   string
	client  *http.Client
}

type optionItem struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type pricingRow struct {
	ModelName   string `json:"model_name"`
	BillingMode string `json:"billing_mode"`
	BillingExpr string `json:"billing_expr"`
}

func newGateway(baseURL, token string, timeout time.Duration) (*gateway, error) {
	parsed, err := url.Parse(strings.TrimSpace(baseURL))
	if err != nil || parsed.Host == "" || (parsed.Scheme != "https" && parsed.Scheme != "http") {
		return nil, fmt.Errorf("%s 必须是 http(s) 网关地址", envBaseURL)
	}
	if parsed.User != nil {
		return nil, fmt.Errorf("%s 不能在地址里携带凭证", envBaseURL)
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return &gateway{
		baseURL: strings.TrimRight(parsed.String(), "/"),
		token:   token,
		client: &http.Client{
			Timeout: timeout,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 3 {
					return fmt.Errorf("重定向次数过多")
				}
				if len(via) > 0 && req.URL.Host != via[0].URL.Host {
					return fmt.Errorf("拒绝把请求重定向到其他主机")
				}
				return nil
			},
		},
	}, nil
}

func (g *gateway) redact(text string) string {
	if g != nil && g.token != "" {
		text = strings.ReplaceAll(text, g.token, "***")
	}
	return text
}

func (g *gateway) getOptions(ctx context.Context) (map[string]string, error) {
	var payload struct {
		Success bool         `json:"success"`
		Message string       `json:"message"`
		Data    []optionItem `json:"data"`
	}
	if err := g.doJSON(ctx, http.MethodGet, "/api/option/", nil, true, &payload); err != nil {
		return nil, err
	}
	if !payload.Success {
		return nil, fmt.Errorf("读取选项失败: %s", g.redact(payload.Message))
	}
	values := make(map[string]string, len(payload.Data))
	for _, item := range payload.Data {
		values[item.Key] = item.Value
	}
	return values, nil
}

func (g *gateway) putOption(ctx context.Context, key, value string) error {
	body, err := common.Marshal(map[string]string{
		"key":   key,
		"value": value,
	})
	if err != nil {
		return err
	}
	var payload struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	if err := g.doJSON(ctx, http.MethodPut, "/api/option/", body, true, &payload); err != nil {
		return err
	}
	if !payload.Success {
		return fmt.Errorf("写入 %s 失败: %s", key, g.redact(payload.Message))
	}
	return nil
}

func (g *gateway) getPricing(ctx context.Context) ([]pricingRow, error) {
	var payload struct {
		Success bool         `json:"success"`
		Message string       `json:"message"`
		Data    []pricingRow `json:"data"`
	}
	if err := g.doJSON(ctx, http.MethodGet, "/api/pricing", nil, true, &payload); err != nil {
		return nil, err
	}
	if !payload.Success {
		return nil, fmt.Errorf("读取定价失败: %s", g.redact(payload.Message))
	}
	return payload.Data, nil
}

func (g *gateway) doJSON(ctx context.Context, method, path string, body []byte, auth bool, dest any) error {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, g.baseURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if auth {
		if g.token == "" {
			return fmt.Errorf("缺少环境变量 %s", envRootToken)
		}
		req.Header.Set("Authorization", "Bearer "+g.token)
	}
	resp, err := g.client.Do(req)
	if err != nil {
		return fmt.Errorf("%s %s: %s", method, path, g.redact(err.Error()))
	}
	defer resp.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes+1))
	if err != nil {
		return fmt.Errorf("%s %s: %s", method, path, g.redact(err.Error()))
	}
	if len(payload) > maxResponseBytes {
		return fmt.Errorf("%s %s 响应超过 %d 字节", method, path, maxResponseBytes)
	}
	if resp.StatusCode != http.StatusOK {
		snippet := g.redact(string(payload))
		if len(snippet) > 300 {
			snippet = snippet[:300]
		}
		return fmt.Errorf("%s %s 返回 HTTP %d: %s", method, path, resp.StatusCode, snippet)
	}
	if err := common.Unmarshal(payload, dest); err != nil {
		return fmt.Errorf("%s %s 响应无法解析: %w", method, path, err)
	}
	return nil
}

func fetchPreset(ctx context.Context, client *http.Client, sourceURL string) (map[string]string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, sourceURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("拉取官方价失败: %w", err)
	}
	defer resp.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes+1))
	if err != nil {
		return nil, fmt.Errorf("读取官方价失败: %w", err)
	}
	if len(payload) > maxResponseBytes {
		return nil, fmt.Errorf("官方价响应超过 %d 字节", maxResponseBytes)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("官方价源返回 HTTP %d", resp.StatusCode)
	}
	var wrapped struct {
		Data struct {
			BillingExpr map[string]string `json:"billing_expr"`
		} `json:"data"`
	}
	if err := common.Unmarshal(payload, &wrapped); err != nil {
		return nil, fmt.Errorf("官方价 JSON 无法解析: %w", err)
	}
	if len(wrapped.Data.BillingExpr) == 0 {
		return nil, fmt.Errorf("官方价 JSON 里没有 data.billing_expr")
	}
	return wrapped.Data.BillingExpr, nil
}

func parseStringMap(raw string) (map[string]string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "null" {
		return map[string]string{}, nil
	}
	var parsed map[string]string
	if err := common.UnmarshalJsonStr(raw, &parsed); err != nil {
		return nil, err
	}
	if parsed == nil {
		parsed = map[string]string{}
	}
	return parsed, nil
}

func marshalStringMap(values map[string]string) (string, error) {
	if values == nil {
		values = map[string]string{}
	}
	payload, err := common.Marshal(values)
	if err != nil {
		return "", err
	}
	var roundTrip map[string]string
	if err := common.Unmarshal(payload, &roundTrip); err != nil {
		return "", err
	}
	if !sameStringMap(roundTrip, values) {
		return "", fmt.Errorf("定价 JSON 回读不一致")
	}
	return string(payload), nil
}
