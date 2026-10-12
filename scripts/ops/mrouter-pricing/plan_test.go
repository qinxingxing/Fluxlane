package main

import (
	"bytes"
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveModelsUsesManualOverrideAndSkipsMissing(t *testing.T) {
	preset := map[string]string{
		"claude-opus-4-8":      `tier("standard", p * 5 + c * 25)`,
		"gemini-3-pro-preview": `tier("standard", p * 99 + c * 99)`,
	}
	manual := map[string]string{
		"gemini-3-pro-preview": `tier("standard", p * 2 + c * 12)`,
	}
	resolved, missing, err := resolveModels(
		[]string{"claude-opus-4-8", "gemini-3-pro-preview", "missing-model"},
		preset,
		manual,
		decimal.RequireFromString("0.7"),
	)
	require.NoError(t, err)
	assert.Equal(t, []string{"missing-model"}, missing)
	require.Len(t, resolved, 2)
	assert.Equal(t, sourcePreset, resolved[0].Source)
	assert.Equal(t, `tier("standard", p * 3.5 + c * 17.5)`, resolved[0].Scaled)
	assert.Equal(t, sourceManual, resolved[1].Source)
	assert.Equal(t, `tier("standard", p * 1.4 + c * 8.4)`, resolved[1].Scaled)
	assert.NotContains(t, resolved[1].Scaled, "99")
}

func TestResolveModelsRejectsBlankPriceInsteadOfZero(t *testing.T) {
	_, missing, err := resolveModels(
		[]string{"known", "blank"},
		map[string]string{"known": `tier("standard", p * 1 + c * 2)`, "blank": "  "},
		map[string]string{},
		decimal.RequireFromString("0.7"),
	)
	require.NoError(t, err)
	assert.Equal(t, []string{"blank"}, missing)
}

func TestMergeStringMapsKeepsModelsOutsideTheList(t *testing.T) {
	base := map[string]string{
		"other-model":     `tier("base", p * 9 + c * 9)`,
		"claude-opus-4-8": `tier("standard", p * 1 + c * 1)`,
	}
	updates := map[string]string{
		"claude-opus-4-8": `tier("standard", p * 3.5 + c * 17.5)`,
	}
	merged := mergeStringMaps(base, updates)
	assert.Equal(t, `tier("base", p * 9 + c * 9)`, merged["other-model"])
	assert.Equal(t, updates["claude-opus-4-8"], merged["claude-opus-4-8"])

	problems := diffStringMap(merged, merged, updates)
	assert.Empty(t, problems)

	changed := mergeStringMaps(merged, map[string]string{"other-model": `tier("base", p * 0 + c * 0)`})
	problems = diffStringMap(changed, merged, updates)
	assert.Equal(t, []string{"模型 other-model 不在本次清单内，但原有定价被改动"}, problems)
}

func TestVerifyPricingChecksEachTier(t *testing.T) {
	official := `len <= 200000 ? tier("0_200k", p * 2 + c * 12) : tier("200k_plus", p * 4 + c * 18)`
	scaled, quotes, err := ScaleOfficialExpr(official, decimal.RequireFromString("0.7"))
	require.NoError(t, err)
	models := []pricedModel{{
		Name:         "gemini-3-pro-preview",
		Source:       sourceManual,
		Official:     official,
		Scaled:       scaled,
		ScaledQuotes: quotes,
	}}
	rows := []pricingRow{{
		ModelName:   "gemini-3-pro-preview",
		BillingMode: tieredMode,
		BillingExpr: scaled,
	}}
	report, problems := verifyPricing(rows, models)
	assert.Empty(t, problems)
	assert.Contains(t, report, "[通过] gemini-3-pro-preview  0_200k")
	assert.Contains(t, report, "输入 1.4")
	assert.Contains(t, report, "[通过] gemini-3-pro-preview  200k_plus")
	assert.Contains(t, report, "输出 12.6")

	rows[0].BillingExpr = official
	_, problems = verifyPricing(rows, models)
	assert.NotEmpty(t, problems)
}

func TestWritePlanIncludesOfficialAndScaledExpr(t *testing.T) {
	var buf bytes.Buffer
	writePlan(&buf, "0.7", []pricedModel{{
		Name:     "claude-opus-4-8",
		Source:   sourcePreset,
		Official: `tier("standard", p * 5 + c * 25)`,
		Scaled:   `tier("standard", p * 3.5 + c * 17.5)`,
		ScaledQuotes: []TierQuote{{
			Label: "standard",
			Coeffs: map[string]decimal.Decimal{
				"p": decimal.RequireFromString("3.5"),
				"c": decimal.RequireFromString("17.5"),
			},
		}},
	}}, false)
	text := buf.String()
	assert.Contains(t, text, "dry-run")
	assert.Contains(t, text, "claude-opus-4-8")
	assert.Contains(t, text, `官方  tier("standard", p * 5 + c * 25)`)
	assert.Contains(t, text, `×0.7  tier("standard", p * 3.5 + c * 17.5)`)
	assert.NotContains(t, text, "sk-")
}
