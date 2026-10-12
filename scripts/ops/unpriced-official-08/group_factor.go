package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/shopspring/decimal"
)

const officialCatalogPath = "web/src/features/pricing/data/official-prices.json"

const optionModelRatioKey = "ModelRatio"

type jsonDecimal struct {
	decimal.Decimal
}

func (d *jsonDecimal) UnmarshalJSON(data []byte) error {
	text := strings.Trim(string(data), "\" \n\t\r")
	if text == "" || text == "null" {
		d.Decimal = decimal.Zero
		return nil
	}
	value, err := decimal.NewFromString(text)
	if err != nil {
		return err
	}
	d.Decimal = value
	return nil
}

type officialEntry struct {
	Group           string      `json:"group"`
	Factor          jsonDecimal `json:"factor"`
	BillingMode     string      `json:"billing_mode"`
	BillingExpr     string      `json:"billing_expr"`
	ModelRatio      jsonDecimal `json:"model_ratio"`
	CompletionRatio jsonDecimal `json:"completion_ratio"`
}

type groupPlan struct {
	Name           string
	Group          string
	Factor         decimal.Decimal
	OfficialExpr   string
	ScaledExpr     string
	OfficialRatio  decimal.Decimal
	ScaledRatio    decimal.Decimal
	AlreadyApplied bool
}

type livePrice struct {
	BillingExpr string
	BillingMode string
	ModelRatio  decimal.Decimal
	HasExpr     bool
}

func loadOfficialCatalog(path string) (map[string]officialEntry, error) {
	payload, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("读取官方价文件失败: %w", err)
	}
	var file struct {
		Models map[string]officialEntry `json:"models"`
	}
	if err := common.Unmarshal(payload, &file); err != nil {
		return nil, fmt.Errorf("官方价文件不是 JSON: %w", err)
	}
	if len(file.Models) == 0 {
		return nil, fmt.Errorf("官方价文件没有模型")
	}
	for name, entry := range file.Models {
		if strings.TrimSpace(name) == "" {
			return nil, fmt.Errorf("官方价文件里有空模型名")
		}
		if strings.TrimSpace(entry.Group) == "" || entry.Group == "官方" || strings.Contains(entry.Group, "特价") {
			return nil, fmt.Errorf("%s 的分组 Y 无效: %s", name, entry.Group)
		}
		if entry.Factor.Sign() <= 0 || entry.Factor.GreaterThan(decimal.NewFromInt(1)) {
			return nil, fmt.Errorf("%s 的系数必须在 (0, 1]，当前 %s", name, entry.Factor.String())
		}
		if strings.TrimSpace(entry.BillingExpr) == "" && entry.ModelRatio.Sign() <= 0 {
			return nil, fmt.Errorf("%s 没有官方价", name)
		}
	}
	return file.Models, nil
}

func runGroupFactor(args []string) error {
	fs := flag.NewFlagSet("group-factor", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	apply := fs.Bool("apply", false, "把模型价格写成官方价 × 分组系数")
	file := fs.String("file", officialCatalogPath, "官方价 JSON")
	timeout := fs.Duration("timeout", 3*time.Minute, "整次运行和单次 HTTP 的超时")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if fs.NArg() != 0 {
		return fmt.Errorf("不能接受位置参数 %q", fs.Arg(0))
	}
	catalog, err := loadOfficialCatalog(*file)
	if err != nil {
		return err
	}
	baseURL := strings.TrimSpace(os.Getenv(envBaseURL))
	if baseURL == "" {
		baseURL = "https://api.fluxlane.ai"
	}
	token := strings.TrimSpace(os.Getenv(envRootToken))
	if token == "" {
		return fmt.Errorf("缺少环境变量 %s", envRootToken)
	}
	gw, err := newGateway(baseURL, token, *timeout)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), *timeout)
	defer cancel()
	live, err := fetchLivePrices(ctx, gw)
	if err != nil {
		return err
	}
	plans, unpublished, err := buildGroupPlans(catalog, live)
	if err != nil {
		return err
	}
	writeGroupPlans(os.Stdout, plans, unpublished, *apply)
	if !*apply {
		fmt.Fprintln(os.Stdout, "\ndry-run 结束，未写入。确认后加 --apply。")
		return nil
	}
	return applyGroupPlans(ctx, gw, plans)
}

