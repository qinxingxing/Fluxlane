package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/shopspring/decimal"
)

type options struct {
	apply         bool
	factor        decimal.Decimal
	factorText    string
	sourceURL     string
	overridesPath string
	models        []string
	baseURL       string
	token         string
	timeout       time.Duration
}

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintf(os.Stderr, "unpriced-official-08: %s\n", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	opts, err := parseArgs(args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), opts.timeout)
	defer cancel()

	preset, err := fetchPreset(ctx, &http.Client{Timeout: opts.timeout}, opts.sourceURL)
	if err != nil {
		return err
	}
	manual := manualOfficialExpr()
	if opts.overridesPath != "" {
		loaded, err := loadOverrides(opts.overridesPath)
		if err != nil {
			return err
		}
		for name, expr := range loaded {
			manual[name] = expr
		}
	}
	models := opts.models
	if len(models) == 0 {
		models = defaultModels()
	}

	resolved, missing, err := resolveModels(models, preset, manual, opts.factor)
	if err != nil {
		return err
	}
	if strings.TrimSpace(opts.baseURL) == "" || strings.TrimSpace(opts.token) == "" {
		return fmt.Errorf("判断哪些模型未定价需要环境变量 %s 和 %s", envBaseURL, envRootToken)
	}
	gw, err := newGateway(opts.baseURL, opts.token, opts.timeout)
	if err != nil {
		return err
	}
	if rows, pricingErr := gw.getPricing(ctx); pricingErr != nil {
		fmt.Fprintf(os.Stderr, "警告: 读取定价列表失败，按清单原名写入: %s\n", pricingErr.Error())
	} else {
		catalog := make([]string, 0, len(rows))
		for _, row := range rows {
			catalog = append(catalog, row.ModelName)
		}
		resolved = retargetCatalogNames(resolved, catalog)
	}
	current, err := gw.getOptions(ctx)
	if err != nil {
		return err
	}
	exprMap, err := parseStringMap(current[optionExprKey])
	if err != nil {
		return fmt.Errorf("当前 %s 不是 JSON 对象: %w", optionExprKey, err)
	}
	unpriced, already := splitUnpriced(resolved, exprMap)
	for _, name := range already {
		fmt.Fprintf(os.Stdout, "跳过 %s：已有定价，不覆盖\n", name)
	}
	for _, name := range missing {
		fmt.Fprintf(os.Stderr, "警告: %s 没有官方价，已跳过，不会按 0 定价\n", name)
	}
	if len(unpriced) == 0 {
		fmt.Fprintln(os.Stdout, "没有需要新写入的模型。")
		if len(missing) > 0 {
			return fmt.Errorf("%d 个模型没有官方价", len(missing))
		}
		return nil
	}
	writePlan(os.Stdout, opts.factorText, unpriced, opts.apply)
	if !opts.apply {
		fmt.Fprintln(os.Stdout, "\ndry-run 结束，未写入。确认后加 --apply。")
		if len(missing) > 0 {
			return fmt.Errorf("%d 个模型没有官方价", len(missing))
		}
		return nil
	}
	if err := applyAndVerify(ctx, gw, unpriced); err != nil {
		return err
	}
	if len(missing) > 0 {
		return fmt.Errorf("已写入 %d 个未定价模型；另有 %d 个没有官方价，未写入", len(unpriced), len(missing))
	}
	return nil
}

