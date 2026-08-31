package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Release verification maps a running node back to one source commit through
// /api/status. Both the release tag and the full commit must be reported, so a
// deployed node can be checked against the release manifest.
func TestGetStatusReportsReleaseIdentity(t *testing.T) {
	previousMap := common.OptionMap
	previousVersion := common.Version
	previousCommit := common.GitCommit
	common.OptionMap = map[string]string{}
	common.Version = "prod-20260828-3c52e436"
	common.GitCommit = "3c52e436d9dc5e76929aff648258cbff8b6195f6"
	t.Cleanup(func() {
		common.OptionMap = previousMap
		common.Version = previousVersion
		common.GitCommit = previousCommit
	})

	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)

	GetStatus(context)

	var payload struct {
		Success bool           `json:"success"`
		Data    map[string]any `json:"data"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	require.True(t, payload.Success)
	assert.Equal(t, "prod-20260828-3c52e436", payload.Data["version"])
	assert.Equal(t, "3c52e436d9dc5e76929aff648258cbff8b6195f6", payload.Data["git_commit"])
}