func fetchLivePrices(ctx context.Context, gw *gateway) (map[string]livePrice, error) {
	var payload struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
		Data    []struct {
			ModelName   string      `json:"model_name"`
			BillingMode string      `json:"billing_mode"`
			BillingExpr string      `json:"billing_expr"`
			ModelRatio  jsonDecimal `json:"model_ratio"`
		} `json:"data"`
	}
	if err := gw.doJSON(ctx, "GET", "/api/pricing", nil, true, &payload); err != nil {
		return nil, err
	}
	if !payload.Success {
		return nil, fmt.Errorf("读取定价失败: %s", gw.redact(payload.Message))
	}
	live := make(map[string]livePrice, len(payload.Data))
	for _, row := range payload.Data {
		live[row.ModelName] = livePrice{
			BillingExpr: row.BillingExpr,
			BillingMode: row.BillingMode,
			ModelRatio:  row.ModelRatio.Decimal,
			HasExpr:     strings.TrimSpace(row.BillingExpr) != "",
		}
	}
	return live, nil
}

func buildGroupPlans(catalog map[string]officialEntry, live map[string]livePrice) ([]groupPlan, []string, error) {
	names := make([]string, 0, len(catalog))
	for name := range catalog {
		names = append(names, name)
	}
	sort.Strings(names)
	plans := make([]groupPlan, 0, len(names))
	var unpublished []string
	var problems []string
	for _, name := range names {
		entry := catalog[name]
		current, ok := live[name]
		if !ok {
			unpublished = append(unpublished, name)
			continue
		}
		plan := groupPlan{
			Name:          name,
			Group:         entry.Group,
			Factor:        entry.Factor.Decimal,
			OfficialRatio: entry.ModelRatio.Decimal,
			ScaledRatio:   entry.ModelRatio.Decimal.Mul(entry.Factor.Decimal),
		}
		if strings.TrimSpace(entry.BillingExpr) != "" {
			scaled, _, err := ScaleOfficialExpr(entry.BillingExpr, entry.Factor.Decimal)
			if err != nil {
				problems = append(problems, fmt.Sprintf("%s: %s", name, err.Error()))
				continue
			}
			plan.OfficialExpr = entry.BillingExpr
			plan.ScaledExpr = scaled
			switch strings.TrimSpace(current.BillingExpr) {
			case "", entry.BillingExpr:
				plan.AlreadyApplied = false
			case scaled:
				plan.AlreadyApplied = strings.TrimSpace(current.BillingMode) == tieredMode
			default:
				problems = append(problems, fmt.Sprintf("%s 的线上表达式既不是官方价，也不是官方价 × %s", name, entry.Factor.String()))
			}
		} else {
			switch {
			case current.ModelRatio.Equal(entry.ModelRatio.Decimal):
				plan.AlreadyApplied = false
			case current.ModelRatio.Equal(plan.ScaledRatio):
				plan.AlreadyApplied = true
			default:
				problems = append(problems, fmt.Sprintf("%s 的线上倍率 %s 对不上官方价 %s", name, current.ModelRatio.String(), entry.ModelRatio.String()))
			}
		}
		plans = append(plans, plan)
	}
	if len(problems) > 0 {
		return nil, unpublished, fmt.Errorf("官方价文件和线上价格不一致:\n%s", strings.Join(problems, "\n"))
	}
	return plans, unpublished, nil
}

