package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPublicBrandName(t *testing.T) {
	require.Equal(t, "Fluxlane", PublicBrandName(""))
	require.Equal(t, "Fluxlane", PublicBrandName("New API"))
	require.Equal(t, "Fluxlane", PublicBrandName("NewAPI"))
	require.Equal(t, "Fluxlane", PublicBrandName("FluxLane"))
	require.Equal(t, "Fluxlane.ai", PublicBrandName("FluxLane.ai"))
	assert.Equal(t, "Acme Gateway", PublicBrandName("Acme Gateway"))
}

func TestPublicDocsLink(t *testing.T) {
	require.Equal(t, PublicDocsLinkDefault, PublicDocsLink(""))
	require.Equal(t, PublicDocsLinkDefault, PublicDocsLink("https://docs.newapi.pro"))
	require.Equal(t, PublicDocsLinkDefault, PublicDocsLink("https://docs.newapi.pro/wiki/"))
	assert.Equal(t, "https://doc.fluxlane.ai/", PublicDocsLink("https://doc.fluxlane.ai/"))
}
