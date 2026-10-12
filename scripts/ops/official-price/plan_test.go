package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveOfficialOverwritesDiscountAndKeepsOriginal(t *testing.T) {
	official := `tier("standard", p * 5 + c * 25)`
	preset := map[string]string{"claude-opus-4-8": official}
	current := map[string]string{
		"claude-opus-4-8": `tier("standard", p * 3.5 + c * 17.5)`,
		"claude-fable-5":  `tier("standard", p * 10 + c * 50)`,
	}
	preset["claude-fable-5"] = current["claude-fable-5"]
	updates, unchanged, missing, err := resolveOfficial(
		[]string{"claude-opus-4-8", "claude-fable-5", "kimi-k2.5"},
		preset,
		map[string]string{},
		current,
	)
	require.NoError(t, err)
	require.Len(t, updates, 1)
	assert.Equal(t, "claude-opus-4-8", updates[0].Name)
	assert.Equal(t, official, updates[0].Official)
	assert.Equal(t, []string{"claude-fable-5"}, unchanged)
	assert.Equal(t, []string{"kimi-k2.5"}, missing)
}

func TestManualOfficialForGemini3Pro(t *testing.T) {
	expr, source, ok := lookupOfficial("gemini-3-pro-preview", map[string]string{}, manualOfficialExpr())
	require.True(t, ok)
	assert.Equal(t, sourceManual, source)
	assert.Contains(t, expr, "p * 2")
	assert.Contains(t, expr, "p * 4")
	_, err := ParseTierQuotes(expr)
	require.NoError(t, err)
}

func TestSiteModelNamesIncludesStoredExpr(t *testing.T) {
	names := siteModelNames(
		[]string{"glm-5.3-flash"},
		map[string]string{"kimi-k3": `tier("standard", p * 1 + c * 1)`, "glm-5.3-flash": `tier("standard", p * 1 + c * 1)`},
	)
	assert.Equal(t, []string{"glm-5.3-flash", "kimi-k3"}, names)
}