func writeGroupPlans(out *os.File, plans []groupPlan, unpublished []string, apply bool) {
	pending := 0
	fmt.Fprintf(out, "模型价格 = 官方价 × 分组系数（%d 个模型）\n", len(plans))
	for _, plan := range plans {
		state := "待写入"
		if plan.AlreadyApplied {
			state = "已是目标价"
		} else {
			pending++
		}
		if plan.ScaledExpr != "" {
			fmt.Fprintf(out, "%s  %s  %s × %s  %s\n", state, plan.Name, plan.Group, plan.Factor.String(), summarizeExpr(plan))
			continue
		}
		fmt.Fprintf(out, "%s  %s  %s  model_ratio %s × %s = %s\n", state, plan.Name, plan.Group, plan.OfficialRatio.String(), plan.Factor.String(), plan.ScaledRatio.String())
	}
	fmt.Fprintf(out, "待写入 %d，已是目标价 %d，apply=%t\n", pending, len(plans)-pending, apply)
	if len(unpublished) > 0 {
		fmt.Fprintf(out, "未上架，保持官方价文件、不改线上：%s\n", strings.Join(unpublished, "、"))
	}
}

func summarizeExpr(plan groupPlan) string {
	official, err := ParseTierQuotes(plan.OfficialExpr)
	if err != nil || len(official) == 0 {
		return "表达式"
	}
	scaled, err := ParseTierQuotes(plan.ScaledExpr)
	if err != nil || len(scaled) == 0 {
		return "表达式"
	}
	summary := fmt.Sprintf("%s p %s -> %s，c %s -> %s", official[0].Label, coeff(official[0], "p"), coeff(scaled[0], "p"), coeff(official[0], "c"), coeff(scaled[0], "c"))
	if coeff(official[0], "ao") != "-" {
		summary += fmt.Sprintf("，ao %s -> %s", coeff(official[0], "ao"), coeff(scaled[0], "ao"))
	}
	return summary
}

func coeff(quote TierQuote, name string) string {
	value, ok := quote.Coeffs[name]
	if !ok {
		return "-"
	}
	return value.String()
}

func applyGroupPlans(ctx context.Context, gw *gateway, plans []groupPlan) error {
	pending := make([]groupPlan, 0, len(plans))
	for _, plan := range plans {
		if !plan.AlreadyApplied {
			pending = append(pending, plan)
		}
	}
	if len(pending) == 0 {
		fmt.Fprintln(os.Stdout, "线上价格已经是官方价 × 分组系数，未改动。")
		return nil
	}
	current, err := gw.getOptions(ctx)
	if err != nil {
		return err
	}
	exprMap, err := parseStringMap(current[optionExprKey])
	if err != nil {
		return fmt.Errorf("当前 %s 不是 JSON 对象: %w", optionExprKey, err)
	}
	ratioMap, err := parseRawMap(current[optionModelRatioKey])
	if err != nil {
		return fmt.Errorf("当前 %s 不是 JSON 对象: %w", optionModelRatioKey, err)
	}
	modeMap, err := parseStringMap(current[optionModeKey])
	if err != nil {
		return fmt.Errorf("当前 %s 不是 JSON 对象: %w", optionModeKey, err)
	}
	originalExpr := copyStringMap(exprMap)
	originalRatio := copyRawMap(ratioMap)
	originalMode := copyStringMap(modeMap)
	exprChanged := false
	ratioChanged := false
	modeChanged := false
	for _, plan := range pending {
		if plan.ScaledExpr != "" {
			exprMap[plan.Name] = plan.ScaledExpr
			exprChanged = true
			if modeMap[plan.Name] != tieredMode {
				modeMap[plan.Name] = tieredMode
				modeChanged = true
			}
			continue
		}
		ratioMap[plan.Name] = json.RawMessage(plan.ScaledRatio.String())
		ratioChanged = true
	}
	if exprChanged {
		exprJSON, err := marshalStringMap(exprMap)
		if err != nil {
			return err
		}
		if strings.Contains(exprJSON, gw.token) {
			return fmt.Errorf("拒绝写入：定价内容里出现了访问令牌")
		}
		fmt.Fprintf(os.Stdout, "写入 %s\n", optionExprKey)
		if err := gw.putOption(ctx, optionExprKey, exprJSON); err != nil {
			return err
		}
	}
	if ratioChanged {
		ratioJSON, err := marshalRawMap(ratioMap)
		if err != nil {
			return err
		}
		if strings.Contains(ratioJSON, gw.token) {
			return fmt.Errorf("拒绝写入：定价内容里出现了访问令牌")
		}
		fmt.Fprintf(os.Stdout, "写入 %s\n", optionModelRatioKey)
		if err := gw.putOption(ctx, optionModelRatioKey, ratioJSON); err != nil {
			if exprChanged {
				return fmt.Errorf("%w（%s 已经写入，可重新执行 --apply）", err, optionExprKey)
			}
			return err
		}
	}
	if modeChanged {
		modeJSON, err := marshalStringMap(modeMap)
		if err != nil {
			return err
		}
		if strings.Contains(modeJSON, gw.token) {
			return fmt.Errorf("拒绝写入：定价内容里出现了访问令牌")
		}
		fmt.Fprintf(os.Stdout, "写入 %s\n", optionModeKey)
		if err := gw.putOption(ctx, optionModeKey, modeJSON); err != nil {
			return fmt.Errorf("%w（价格表达式已经写入，可重新执行 --apply）", err)
		}
	}
	if err := confirmGroupOptions(ctx, gw, exprMap, ratioMap, originalExpr, originalRatio, originalMode, modeMap, pending); err != nil {
		return err
	}
	if err := confirmGroupPricing(ctx, gw, plans); err != nil {
		return err
	}
	fmt.Fprintln(os.Stdout, "写回校验通过。")
	return nil
}

