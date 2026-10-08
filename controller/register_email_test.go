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

func TestRegisterRequiresEmailAndVerificationCode(t *testing.T) {
	setupRegisterTestDB(t)

	recorder := performRegister(t, `{
		"username":"newuser",
		"password":"password12",
		"email":"newuser@example.com",
		"phone":"+8613800138000"
	}`)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), `"success":false`)
	assert.Contains(t, recorder.Body.String(), "user.email_verification_required")
}

func TestRegisterRejectsPhoneVerificationCodeForEmail(t *testing.T) {
	setupRegisterTestDB(t)
	require.NoError(t, common.RegisterVerificationCodeWithKey("+8613800138000", "654321", common.PhoneVerificationPurpose))

	recorder := performRegister(t, `{
		"username":"newuser",
		"password":"password12",
		"email":"newuser@example.com",
		"phone":"+8613800138000",
		"verification_code":"654321"
	}`)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), `"success":false`)
	assert.Contains(t, recorder.Body.String(), "user.verification_code_error")
}

func TestRegisterStoresEmailAndUnverifiedPhone(t *testing.T) {
	setupRegisterTestDB(t)
	phone := "+8613800138000"
	code := "654321"
	require.NoError(t, common.RegisterVerificationCodeWithKey("verified@example.com", code, common.EmailVerificationPurpose))

	recorder := performRegister(t, `{
		"username":"verified",
		"password":"password12",
		"email":"verified@example.com",
		"phone":"+86 138-0013-8000",
		"verification_code":"654321"
	}`)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Body.String(), `"success":true`)

	user, err := model.GetUniqueUserByEmail("verified@example.com")
	require.NoError(t, err)
	assert.Equal(t, "verified", user.Username)
	assert.Equal(t, "verified@example.com", user.Email)
	assert.Equal(t, phone, user.Phone)
}

func TestRegisterAllowsAMissingPhone(t *testing.T) {
	setupRegisterTestDB(t)
	require.NoError(t, common.RegisterVerificationCodeWithKey("nophone@example.com", "654321", common.EmailVerificationPurpose))

	recorder := performRegister(t, `{
		"username":"nophone",
		"password":"password12",
		"email":"nophone@example.com",
		"verification_code":"654321"
	}`)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Body.String(), `"success":true`)

	user, err := model.GetUniqueUserByEmail("nophone@example.com")
	require.NoError(t, err)
	assert.Equal(t, "", user.Phone)
}

func TestRegisterRejectsAPhoneThatIsAlreadyUsed(t *testing.T) {
	setupRegisterTestDB(t)
	existing := model.User{
		Username:    "existing",
		Password:    "password12",
		DisplayName: "existing",
		Email:       "existing@example.com",
		Phone:       "+8613800138000",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
	}
	require.NoError(t, existing.Insert(0))
	require.NoError(t, common.RegisterVerificationCodeWithKey("second@example.com", "654321", common.EmailVerificationPurpose))

	recorder := performRegister(t, `{
		"username":"second",
		"password":"password12",
		"email":"second@example.com",
		"phone":"+8613800138000",
		"verification_code":"654321"
	}`)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), `"success":false`)
	assert.Contains(t, recorder.Body.String(), "user.phone_already_taken")
}
