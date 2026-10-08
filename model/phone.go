package model

import (
	"strings"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

var phoneCountryCodes = []string{"+852", "+86", "+65", "+1"}

var phoneNationalLengths = map[string]int{
	"+86":  11,
	"+1":   10,
	"+852": 8,
	"+65":  8,
}

// NormalizePhone canonicalizes a registration phone number to E.164.
// An empty value stays empty so OAuth accounts can omit a phone number.
func NormalizePhone(raw string) (string, error) {
	compact := compactPhone(raw)
	if compact == "" {
		return "", nil
	}
	if !strings.HasPrefix(compact, "+") {
		return "", ErrInvalidPhone
	}
	for _, code := range phoneCountryCodes {
		if !strings.HasPrefix(compact, code) {
			continue
		}
		national := compact[len(code):]
		if !isDecimalDigits(national) || len(national) != phoneNationalLengths[code] {
			return "", ErrInvalidPhone
		}
		if code == "+86" && (national[0] != '1' || national[1] < '3') {
			return "", ErrInvalidPhone
		}
		return code + national, nil
	}
	return "", ErrInvalidPhone
}

func compactPhone(raw string) string {
	var builder strings.Builder
	for _, r := range strings.TrimSpace(raw) {
		if r == ' ' || r == '-' {
			continue
		}
		builder.WriteRune(r)
	}
	return builder.String()
}

func isDecimalDigits(value string) bool {
	if value == "" {
		return false
	}
	for _, r := range value {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

func phoneQuery(tx *gorm.DB, phone string) *gorm.DB {
	if tx == nil {
		tx = DB
	}
	return tx.Unscoped().Model(&User{}).Where("phone = ?", phone)
}

func IsPhoneAlreadyTaken(phone string) bool {
	normalized, err := NormalizePhone(phone)
	if err != nil || normalized == "" {
		return false
	}
	var count int64
	if err := phoneQuery(DB, normalized).Count(&count).Error; err != nil {
		return false
	}
	return count > 0
}

func ensurePhoneAvailableWithTx(tx *gorm.DB, phone string, excludeUserID int) error {
	normalized, err := NormalizePhone(phone)
	if err != nil {
		return err
	}
	if normalized == "" {
		return nil
	}
	query := phoneQuery(tx, normalized)
	if excludeUserID > 0 {
		query = query.Where("id <> ?", excludeUserID)
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrPhoneAlreadyTaken
	}
	return nil
}

func withNormalizedPhoneLock(tx *gorm.DB, phone string, fn func(tx *gorm.DB) error) error {
	normalized, err := NormalizePhone(phone)
	if err != nil {
		return err
	}
	if normalized == "" {
		return fn(tx)
	}
	switch {
	case common.UsingMainDatabase(common.DatabaseTypePostgreSQL):
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext(?))", normalized).Error; err != nil {
			return err
		}
	case common.UsingMainDatabase(common.DatabaseTypeMySQL):
		var ids []int
		if err := tx.Raw("SELECT id FROM users WHERE phone = ? FOR UPDATE", normalized).Scan(&ids).Error; err != nil {
			return err
		}
	}
	return fn(tx)
}
