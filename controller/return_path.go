package controller

import "github.com/QuantumNous/new-api/service"

func paymentReturnPath(suffix string) string {
	return service.PaymentReturnURL(suffix)
}
