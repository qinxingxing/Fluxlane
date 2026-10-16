package i18n

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEmailDomainNotSupportedMessage(t *testing.T) {
	require.NoError(t, Init())

	assert.Equal(t, "该邮箱域名暂不支持注册，请使用其他邮箱", Translate("zh-CN", MsgUserEmailDomainNotSupported))
	assert.Equal(t, "该邮箱域名暂不支持注册，请使用其他邮箱", Translate("zh", MsgUserEmailDomainNotSupported))
	assert.Equal(t, "This email domain is not supported for registration. Please use another email.", Translate("en", MsgUserEmailDomainNotSupported))
}
