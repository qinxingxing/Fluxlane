package main

// 给清单里尚未写入计费表达式的模型补官方价 × 0.8。
// 已经有 billing_expr 的模型保持原价，包括此前 MRouter 脚本写入的 ×0.7。
// 定价仍是按模型名的全局设置，不是渠道级配置。
const (
	defaultFactor = "0.8"
	defaultSource = "https://basellm.github.io/llm-metadata/api/newapi/ratio_config-v1-base.json"

	envBaseURL   = "FLUXLANE_BASE_URL"
	envRootToken = "FLUXLANE_ROOT_TOKEN"

	optionExprKey = "billing_setting.billing_expr"
	optionModeKey = "billing_setting.billing_mode"
	tieredMode    = "tiered_expr"
)

func defaultModels() []string {
	return []string{
		"GLM-5.3-Flash",
		"deepseek-v4-flash",
		"deepseek-v4-flash-0731",
		"deepseek-v4-pro",
		"deepseek-v4-pro-0813",
		"deepseek-v4.1-flash",
		"gemini-3.1-flash-lite",
		"gemini-3.1-pro-preview",
		"gemini-3.5-flash",
		"gemini-3.5-flash-lite",
		"gemini-3.6-flash",
		"gemini-3.7-flash",
		"gemini-3.8-flash",
		"glm-5.3",
		"claude-fable-5",
		"claude-fable-5-1",
		"claude-haiku-4-5-20251001-v1:0",
		"claude-haiku-5-5",
		"claude-opus-4-8",
		"claude-opus-5",
		"claude-opus-5-5",
		"claude-sonnet-4-6",
		"claude-sonnet-5",
		"claude-sonnet-5-5",
		"gpt-5.6-sol",
		"gpt-5.6-terra",
		"gpt-6-astra",
		"gpt-6-sol",
		"gpt-6.1-sol",
		"kimi-k2.5",
		"kimi-k2.6",
		"kimi-k2.7-code",
		"kimi-k2.7-code-highspeed",
		"kimi-k3",
	}
}

// officialAliases 把渠道上的模型名对应到官方预设里的另一个名字。
// claude-haiku-4-5-20251001-v1:0 是 Bedrock 带版本后缀的同一模型。
func officialAliases() map[string]string {
	return map[string]string{
		"claude-haiku-4-5-20251001-v1:0": "claude-haiku-4-5-20251001",
	}
}

func manualOfficialExpr() map[string]string {
	return map[string]string{}
}