func confirmGroupOptions(ctx context.Context, gw *gateway, exprMap map[string]string, ratioMap map[string]json.RawMessage, originalExpr map[string]string, originalRatio map[string]json.RawMessage, originalMode map[string]string, modeMap map[string]string, pending []groupPlan) error {
	var problems []string
	for attempt := 1; attempt <= 16; attempt++ {
		confirmed, err := gw.getOptions(ctx)
		if err != nil {
			return err
		}
		gotExpr, err := parseStringMap(confirmed[optionExprKey])
		if err != nil {
			return fmt.Errorf("写回的 %s 无法解析: %w", optionExprKey, err)
		}
		gotRatio, err := parseRawMap(confirmed[optionModelRatioKey])
		if err != nil {
			return fmt.Errorf("写回的 %s 无法解析: %w", optionModelRatioKey, err)
		}
		gotMode, err := parseStringMap(confirmed[optionModeKey])
		if err != nil {
			return fmt.Errorf("写回的 %s 无法解析: %w", optionModeKey, err)
		}
		problems = problems[:0]
		for name, expr := range originalExpr {
			if _, updated := updatedExpr(pending, name); updated {
				continue
			}
			if gotExpr[name] != expr {
				problems = append(problems, fmt.Sprintf("%s 的原有表达式被改动", name))
			}
		}
		for name, raw := range originalRatio {
			if _, updated := updatedRatio(pending, name); updated {
				continue
			}
			same, err := sameRawDecimal(gotRatio[name], raw)
			if err != nil || !same {
				problems = append(problems, fmt.Sprintf("%s 的原有模型倍率被改动", name))
			}
		}
		for _, plan := range pending {
			if plan.ScaledExpr != "" {
				if gotExpr[plan.Name] != plan.ScaledExpr {
					problems = append(problems, fmt.Sprintf("%s 的表达式尚未同步", plan.Name))
				}
				continue
			}
			got, err := decimal.NewFromString(strings.TrimSpace(string(gotRatio[plan.Name])))
			if err != nil || !got.Equal(plan.ScaledRatio) {
				problems = append(problems, fmt.Sprintf("%s 的模型倍率尚未同步，读到 %s", plan.Name, string(gotRatio[plan.Name])))
			}
		}
		if len(exprMap) != len(gotExpr) {
			problems = append(problems, fmt.Sprintf("表达式数量 %d，期望 %d", len(gotExpr), len(exprMap)))
		}
		for name, mode := range originalMode {
			if _, updated := updatedExpr(pending, name); updated {
				continue
			}
			if gotMode[name] != mode {
				problems = append(problems, fmt.Sprintf("%s 的原有计费模式被改动", name))
			}
		}
		for name, mode := range modeMap {
			if gotMode[name] != mode {
				problems = append(problems, fmt.Sprintf("%s 的计费模式是 %q，期望 %q", name, gotMode[name], mode))
			}
		}
		if len(problems) == 0 {
			return nil
		}
		if attempt == 16 {
			break
		}
		timer := time.NewTimer(4 * time.Second)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
	}
	return fmt.Errorf("写回校验失败:\n%s", strings.Join(problems, "\n"))
}

