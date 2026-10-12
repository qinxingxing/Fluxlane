package main

import (
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCatalogScalesOfficialPriceByGroupFactor(t *testing.T) {
	catalog, err := loadOfficialCatalog("../../../web/src/features/pricing/data/official-prices.json")
	require.NoError(t, err)
	require.GreaterOrEqual(t, len(catalog), 28)

	deepseek := catalog["deepseek-v4-pro"]
	assert.Equal(t, "DeepSeek", deepseek.Group)
	assert.True(t, deepseek.Factor.Equal(decimal.RequireFromString("0.8")))
	official, err := ParseTierQuotes(deepseek.BillingExpr)
	require.NoError(t, err)
	_, scaled, err := ScaleOfficialExpr(deepseek.BillingExpr, deepseek.Factor.Decimal)
	require.NoError(t, err)
	assert.True(t, quoteCoeff(official, "peak", "p").Equal(decimal.RequireFromString("1.32")))
	assert.True(t, quoteCoeff(scaled, "peak", "p").Equal(decimal.RequireFromString("1.056")))
	assert.True(t, quoteCoeff(scaled, "peak", "c").Equal(decimal.RequireFromString("3.168")))

	fable := catalog["claude-fable-5"]
	assert.True(t, fable.Factor.Equal(decimal.RequireFromString("0.95")))
	_, fableQuotes, err := ScaleOfficialExpr(fable.BillingExpr, fable.Factor.Decimal)
	require.NoError(t, err)
	assert.True(t, quoteCoeff(fableQuotes, "standard", "p").Equal(decimal.RequireFromString("9.5")))
	assert.True(t, quoteCoeff(fableQuotes, "standard", "c").Equal(decimal.RequireFromString("47.5")))

	glm := catalog["glm-5.2"]
	assert.Equal(t, "智谱", glm.Group)
	assert.True(t, glm.ModelRatio.Mul(glm.Factor.Decimal).Equal(decimal.RequireFromString("0.42")))
}

func TestEmptyLiveExpressionIsPricedFromOfficial(t *testing.T) {
	catalog := map[string]officialEntry{
		"gpt-5.1": {
			Group:       "Openai",
			Factor:      jsonDecimal{Decimal: decimal.RequireFromString("0.9")},
			BillingExpr: `tier("standard", p * 1.25 + cr * 0.125 + c * 10)`,
			ModelRatio:  jsonDecimal{Decimal: decimal.RequireFromString("37.5")},
		},
	}
	live := map[string]livePrice{
		"gpt-5.1": {ModelRatio: decimal.RequireFromString("37.5")},
	}
	plans, unpublished, err := buildGroupPlans(catalog, live)
	require.NoError(t, err)
	assert.Empty(t, unpublished)
	require.Len(t, plans, 1)
	assert.False(t, plans[0].AlreadyApplied)
	assert.Contains(t, plans[0].ScaledExpr, "p * 1.125")
	assert.Contains(t, plans[0].ScaledExpr, "c * 9")
}

func quoteCoeff(quotes []TierQuote, label, name string) decimal.Decimal {
	for _, quote := range quotes {
		if quote.Label != label {
			continue
		}
		return quote.Coeffs[name]
	}
	return decimal.Zero
}
