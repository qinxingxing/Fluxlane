package main

// MRouter 渠道的默认定价参数。
// 定价写在全局 billing_setting 上，不是渠道级配置。
// 这 27 个模型名当前只有 MRouter 在售，效果等同于给该渠道定价。
// 以后若有别的渠道上架同名模型，会共用这里写入的价格。
const (
	defaultFactor = "0.7"
	defaultSource = "https://basellm.github.io/llm-metadata/api/newapi/ratio_config-v1-base.json"

	envBaseURL   = "FLUXLANE_BASE_URL"
	envRootToken = "FLUXLANE_ROOT_TOKEN"

	optionExprKey = "billing_setting.billing_expr"
	optionModeKey = "billing_setting.billing_mode"
	tieredMode    = "tiered_expr"
)

func defaultModels() []string {
	return []string{
		"claude-fable-5",
		"claude-fable-5-1",
		"claude-haiku-4-5-20251001",
		"claude-opus-4-5-20251101",
		"claude-opus-4-6",
		"claude-opus-4-7",
		"claude-opus-4-8",
		"claude-opus-5",
		"claude-opus-5-5",
		"claude-sonnet-4-5-20250929",
		"claude-sonnet-4-6",
		"claude-sonnet-5",
		"gemini-2.5-flash",
		"gemini-2.5-flash-lite",
		"gemini-2.5-pro",
		"gemini-3-flash-preview",
		"gemini-3-pro-preview",
		"gemini-3.1-flash-lite-preview",
		"gemini-3.1-pro-preview",
		"gpt-5.5",
		"gpt-5.6-luna",
		"gpt-5.6-sol",
		"gpt-5.6-terra",
		"gpt-6-astra",
		"gpt-6-sol",
		"grok-4.5",
		"grok-4.6",
	}
}

// manualOfficialExpr 是官方预设里没有、需要手工给出的官方表达式（$/1M tokens，尚未乘系数）。
// gemini-3-pro-preview 不在 new-api 官方预设中。这里用 Google 公布的分档标价：
// 上下文 ≤200k 为输入 $2、缓存读 $0.20、输出 $12；>200k 为输入 $4、缓存读 $0.40、输出 $18。
// 音频与文本同一输入价，所以表达式里没有单独的 ai 项。
// 可用 --overrides 覆盖这一表。
func manualOfficialExpr() map[string]string {
	return map[string]string{
		"gemini-3-pro-preview": `len <= 200000 ? tier("0_200k", p * 2 + cr * 0.2 + c * 12) : tier("200k_plus", p * 4 + cr * 0.4 + c * 18)`,
	}
}