func parseArgs(args []string) (options, error) {
	fs := flag.NewFlagSet("unpriced-official-08", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	fs.Usage = func() {
		fmt.Fprintf(os.Stderr, "用法: go run ./scripts/ops/unpriced-official-08 [--apply] [--factor 0.8]\n\n")
		fmt.Fprintf(os.Stderr, "只给清单中还没有计费表达式的模型写入官方价 × factor。已有定价的模型不覆盖。\n")
		fmt.Fprintf(os.Stderr, "读取环境变量 %s（网关根地址）和 %s（root 用户 access token）。\n\n", envBaseURL, envRootToken)
		fs.PrintDefaults()
	}

	apply := fs.Bool("apply", false, "写入尚未定价模型的 billing_setting.billing_expr 与 billing_setting.billing_mode")
	factorText := fs.String("factor", defaultFactor, "官方价乘数，Fluxlane 定价 = 官方定价 × factor")
	sourceURL := fs.String("source-url", defaultSource, "new-api 官方倍率预设 JSON")
	overridesPath := fs.String("overrides", "", "手工官方价 JSON 文件，形如 {\"模型名\":\"官方表达式\"}，覆盖内置表")
	modelList := fs.String("models", "", "逗号分隔的模型名，默认使用内置清单")
	timeout := fs.Duration("timeout", 120*time.Second, "整次运行和单次 HTTP 的超时；写入后要等另一台 API 节点同步")
	if err := fs.Parse(args); err != nil {
		return options{}, err
	}
	if fs.NArg() != 0 {
		return options{}, fmt.Errorf("不能接受位置参数 %q", fs.Arg(0))
	}
	factor, err := decimal.NewFromString(strings.TrimSpace(*factorText))
	if err != nil || factor.Sign() <= 0 {
		return options{}, fmt.Errorf("--factor 必须是正数，例如 0.8")
	}
	var models []string
	if strings.TrimSpace(*modelList) != "" {
		for _, name := range strings.Split(*modelList, ",") {
			name = strings.TrimSpace(name)
			if name != "" {
				models = append(models, name)
			}
		}
	}
	return options{
		apply:         *apply,
		factor:        factor,
		factorText:    factor.String(),
		sourceURL:     strings.TrimSpace(*sourceURL),
		overridesPath: strings.TrimSpace(*overridesPath),
		models:        models,
		baseURL:       strings.TrimSpace(os.Getenv(envBaseURL)),
		token:         strings.TrimSpace(os.Getenv(envRootToken)),
		timeout:       *timeout,
	}, nil
}

func loadOverrides(path string) (map[string]string, error) {
	payload, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("读取手工官方价失败: %w", err)
	}
	var parsed map[string]string
	if err := common.Unmarshal(payload, &parsed); err != nil {
		return nil, fmt.Errorf("手工官方价必须是 JSON 对象: %w", err)
	}
	if len(parsed) == 0 {
		return nil, fmt.Errorf("手工官方价文件是空的")
	}
	for name, expr := range parsed {
		if strings.TrimSpace(name) == "" || strings.TrimSpace(expr) == "" {
			return nil, fmt.Errorf("手工官方价里有空的模型名或表达式")
		}
	}
	return parsed, nil
}

func applyAndVerify(ctx context.Context, gw *gateway, models []pricedModel) error {
	current, err := gw.getOptions(ctx)
	if err != nil {
		return err
	}
	exprMap, err := parseStringMap(current[optionExprKey])
	if err != nil {
		return fmt.Errorf("当前 %s 不是 JSON 对象: %w", optionExprKey, err)
	}
	modeMap, err := parseStringMap(current[optionModeKey])
	if err != nil {
		return fmt.Errorf("当前 %s 不是 JSON 对象: %w", optionModeKey, err)
	}
	exprUpdates, modeUpdates := billingUpdates(models)
	for name, expr := range exprUpdates {
		existing := strings.TrimSpace(exprMap[name])
		if existing != "" && existing != expr {
			fmt.Fprintf(os.Stdout, "跳过 %s：写入前已有定价，不覆盖\n", name)
			delete(exprUpdates, name)
			delete(modeUpdates, name)
		}
	}
	if len(exprUpdates) == 0 {
		fmt.Fprintln(os.Stdout, "写入前这些模型都已有定价，未改动。")
		return nil
	}
	mergedExpr := mergeStringMaps(exprMap, exprUpdates)
	mergedMode := mergeStringMaps(modeMap, modeUpdates)

	if sameStringMap(exprMap, mergedExpr) && sameStringMap(modeMap, mergedMode) {
		fmt.Fprintln(os.Stdout, "\n选项已是目标定价，跳过写入。")
	} else {
		exprJSON, err := marshalStringMap(mergedExpr)
		if err != nil {
			return err
		}
		modeJSON, err := marshalStringMap(mergedMode)
		if err != nil {
			return err
		}
		if strings.Contains(exprJSON, gw.token) || strings.Contains(modeJSON, gw.token) {
			return fmt.Errorf("拒绝写入：定价内容里出现了访问令牌")
		}
		fmt.Fprintf(os.Stdout, "\n写入 %s\n", optionExprKey)
		if err := gw.putOption(ctx, optionExprKey, exprJSON); err != nil {
			return err
		}
		fmt.Fprintf(os.Stdout, "写入 %s\n", optionModeKey)
		if err := gw.putOption(ctx, optionModeKey, modeJSON); err != nil {
			return fmt.Errorf("%w（%s 已经写入，可重新执行 --apply）", err, optionExprKey)
		}
	}

	if err := confirmBilling(ctx, gw, mergedExpr, mergedMode, exprUpdates, modeUpdates); err != nil {
		return err
	}
	fmt.Fprintln(os.Stdout, "写回校验通过：清单外模型的定价未改动。")

	report, problems, err := confirmPricing(ctx, gw, models)
	if err != nil {
		return err
	}
	fmt.Fprintln(os.Stdout)
	fmt.Fprintln(os.Stdout, report)
	if len(problems) > 0 {
		return fmt.Errorf("GET /api/pricing 校验失败:\n%s", strings.Join(problems, "\n"))
	}
	return nil
}

