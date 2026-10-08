package controller

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

func SendPhoneVerification(c *gin.Context) {
	phone, err := model.NormalizePhone(c.Query("phone"))
	if err != nil || phone == "" {
		common.ApiErrorI18n(c, i18n.MsgUserPhoneVerificationRequired)
		return
	}
	if model.IsPhoneAlreadyTaken(phone) {
		common.ApiErrorI18n(c, i18n.MsgUserPhoneAlreadyTaken)
		return
	}

	code := common.GenerateVerificationCode(6)
	if err := common.RegisterVerificationCodeWithKey(phone, code, common.PhoneVerificationPurpose); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("failed to store phone verification code: %s", err.Error()))
		common.ApiErrorI18n(c, i18n.MsgUserSMSSendFailed)
		return
	}
	if err := common.SendSMS(phone, code); err != nil {
		if deleteErr := common.DeleteVerificationCodeWithKey(phone, code, common.PhoneVerificationPurpose); deleteErr != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("failed to clean up phone verification code: %s", deleteErr.Error()))
		}
		if errors.Is(err, common.ErrSMSNotConfigured) {
			common.ApiErrorI18n(c, i18n.MsgUserSMSNotConfigured)
			return
		}
		logger.LogError(c.Request.Context(), fmt.Sprintf("failed to send phone verification sms: %s", err.Error()))
		common.ApiErrorI18n(c, i18n.MsgUserSMSSendFailed)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
