package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetUserGroupsShowsOfficialGroupWhenVendorRatiosOmitIt(t *testing.T) {
	db := openTokenControllerTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.User{}))
	user := &model.User{
		Id:       77,
		Username: "new-console-user",
		Password: "password",
		Group:    "default",
		Status:   common.UserStatusEnabled,
		Role:     common.RoleCommonUser,
	}
	require.NoError(t, db.Create(user).Error)

	originalUsable := setting.UserUsableGroups2JSONString()
	originalRatios := ratio_setting.GroupRatio2JSONString()
	t.Cleanup(func() {
		require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(originalUsable))
		require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(originalRatios))
	})
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"Openai":"","DeepSeek":"","GLM":"","Kimi":"","Anthropic":""}`))
	require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(`{"Openai":0.9,"DeepSeek":0.8,"GLM":0.8,"Kimi":0.8,"Anthropic":0.95}`))

	customer := callGetUserGroups(t, user.Id, common.RoleCommonUser)
	assert.Contains(t, customer, "DeepSeek")
	assert.Contains(t, customer, "Openai")
	assert.Equal(t, 0.8, customer["DeepSeek"].Ratio)
	assert.NotContains(t, customer, service.OfficialGroupName)
	assert.NotContains(t, customer, "vip")

	admin := callGetUserGroups(t, user.Id, common.RoleAdminUser)
	assert.Contains(t, admin, "DeepSeek")
	assert.Contains(t, admin, "Openai")
	assert.NotContains(t, admin, service.OfficialGroupName)
}

type userGroupOption struct {
	Ratio float64 `json:"ratio"`
	Desc  string  `json:"desc"`
}

func callGetUserGroups(t *testing.T, userID int, role int) map[string]userGroupOption {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Set("id", userID)
	ctx.Set("role", role)

	GetUserGroups(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	var body struct {
		Success bool                       `json:"success"`
		Data    map[string]userGroupOption `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &body))
	require.True(t, body.Success)
	return body.Data
}
