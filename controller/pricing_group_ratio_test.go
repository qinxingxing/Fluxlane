package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
)

func TestPricingGroupRatiosIncludesVendorGroupsOnPublishedModels(t *testing.T) {
	ratios := map[string]float64{
		"官方":       1,
		"DeepSeek": 0.8,
		"Kimi":     0.9,
		"内部":       0.5,
	}
	models := []model.Pricing{
		{ModelName: "deepseek-v4-pro", EnableGroup: []string{"官方", "DeepSeek"}},
		{ModelName: "kimi-k3", EnableGroup: []string{"Kimi", "官方"}},
	}

	displayed := pricingGroupRatios(models, map[string]string{"官方": ""}, ratios)

	assert.Equal(t, 1.0, displayed["官方"])
	assert.Equal(t, 0.8, displayed["DeepSeek"])
	assert.Equal(t, 0.9, displayed["Kimi"])
	_, hidden := displayed["内部"]
	assert.False(t, hidden)
}
