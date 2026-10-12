package main

import (
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestScaleKeepsExplicitZeroAndTimeThresholds(t *testing.T) {
	glm := `tier("standard", p * 0.15 + cr * 0.03 + cc * 0 + c * 0.5)`
	scaled, quotes, err := ScaleOfficialExpr(glm, decimal.RequireFromString("0.8"))
	require.NoError(t, err)
	assert.Equal(t, `tier("standard", p * 0.12 + cr * 0.024 + cc * 0 + c * 0.4)`, scaled)
	assert.True(t, quotes[0].Coeffs["cc"].IsZero())

	deepseek := `weekday("UTC") >= 1 && weekday("UTC") <= 5 && ((hour("UTC") >= 1 && hour("UTC") < 4) || (hour("UTC") >= 6 && hour("UTC") < 10)) ? tier("peak", p * 0.3 + cr * 0.006 + c * 1.2) : tier("off_peak", p * 0.15 + cr * 0.003 + c * 0.6)`
	scaled, _, err = ScaleOfficialExpr(deepseek, decimal.RequireFromString("0.8"))
	require.NoError(t, err)
	assert.Equal(t, `weekday("UTC") >= 1 && weekday("UTC") <= 5 && ((hour("UTC") >= 1 && hour("UTC") < 4) || (hour("UTC") >= 6 && hour("UTC") < 10)) ? tier("peak", p * 0.24 + cr * 0.0048 + c * 0.96) : tier("off_peak", p * 0.12 + cr * 0.0024 + c * 0.48)`, scaled)
}

func TestScaleRejectsExpressionWithNoPositivePrice(t *testing.T) {
	_, _, err := ScaleOfficialExpr(`tier("base", p * 0)`, decimal.RequireFromString("0.8"))
	assert.Error(t, err)
	_, _, err = ScaleOfficialExpr(`tier("base", p * -1 + c * 2)`, decimal.RequireFromString("0.8"))
	assert.Error(t, err)
}

func TestLookupOfficialUsesAliasAndCase(t *testing.T) {
	preset := map[string]string{
		"glm-5.3-flash":             `tier("standard", p * 0.15 + c * 0.5)`,
		"claude-haiku-4-5-20251001": `tier("standard", p * 1 + c * 5)`,
	}
	expr, source, ok := lookupOfficial("GLM-5.3-Flash", preset, map[string]string{})
	require.True(t, ok)
	assert.Equal(t, preset["glm-5.3-flash"], expr)
	assert.Equal(t, "官方预设 glm-5.3-flash", source)

	expr, source, ok = lookupOfficial("claude-haiku-4-5-20251001-v1:0", preset, map[string]string{})
	require.True(t, ok)
	assert.Equal(t, preset["claude-haiku-4-5-20251001"], expr)
	assert.Contains(t, source, "claude-haiku-4-5-20251001")

	_, _, ok = lookupOfficial("kimi-k2.5", preset, map[string]string{})
	assert.False(t, ok)
}

func TestRetargetCatalogName(t *testing.T) {
	models := []pricedModel{{Name: "GLM-5.3-Flash", Source: "官方预设 glm-5.3-flash", Scaled: `tier("standard", p * 0.12 + c * 0.4)`}}
	got := retargetCatalogNames(models, []string{"glm-5.3-flash", "glm-5.3"})
	require.Equal(t, "glm-5.3-flash", got[0].Name)
	assert.Contains(t, got[0].Source, "glm-5.3-flash")

	same := retargetCatalogNames(models, []string{"GLM-5.3-Flash"})
	assert.Equal(t, "GLM-5.3-Flash", same[0].Name)
}

func TestSplitUnpricedLeavesExistingPrices(t *testing.T) {
	models := []pricedModel{
		{Name: "claude-opus-4-8", Scaled: `tier("standard", p * 4 + c * 20)`},
		{Name: "glm-5.3", Scaled: `tier("standard", p * 1.12 + c * 3.52)`},
	}
	current := map[string]string{
		"claude-opus-4-8": `tier("standard", p * 3.5 + c * 17.5)`,
	}
	unpriced, already := splitUnpriced(models, current)
	require.Len(t, unpriced, 1)
	assert.Equal(t, "glm-5.3", unpriced[0].Name)
	assert.Equal(t, []string{"claude-opus-4-8"}, already)
}
