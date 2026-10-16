package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpdateOptionMapNormalizesEmailDomainBlacklist(t *testing.T) {
	previousList := common.EmailDomainBlacklist
	previousMap := common.OptionMap
	t.Cleanup(func() {
		common.EmailDomainBlacklist = previousList
		common.OptionMap = previousMap
	})
	common.OptionMap = map[string]string{}

	require.NoError(t, updateOptionMap("EmailDomainBlacklist", " MaxXspace.COM \nnotmaxxspace.com,maxxspace.com"))

	assert.Equal(t, []string{"maxxspace.com", "notmaxxspace.com"}, common.EmailDomainBlacklist)
	assert.Equal(t, "maxxspace.com,notmaxxspace.com", common.OptionMap["EmailDomainBlacklist"])
}
