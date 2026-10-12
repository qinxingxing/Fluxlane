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
)

type options struct {
	apply         bool
	sourceURL     string
	overridesPath string
	baseURL       string
	token         string
	timeout       time.Duration
}

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintf(os.Stderr, "official-price: %s\n", err)
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
	if strings.TrimSpace(opts.baseURL) == "" {
		return fmt.Errorf("需要环境变量 %s", envBaseURL)
	}
	gw, err := newGateway(opts.baseURL, opts.token, opts.timeout)
	if err != nil {
		return err
	}
	rows, err := gw.getPricing(ctx)
	if err != nil {
		return err
	}
	catalog := make([]string, 0, len(rows))
	pricedExpr := make(map[string]string, len(rows))
	for _, row := range rows {
		catalog = append(catalog, row.ModelName)
		if expr := strings.TrimSpace(row.BillingExpr); expr != "" {
			pricedExpr[row.ModelName] = expr
		}
	}

	exprMap := pricedExpr
	if strings.TrimSpace(opts.token) == "" {
		if opts.apply {
			return fmt.Errorf("写入需要环境变量 %s", envRootToken)
		}
		fmt.Fprintf(os.Stderr, "警告: 未设置 %s，只按公开定价列表预览，看不到未上架模型的计费表达式\n", envRootToken)
	} else if current, optionErr := gw.getOptions(ctx); optionErr != nil {
		if opts.apply {
			return optionErr
		}
		fmt.Fprintf(os.Stderr, "警告: 读取计费选项失败，只按公开定价列表预览: %s\n", optionErr.Error())
	} else {
		parsed, parseErr := parseStringMap(current[optionExprKey])
		if parseErr != nil {
			return fmt.Errorf("当前 %s 不是 JSON 对象: %w", optionExprKey, parseErr)
		}
		exprMap = parsed
	}

	names := siteModelNames(catalog, exprMap)
	updates, unchanged, missing, err := resolveOfficial(names, preset, manual, exprMap)
	if err != nil {
		return err
	}
	for _, name := range unchanged {
		fmt.Fprintf(os.Stdout, "保持 %s：已经是原价\n", name)
	}
	for _, name := range missing {
		fmt.Fprintf(os.Stderr, "警告: %s 没有官方原价，保持现状，不会按 0 定价\n", name)
	}
	if len(updates) == 0 {
		fmt.Fprintln(os.Stdout, "没有需要改回原价的模型。")
		return nil
	}
	writePlan(os.Stdout, updates, opts.apply)
	if !opts.apply {
		fmt.Fprintln(os.Stdout, "\ndry-run 结束，未写入。确认后加 --apply。")
		return nil
	}
	return applyAndVerify(ctx, gw, updates)
}

func parseArgs(args []string) (options, error) {
	fs := flag.NewFlagSet("official-price", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	fs.Usage = func() {
		fmt.Fprintf(os.Stderr, "用法: go run ./scripts/ops/official-price [--apply]\n\n")
		fmt.Fprintf(os.Stderr, "把定价列表和已有计费表达式里的模型改回官方原价。没有官方价的模型不改。\n")
		fmt.Fprintf(os.Stderr, "写入时读取环境变量 %s 和 %s。\n\n", envBaseURL, envRootToken)
		fs.PrintDefaults()
	}
	apply := fs.Bool("apply", false, "写入 billing_setting.billing_expr 与 billing_setting.billing_mode")
	sourceURL := fs.String("source-url", defaultSource, "new-api 官方倍率预设 JSON")
	overridesPath := fs.String("overrides", "", "手工原价 JSON 文件，形如 {\"模型名\":\"官方表达式\"}")
	timeout := fs.Duration("timeout", 120*time.Second, "整次运行和单次 HTTP 的超时；写入后要等另一台 API 节点同步")
	if err := fs.Parse(args); err != nil {
		return options{}, err
	}
	if fs.NArg() != 0 {
		return options{}, fmt.Errorf("不能接受位置参数 %q", fs.Arg(0))
	}
	return options{
		apply:         *apply,
		sourceURL:     strings.TrimSpace(*sourceURL),
		overridesPath: strings.TrimSpace(*overridesPath),
		baseURL:       strings.TrimSpace(os.Getenv(envBaseURL)),
		token:         strings.TrimSpace(os.Getenv(envRootToken)),
		timeout:       *timeout,
	}, nil
}

func loadOverrides(path string) (map[string]string, error) {
	payload, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("读取手工原价失败: %w", err)
	}
	var parsed map[string]string
	if err := common.Unmarshal(payload, &parsed); err != nil {
		return nil, fmt.Errorf("手工原价必须是 JSON 对象: %w", err)
	}
	if len(parsed) == 0 {
		return nil, fmt.Errorf("手工原价文件是空的")
	}
	for name, expr := range parsed {
		if strings.TrimSpace(name) == "" || strings.TrimSpace(expr) == "" {
			return nil, fmt.Errorf("手工原价里有空的模型名或表达式")
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
		if strings.TrimSpace(exprMap[name]) == expr && strings.TrimSpace(modeMap[name]) == tieredMode {
			delete(exprUpdates, name)
			delete(modeUpdates, name)
		}
	}
	if len(exprUpdates) == 0 {
		fmt.Fprintln(os.Stdout, "选项已是原价，跳过写入。")
		return nil
	}
	mergedExpr := mergeStringMaps(exprMap, exprUpdates)
	mergedMode := mergeStringMaps(modeMap, modeUpdates)
	exprJSON, err := marshalStringMap(mergedExpr)
	if err != nil {
		return err
	}
	modeJSON, err := marshalStringMap(mergedMode)
	if err != nil {
		return err
	}
	if gw.token != "" && (strings.Contains(exprJSON, gw.token) || strings.Contains(modeJSON, gw.token)) {
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
	if err := confirmBilling(ctx, gw, mergedExpr, mergedMode, exprUpdates, modeUpdates); err != nil {
		return err
	}
	fmt.Fprintln(os.Stdout, "写回校验通过：未改动的模型定价保持原样。")
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
	fmt.Fprintf(&b, "GET /api/pricing 校验（展示价 = 官方原价，单位 $/1M tokens）\n")
	for _, model := range models {
		row, ok := byName[model.Name]
		if !ok {
			fmt.Fprintf(&b, "[警告] %s  已写入计费选项，但当前不在定价列表中\n", model.Name)
			continue
		}
		if row.BillingExpr != model.Official || row.BillingMode != tieredMode {
			problems = append(problems, fmt.Sprintf("%s 的展示价格还不是原价", model.Name))
			fmt.Fprintf(&b, "[失败] %s  表达式或计费模式与原价不一致\n", model.Name)
			continue
		}
		fmt.Fprintf(&b, "[通过] %s\n", model.Name)
		shown++
	}
	if len(problems) == 0 {
		fmt.Fprintf(&b, "校验通过：%d 个模型出现在定价列表，展示价格等于官方原价。\n", shown)
	}
	return b.String(), problems
}
