package common

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
)

type verificationValue struct {
	code string
	time time.Time
}

const (
	EmailVerificationPurpose = "v"
	PasswordResetPurpose     = "r"

	verificationRedisPrefix = "verification:"
	verificationLuaConsume  = `
local value = redis.call('GET', KEYS[1])
if value and value == ARGV[1] then
    redis.call('DEL', KEYS[1])
    return 1
end
return 0
`
)

var verificationMutex sync.Mutex
var verificationMap map[string]verificationValue
var verificationMapMaxSize = 10
var VerificationValidMinutes = 10

func GenerateVerificationCode(length int) string {
	code := uuid.New().String()
	code = strings.Replace(code, "-", "", -1)
	if length == 0 {
		return code
	}
	return code[:length]
}

func verificationStorageKey(key string, purpose string) string {
	normalizedKey := strings.ToLower(strings.TrimSpace(key))
	digest := sha256.Sum256([]byte(purpose + "\x00" + normalizedKey))
	return verificationRedisPrefix + purpose + ":" + hex.EncodeToString(digest[:])
}

func verificationCodeDigest(code string) string {
	digest := sha256.Sum256([]byte(code))
	return hex.EncodeToString(digest[:])
}

func verificationTTL() time.Duration {
	return time.Duration(VerificationValidMinutes) * time.Minute
}

func RegisterVerificationCodeWithKey(key string, code string, purpose string) error {
	if RedisEnabled {
		if RDB == nil {
			return errors.New("redis client is not initialized")
		}
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		return RDB.Set(ctx, verificationStorageKey(key, purpose), verificationCodeDigest(code), verificationTTL()).Err()
	}

	verificationMutex.Lock()
	defer verificationMutex.Unlock()
	verificationMap[purpose+key] = verificationValue{
		code: code,
		time: time.Now(),
	}
	if len(verificationMap) > verificationMapMaxSize {
		removeExpiredPairs()
	}
	return nil
}

// VerifyCodeWithKey atomically consumes a valid verification code.
// A successful code can only be used once.
func VerifyCodeWithKey(key string, code string, purpose string) (bool, error) {
	if RedisEnabled {
		if RDB == nil {
			return false, errors.New("redis client is not initialized")
		}
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		result, err := RDB.Eval(
			ctx,
			verificationLuaConsume,
			[]string{verificationStorageKey(key, purpose)},
			verificationCodeDigest(code),
		).Int()
		if err != nil && err != redis.Nil {
			return false, err
		}
		return result == 1, nil
	}

	verificationMutex.Lock()
	defer verificationMutex.Unlock()
	mapKey := purpose + key
	value, okay := verificationMap[mapKey]
	if !okay || time.Since(value.time) >= verificationTTL() {
		if okay {
			delete(verificationMap, mapKey)
		}
		return false, nil
	}
	if code != value.code {
		return false, nil
	}
	delete(verificationMap, mapKey)
	return true, nil
}

// DeleteVerificationCodeWithKey deletes the code only if it still matches.
// This avoids a failed older email send deleting a newer replacement code.
func DeleteVerificationCodeWithKey(key string, code string, purpose string) error {
	if RedisEnabled {
		if RDB == nil {
			return errors.New("redis client is not initialized")
		}
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		return RDB.Eval(
			ctx,
			verificationLuaConsume,
			[]string{verificationStorageKey(key, purpose)},
			verificationCodeDigest(code),
		).Err()
	}

	verificationMutex.Lock()
	defer verificationMutex.Unlock()
	mapKey := purpose + key
	if value, okay := verificationMap[mapKey]; okay && value.code == code {
		delete(verificationMap, mapKey)
	}
	return nil
}

// no lock inside, so the caller must lock the verificationMap before calling.
func removeExpiredPairs() {
	now := time.Now()
	for key := range verificationMap {
		if now.Sub(verificationMap[key].time) >= verificationTTL() {
			delete(verificationMap, key)
		}
	}
}

func init() {
	verificationMutex.Lock()
	defer verificationMutex.Unlock()
	verificationMap = make(map[string]verificationValue)
}
