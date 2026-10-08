package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizePhoneAcceptsSupportedNumbers(t *testing.T) {
	cases := []struct {
		raw  string
		want string
	}{
		{raw: "+86 138-0013-8000", want: "+8613800138000"},
		{raw: "+12025550123", want: "+12025550123"},
		{raw: "+852 5123 4567", want: "+85251234567"},
		{raw: "+65 8123 4567", want: "+6581234567"},
		{raw: "   ", want: ""},
	}
	for _, tc := range cases {
		got, err := NormalizePhone(tc.raw)
		require.NoError(t, err)
		assert.Equal(t, tc.want, got)
	}
}

func TestNormalizePhoneRejectsUnsupportedNumbers(t *testing.T) {
	for _, raw := range []string{"13800138000", "+861380013800", "+440201234567", "+8612800138000", "abc"} {
		_, err := NormalizePhone(raw)
		assert.ErrorIs(t, err, ErrInvalidPhone)
	}
}
