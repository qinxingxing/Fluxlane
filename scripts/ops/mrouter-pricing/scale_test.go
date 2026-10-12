package main

import (
	"strings"
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestScaleOfficialExprOpusPointSeven(t *testing.T) {
	official := `tier("standard", p * 5 + cr * 0.5 + cc * 6.25 + cc1h * 10 + c * 25)`
	scaled, quotes, err := ScaleOfficialExpr(official, decimal.RequireFromString("0.7"))
	require.NoError(t, err)
	assert.Equal(t, `tier("standard", p * 3.5 + cr * 0.35 + cc * 4.375 + cc1h * 7 + c * 17.5)`, scaled)
	require.Len(t, quotes, 1)
	assert.Equal(t, "standard", quotes[0].Label)
	assert.True(t, quotes[0].Coeffs["p"].Equal(decimal.RequireFromString("3.5")))
	assert.True(t, quotes[0].Coeffs["c"].Equal(decimal.RequireFromString("17.5")))
}

func TestScaleOfficialExprKeepsTierThresholds(t *testing.T) {
	official := `len <= 200000 ? tier("0_200k", p * 1.25 + cr * 0.125 + c * 10) : tier("200k_plus", p * 2.5 + cr * 0.25 + c * 15)`
	scaled, quotes, err := ScaleOfficialExpr(official, decimal.RequireFromString("0.7"))
	require.NoError(t, err)
	assert.Equal(t, `len <= 200000 ? tier("0_200k", p * 0.875 + cr * 0.0875 + c * 7) : tier("200k_plus", p * 1.75 + cr * 0.175 + c * 10.5)`, scaled)
	require.Len(t, quotes, 2)
	assert.Equal(t, "0_200k", quotes[0].Label)
	assert.Equal(t, "200k_plus", quotes[1].Label)
	assert.True(t, quotes[0].Coeffs["p"].Equal(decimal.RequireFromString("0.875")))
	assert.True(t, quotes[1].Coeffs["c"].Equal(decimal.RequireFromString("10.5")))
	assert.Equal(t, strings.Count(official, "200000"), strings.Count(scaled, "200000"))
}

func TestScaleOfficialExprDecimalAudioCoeff(t *testing.T) {
	official := `tier("standard", p * 0.3 + cr * 0.03 + ai * 1 + c * 2.5)`
	scaled, _, err := ScaleOfficialExpr(official, decimal.RequireFromString("0.7"))
	require.NoError(t, err)
	assert.Equal(t, `tier("standard", p * 0.21 + cr * 0.021 + ai * 0.7 + c * 1.75)`, scaled)
}

func TestScaleOfficialExprManualGemini3Pro(t *testing.T) {
	official := manualOfficialExpr()["gemini-3-pro-preview"]
	scaled, quotes, err := ScaleOfficialExpr(official, decimal.RequireFromString("0.7"))
	require.NoError(t, err)
	assert.Equal(t, `len <= 200000 ? tier("0_200k", p * 1.4 + cr * 0.14 + c * 8.4) : tier("200k_plus", p * 2.8 + cr * 0.28 + c * 12.6)`, scaled)
	require.Len(t, quotes, 2)
	assert.True(t, quotes[1].Coeffs["cr"].Equal(decimal.RequireFromString("0.28")))
}

func TestScaleOfficialExprLeavesRequestRuleMultiplier(t *testing.T) {
	official := `(tier("base", p * 5 + c * 25)) * (has(header("anthropic-beta"), "fast-mode") ? 6 : 1)`
	scaled, _, err := ScaleOfficialExpr(official, decimal.RequireFromString("0.7"))
	require.NoError(t, err)
	assert.Equal(t, `(tier("base", p * 3.5 + c * 17.5)) * (has(header("anthropic-beta"), "fast-mode") ? 6 : 1)`, scaled)
}

func TestScaleOfficialExprPreservesVersionPrefixAndFactorOne(t *testing.T) {
	official := `v1:tier("base", p * 5 + c * 25)`
	unchanged, _, err := ScaleOfficialExpr(official, decimal.RequireFromString("1"))
	require.NoError(t, err)
	assert.Equal(t, official, unchanged)

	scaled, _, err := ScaleOfficialExpr(official, decimal.RequireFromString("0.7"))
	require.NoError(t, err)
	assert.Equal(t, `v1:tier("base", p * 3.5 + c * 17.5)`, scaled)
}

func TestScaleOfficialExprAcceptsCoeffOnTheLeft(t *testing.T) {
	scaled, _, err := ScaleOfficialExpr(`tier("base", 5 * p + 25 * c)`, decimal.RequireFromString("0.7"))
	require.NoError(t, err)
	assert.Equal(t, `tier("base", 3.5 * p + 17.5 * c)`, scaled)
}

func TestScaleOfficialExprRejectsUnsafeShapes(t *testing.T) {
	factor := decimal.RequireFromString("0.7")
	cases := []string{
		`p * 5 + c * 15`,
		`tier("base", p * 5 * 2)`,
		`tier("base", p)`,
		`tier("base", p * 0)`,
		`tier("base", len * 5)`,
		``,
	}
	for _, expr := range cases {
		_, _, err := ScaleOfficialExpr(expr, factor)
		assert.Error(t, err, expr)
	}
	_, _, err := ScaleOfficialExpr(`tier("base", p * 5)`, decimal.Zero)
	assert.Error(t, err)
	_, _, err = ScaleOfficialExpr(`tier("base", p * 5)`, decimal.RequireFromString("-0.7"))
	assert.Error(t, err)
}

func TestScaleOfficialExprMatchesPresetShapes(t *testing.T) {
	factor := decimal.RequireFromString("0.7")
	for name, official := range presetShapes() {
		t.Run(name, func(t *testing.T) {
			officialQuotes, err := ParseTierQuotes(official)
			require.NoError(t, err)
			scaled, scaledQuotes, err := ScaleOfficialExpr(official, factor)
			require.NoError(t, err)
			require.Len(t, scaledQuotes, len(officialQuotes))
			for i, quote := range officialQuotes {
				assert.Equal(t, quote.Label, scaledQuotes[i].Label)
				for key, value := range quote.Coeffs {
					assert.Truef(t, scaledQuotes[i].Coeffs[key].Equal(value.Mul(factor)), "%s %s", quote.Label, key)
				}
			}
			assert.Equal(t, strings.Count(official, "200000"), strings.Count(scaled, "200000"))
			assert.Equal(t, strings.Count(official, "272000"), strings.Count(scaled, "272000"))
		})
	}
}

func presetShapes() map[string]string {
	return map[string]string{
		"claude-fable-5":                `tier("standard", p * 10 + cr * 1 + cc * 12.5 + cc1h * 20 + c * 50)`,
		"claude-fable-5-1":              `tier("standard", p * 10 + cr * 0.25 + cc * 12.5 + cc1h * 20 + c * 50)`,
		"claude-haiku-4-5-20251001":     `tier("standard", p * 1 + cr * 0.1 + cc * 1.25 + cc1h * 2 + c * 5)`,
		"claude-opus-4-8":               `tier("standard", p * 5 + cr * 0.5 + cc * 6.25 + cc1h * 10 + c * 25)`,
		"claude-opus-5-5":               `tier("standard", p * 4 + cr * 0.2 + cc * 5 + cc1h * 8 + c * 20)`,
		"claude-sonnet-4-6":             `tier("standard", p * 3 + cr * 0.3 + cc * 3.75 + cc1h * 6 + c * 15)`,
		"claude-sonnet-5":               `tier("standard", p * 2 + cr * 0.2 + cc * 2.5 + cc1h * 4 + c * 10)`,
		"gemini-2.5-flash":              `tier("standard", p * 0.3 + cr * 0.03 + ai * 1 + c * 2.5)`,
		"gemini-2.5-flash-lite":         `tier("standard", p * 0.1 + cr * 0.01 + ai * 0.3 + c * 0.4)`,
		"gemini-2.5-pro":                `len <= 200000 ? tier("0_200k", p * 1.25 + cr * 0.125 + c * 10) : tier("200k_plus", p * 2.5 + cr * 0.25 + c * 15)`,
		"gemini-3-flash-preview":        `tier("standard", p * 0.5 + cr * 0.05 + ai * 1 + c * 3)`,
		"gemini-3.1-flash-lite-preview": `tier("standard", p * 0.25 + cr * 0.025 + ai * 0.5 + c * 1.5)`,
		"gemini-3.1-pro-preview":        `len <= 200000 ? tier("0_200k", p * 2 + cr * 0.2 + c * 12) : tier("200k_plus", p * 4 + cr * 0.4 + c * 18)`,
		"gpt-5.5":                       `len <= 272000 ? tier("0_272k", p * 5 + cr * 0.5 + c * 30) : tier("272k_plus", p * 10 + cr * 1 + c * 45)`,
		"gpt-5.6-luna":                  `len <= 272000 ? tier("0_272k", p * 0.2 + cr * 0.02 + cc * 0.25 + c * 1.2) : tier("272k_plus", p * 0.4 + cr * 0.04 + cc * 0.5 + c * 1.8)`,
		"gpt-5.6-sol":                   `len <= 272000 ? tier("0_272k", p * 4 + cr * 0.4 + cc * 5 + c * 20) : tier("272k_plus", p * 8 + cr * 0.8 + cc * 10 + c * 30)`,
		"gpt-5.6-terra":                 `len <= 272000 ? tier("0_272k", p * 2 + cr * 0.2 + cc * 2.5 + c * 12) : tier("272k_plus", p * 4 + cr * 0.4 + cc * 5 + c * 18)`,
		"gpt-6-astra":                   `len <= 272000 ? tier("0_272k", p * 10 + cr * 1 + cc * 12.5 + c * 50) : tier("272k_plus", p * 20 + cr * 2 + cc * 25 + c * 75)`,
		"gpt-6-sol":                     `len <= 272000 ? tier("0_272k", p * 2 + cr * 0.2 + cc * 2.5 + c * 10) : tier("272k_plus", p * 4 + cr * 0.4 + cc * 5 + c * 15)`,
		"grok-4.5":                      `len <= 200000 ? tier("0_200k", p * 2 + cr * 0.3 + c * 6) : tier("200k_plus", p * 4 + cr * 0.6 + c * 12)`,
		"grok-4.6":                      `len <= 200000 ? tier("0_200k", p * 2 + cr * 0.5 + c * 6) : tier("200k_plus", p * 4 + cr * 1 + c * 12)`,
	}
}