// confirmBilling 重复读取选项。两台 API 节点里，没处理这次 PUT 的那台要等数据库同步后才看得到新定价。
func confirmBilling(ctx context.Context, gw *gateway, mergedExpr, mergedMode, exprUpdates, modeUpdates map[string]string) error {
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
		gotMode, err := parseStringMap(confirmed[optionModeKey])
		if err != nil {
			return fmt.Errorf("写回的 %s 无法解析: %w", optionModeKey, err)
		}
		problems = append(
			diffStringMap(gotExpr, mergedExpr, exprUpdates),
			diffStringMap(gotMode, mergedMode, modeUpdates)...,
		)
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

func confirmPricing(ctx context.Context, gw *gateway, models []pricedModel) (string, []string, error) {
	var report string
	var problems []string
	for attempt := 1; attempt <= 16; attempt++ {
		rows, err := gw.getPricing(ctx)
		if err != nil {
			return "", nil, err
		}
		report, problems = verifyPricing(rows, models)
		if len(problems) == 0 {
			return report, nil, nil
		}
		if attempt == 16 {
			break
		}
		timer := time.NewTimer(4 * time.Second)
		select {
		case <-ctx.Done():
			timer.Stop()
			return "", nil, ctx.Err()
		case <-timer.C:
		}
	}
	return report, problems, nil
}

func verifyPricing(rows []pricingRow, models []pricedModel) (string, []string) {
	byName := make(map[string]pricingRow, len(rows))
	for _, row := range rows {
		byName[row.ModelName] = row
	}
	var b strings.Builder
	var problems []string
	shown := 0
	fmt.Fprintf(&b, "GET /api/pricing 校验（展示价 = 官方价 × 系数，单位 $/1M tokens）\n")
	for _, model := range models {
		row, ok := byName[model.Name]
		if !ok {
			fmt.Fprintf(&b, "[警告] %s  已写入计费选项，但当前不在定价列表中（渠道未启用、模型被禁用，或当前身份看不到该分组）\n", model.Name)
			continue
		}
		if row.BillingMode != tieredMode {
			problems = append(problems, fmt.Sprintf("%s 的 billing_mode = %q，期望 %s", model.Name, row.BillingMode, tieredMode))
		}
		got, err := ParseTierQuotes(row.BillingExpr)
		if err != nil {
			problems = append(problems, fmt.Sprintf("%s 的展示表达式无法解析: %s", model.Name, err.Error()))
			fmt.Fprintf(&b, "[失败] %s  %s\n", model.Name, err.Error())
			continue
		}
		if err := quotesEqual(got, model.ScaledQuotes); err != nil {
			problems = append(problems, fmt.Sprintf("%s: %s", model.Name, err.Error()))
			fmt.Fprintf(&b, "[失败] %s  %s\n", model.Name, err.Error())
			continue
		}
		if row.BillingExpr != model.Scaled || row.BillingMode != tieredMode {
			if row.BillingExpr != model.Scaled {
				problems = append(problems, fmt.Sprintf("%s 的 billing_expr 与缩放结果不一致", model.Name))
			}
			fmt.Fprintf(&b, "[失败] %s  表达式或计费模式与写入值不一致\n", model.Name)
			continue
		}
		for _, quote := range got {
			fmt.Fprintf(&b, "[通过] %s  %s  %s\n", model.Name, quote.Label, formatTierPrices(quote))
		}
		shown++
	}
	if len(problems) == 0 {
		fmt.Fprintf(&b, "校验通过：%d 个模型出现在定价列表，展示价格等于官方价 × 系数。\n", shown)
	}
	return b.String(), problems
}
