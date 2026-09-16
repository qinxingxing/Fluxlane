package controller

import (
	"context"
	"io"

	"github.com/gin-gonic/gin"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
)

type salesforceLeadCreator interface {
	CreateLead(ctx context.Context, lead service.SalesforceLead) error
}

var newSalesforceLeadCreator = func() (salesforceLeadCreator, error) {
	return service.NewSalesforceClientFromEnv()
}

var enqueueSalesforceLead = service.EnqueueSalesforceLead

func enqueueRegistrationSalesforceLead(user *model.User) {
	if user == nil {
		return
	}
	enqueueSalesforceLead(service.LeadFromRegistration(user.Username, user.Email, user.DisplayName))
}

func SubmitSalesInquiry(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	var req dto.SalesInquiryRequest
	if err := common.Unmarshal(body, &req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	if service.IsSalesInquiryHoneypot(req) {
		common.ApiSuccessI18n(c, i18n.MsgSalesInquirySubmitted, gin.H{})
		return
	}
	inquiry, err := service.NormalizeSalesInquiry(req)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	client, err := newSalesforceLeadCreator()
	if err != nil {
		if service.IsSalesforceUnconfigured(err) {
			common.ApiErrorI18n(c, i18n.MsgFeatureDisabled)
			return
		}
		common.SysError("salesforce client: " + err.Error())
		common.ApiErrorI18n(c, i18n.MsgSalesInquiryFailed)
		return
	}
	if err := client.CreateLead(c.Request.Context(), service.LeadFromSalesInquiry(inquiry)); err != nil {
		if service.IsSalesforceUnconfigured(err) {
			common.ApiErrorI18n(c, i18n.MsgFeatureDisabled)
			return
		}
		common.ApiErrorI18n(c, i18n.MsgSalesInquiryFailed)
		return
	}
	common.ApiSuccessI18n(c, i18n.MsgSalesInquirySubmitted, gin.H{})
}
