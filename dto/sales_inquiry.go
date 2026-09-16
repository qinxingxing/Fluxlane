package dto

const (
	SalesInquiryBudget0To1000     = "0-1000"
	SalesInquiryBudget1000To5000  = "1000-5000"
	SalesInquiryBudget5000To20000 = "5000-20000"
	SalesInquiryBudget20000Plus   = "20000-plus"

	MaxSalesInquiryCompanyLen     = 255
	MaxSalesInquiryEmailLen       = 80
	MaxSalesInquiryPhoneLen       = 40
	MaxSalesInquiryModelLen       = 255
	MaxSalesInquiryDescriptionLen = 4000
)

// SalesInquiryRequest is the public contact form payload.
type SalesInquiryRequest struct {
	Company        string `json:"company"`
	Email          string `json:"email"`
	Phone          string `json:"phone"`
	RequestedModel string `json:"requested_model"`
	MonthlyBudget  string `json:"monthly_budget"`
	Description    string `json:"description"`
	Website        string `json:"website"` // honeypot; must stay empty
}

type SalesInquiry struct {
	Company        string
	Email          string
	Phone          string
	RequestedModel string
	MonthlyBudget  string
	Description    string
}