func confirmGroupPricing(ctx context.Context, gw *gateway, plans []groupPlan) error {
	var problems []string
	for attempt := 1; attempt <= 16; attempt++ {
		live, err := fetchLivePrices(ctx, gw)
		if err != nil {
			return err
		}
		problems = problems[:0]
		for _, plan := range plans {
			current, ok := live[plan.Name]
			if !ok {
				problems = append(problems, fmt.Sprintf("%s 写入后不在定价列表", plan.Name))
				continue
			}
			if plan.ScaledExpr != "" {
				if current.BillingExpr != plan.ScaledExpr {
					problems = append(problems, fmt.Sprintf("%s 的展示表达式尚未变成目标价", plan.Name))
				}
				if strings.TrimSpace(current.BillingMode) != tieredMode {
					problems = append(problems, fmt.Sprintf("%s 的计费模式是 %q，期望 %s", plan.Name, current.BillingMode, tieredMode))
				}
				continue
			}
			if !current.ModelRatio.Equal(plan.ScaledRatio) {
				problems = append(problems, fmt.Sprintf("%s 的展示倍率是 %s，期望 %s", plan.Name, current.ModelRatio.String(), plan.ScaledRatio.String()))
			}
		}
		if len(problems) == 0 {
			return nil
		}
		if attempt == 16 {
			break
		}
		timer := time.NewTimer(4 * time.Second)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
	}
	return fmt.Errorf("定价列表校验失败:\n%s", strings.Join(problems, "\n"))
}

func updatedExpr(plans []groupPlan, name string) (groupPlan, bool) {
	for _, plan := range plans {
		if plan.Name == name && plan.ScaledExpr != "" {
			return plan, true
		}
	}
	return groupPlan{}, false
}

func updatedRatio(plans []groupPlan, name string) (groupPlan, bool) {
	for _, plan := range plans {
		if plan.Name == name && plan.ScaledExpr == "" {
			return plan, true
		}
	}
	return groupPlan{}, false
}

func parseRawMap(raw string) (map[string]json.RawMessage, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "null" {
		return map[string]json.RawMessage{}, nil
	}
	var parsed map[string]json.RawMessage
	if err := common.UnmarshalJsonStr(raw, &parsed); err != nil {
		return nil, err
	}
	if parsed == nil {
		parsed = map[string]json.RawMessage{}
	}
	return parsed, nil
}

func marshalRawMap(values map[string]json.RawMessage) (string, error) {
	if values == nil {
		values = map[string]json.RawMessage{}
	}
	payload, err := common.Marshal(values)
	if err != nil {
		return "", err
	}
	var roundTrip map[string]json.RawMessage
	if err := common.Unmarshal(payload, &roundTrip); err != nil {
		return "", err
	}
	if len(roundTrip) != len(values) {
		return "", fmt.Errorf("模型倍率 JSON 回读数量不一致")
	}
	for name, value := range values {
		if string(roundTrip[name]) != string(value) {
			return "", fmt.Errorf("模型倍率 %s 回读不一致", name)
		}
	}
	return string(payload), nil
}

func sameRawDecimal(left, right json.RawMessage) (bool, error) {
	if len(left) == 0 || len(right) == 0 {
		return string(left) == string(right), nil
	}
	lv, err := decimal.NewFromString(strings.TrimSpace(string(left)))
	if err != nil {
		return false, err
	}
	rv, err := decimal.NewFromString(strings.TrimSpace(string(right)))
	if err != nil {
		return false, err
	}
	return lv.Equal(rv), nil
}

func copyStringMap(values map[string]string) map[string]string {
	copied := make(map[string]string, len(values))
	for key, value := range values {
		copied[key] = value
	}
	return copied
}

func copyRawMap(values map[string]json.RawMessage) map[string]json.RawMessage {
	copied := make(map[string]json.RawMessage, len(values))
	for key, value := range values {
		copied[key] = append(json.RawMessage(nil), value...)
	}
	return copied
}
