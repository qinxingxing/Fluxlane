package main

// 把全站模型的计费表达式改回官方原价。
// 定价写在全局 billing_setting 上，按模型名生效，不是渠道级配置。
const (
	defaultSource = "https://basellm.github.io/llm-metadata/api/newapi/ratio_config-v1-base.json"

	envBaseURL   = "FLUXLANE_BASE_URL"
	envRootToken = "FLUXLANE_ROOT_TOKEN"

	optionExprKey = "billing_setting.billing_expr"
	optionModeKey = "billing_setting.billing_mode"
	tieredMode    = "tiered_expr"
)

func officialAliases() map[string]string {
	return map[string]string{
		"claude-haiku-4-5-20251001-v1:0": "claude-haiku-4-5-20251001",
	}
}

// manualOfficialExpr 是官方预设里没有的原价。
// gemini-3-pro-preview 用 Google 公布的分档标价：
// 上下文 ≤200k 为输入 $2、缓存读 $0.20、输出 $12；>200k 为输入 $4、缓存读 $0.40、输出 $18。
func manualOfficialExpr() map[string]string {
	return map[string]string{
		"gemini-3-pro-preview": `len <= 200000 ? tier("0_200k", p * 2 + cr * 0.2 + c * 12) : tier("200k_plus", p * 4 + cr * 0.4 + c * 18)`,
	}
}
