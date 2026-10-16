package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeEmailDomainListTrimsCaseAndDuplicates(t *testing.T) {
	domains := NormalizeEmailDomainList(" MaxXspace.COM \nnotmaxxspace.com,maxxspace.com,")

	require.Equal(t, []string{"maxxspace.com", "notmaxxspace.com"}, domains)
	assert.Empty(t, NormalizeEmailDomainList(" , \n "))
}

func TestRegistrationEmailDomainBlockIsExact(t *testing.T) {
	previous := EmailDomainBlacklist
	t.Cleanup(func() {
		EmailDomainBlacklist = previous
	})
	EmailDomainBlacklist = []string{" MaxXspace.COM "}

	assert.True(t, IsRegistrationEmailDomainBlocked("  User@MaxXspace.COM "))
	assert.True(t, IsRegistrationEmailDomainBlocked("user@ MaxXspace.com"))
	assert.False(t, IsRegistrationEmailDomainBlocked("user@notmaxxspace.com"))
	assert.False(t, IsRegistrationEmailDomainBlocked("user@maxxspace.com.example"))
	assert.False(t, IsRegistrationEmailDomainBlocked("user@sub.maxxspace.com"))
}
