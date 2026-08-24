package common

import "testing"

func useMemoryVerificationStore(t *testing.T) {
	t.Helper()
	previousRedisEnabled := RedisEnabled
	RedisEnabled = false
	verificationMutex.Lock()
	verificationMap = make(map[string]verificationValue)
	verificationMutex.Unlock()
	t.Cleanup(func() {
		RedisEnabled = previousRedisEnabled
		verificationMutex.Lock()
		verificationMap = make(map[string]verificationValue)
		verificationMutex.Unlock()
	})
}

func TestVerificationCodeReplacementAndSingleUse(t *testing.T) {
	useMemoryVerificationStore(t)

	if err := RegisterVerificationCodeWithKey("user@example.com", "111111", EmailVerificationPurpose); err != nil {
		t.Fatal(err)
	}
	if err := RegisterVerificationCodeWithKey("user@example.com", "222222", EmailVerificationPurpose); err != nil {
		t.Fatal(err)
	}

	valid, err := VerifyCodeWithKey("user@example.com", "111111", EmailVerificationPurpose)
	if err != nil {
		t.Fatal(err)
	}
	if valid {
		t.Fatal("older verification code must be invalid after replacement")
	}

	valid, err = VerifyCodeWithKey("user@example.com", "222222", EmailVerificationPurpose)
	if err != nil {
		t.Fatal(err)
	}
	if !valid {
		t.Fatal("latest verification code must be valid")
	}

	valid, err = VerifyCodeWithKey("user@example.com", "222222", EmailVerificationPurpose)
	if err != nil {
		t.Fatal(err)
	}
	if valid {
		t.Fatal("verification code must be single-use")
	}
}

func TestWrongVerificationCodeDoesNotConsumeLatestCode(t *testing.T) {
	useMemoryVerificationStore(t)

	if err := RegisterVerificationCodeWithKey("user@example.com", "333333", EmailVerificationPurpose); err != nil {
		t.Fatal(err)
	}

	valid, err := VerifyCodeWithKey("user@example.com", "000000", EmailVerificationPurpose)
	if err != nil {
		t.Fatal(err)
	}
	if valid {
		t.Fatal("wrong verification code must not be accepted")
	}

	valid, err = VerifyCodeWithKey("user@example.com", "333333", EmailVerificationPurpose)
	if err != nil {
		t.Fatal(err)
	}
	if !valid {
		t.Fatal("wrong attempt must not consume the latest code")
	}
}

func TestVerificationPurposesAreIsolated(t *testing.T) {
	useMemoryVerificationStore(t)

	if err := RegisterVerificationCodeWithKey("user@example.com", "444444", EmailVerificationPurpose); err != nil {
		t.Fatal(err)
	}
	valid, err := VerifyCodeWithKey("user@example.com", "444444", PasswordResetPurpose)
	if err != nil {
		t.Fatal(err)
	}
	if valid {
		t.Fatal("verification code must not work for another purpose")
	}
}
