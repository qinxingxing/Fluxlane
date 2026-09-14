package controller

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupRegisterTestDB(t *testing.T) {
	t.Helper()
	previousDB, previousLogDB := model.DB, model.LOG_DB
	previousRedis := common.RedisEnabled
	previousMain, previousLog := common.MainDatabaseType(), common.LogDatabaseType()
	previousEmailVerification := common.EmailVerificationEnabled
	previousRegister := common.RegisterEnabled
	previousPasswordRegister := common.PasswordRegisterEnabled
	previousDefaultToken := constant.GenerateDefaultToken

	common.RedisEnabled = false
	common.RegisterEnabled = true
	common.PasswordRegisterEnabled = true
	common.EmailVerificationEnabled = false
	constant.GenerateDefaultToken = false
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	model.DB, model.LOG_DB = db, db
	require.NoError(t, db.AutoMigrate(&model.User{}, &model.Log{}))

	t.Cleanup(func() {
		model.DB, model.LOG_DB = previousDB, previousLogDB
		common.RedisEnabled = previousRedis
		common.EmailVerificationEnabled = previousEmailVerification
		common.RegisterEnabled = previousRegister
		common.PasswordRegisterEnabled = previousPasswordRegister
		constant.GenerateDefaultToken = previousDefaultToken
		common.SetDatabaseTypes(previousMain, previousLog)
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})
}

func performRegister(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/user/register", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	Register(c)
	return recorder
}

func TestRegisterRequiresEmailAndVerificationCodeWhenSettingIsOff(t *testing.T) {
	setupRegisterTestDB(t)

	recorder := performRegister(t, `{
		"username":"newuser",
		"password":"password12"
	}`)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), `"success":false`)
	assert.Contains(t, recorder.Body.String(), "user.email_verification_required")
}

func TestRegisterRejectsEmailWithoutVerificationCode(t *testing.T) {
	setupRegisterTestDB(t)

	recorder := performRegister(t, `{
		"username":"newuser",
		"password":"password12",
		"email":"newuser@example.com"
	}`)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), `"success":false`)
	assert.Contains(t, recorder.Body.String(), "user.email_verification_required")
}

func TestRegisterStoresVerifiedEmail(t *testing.T) {
	setupRegisterTestDB(t)
	email := "verified@example.com"
	code := "654321"
	require.NoError(t, common.RegisterVerificationCodeWithKey(email, code, common.EmailVerificationPurpose))

	recorder := performRegister(t, `{
		"username":"verified",
		"password":"password12",
		"email":"verified@example.com",
		"verification_code":"654321"
	}`)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Body.String(), `"success":true`)

	user, err := model.GetUniqueUserByEmail(email)
	require.NoError(t, err)
	assert.Equal(t, "verified", user.Username)
	assert.Equal(t, email, user.Email)
}
