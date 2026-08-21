package middleware

import (
	"os"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	config := cors.DefaultConfig()
	rawOrigins := strings.TrimSpace(os.Getenv("CORS_ALLOW_ORIGINS"))
	if rawOrigins == "" {
		config.AllowAllOrigins = true
		config.AllowCredentials = false
	} else {
		for _, rawOrigin := range strings.Split(rawOrigins, ",") {
			origin, err := common.NormalizeOrigin(rawOrigin)
			if err != nil {
				panic("invalid CORS_ALLOW_ORIGINS: " + err.Error())
			}
			config.AllowOrigins = append(config.AllowOrigins, origin)
		}
		config.AllowCredentials = true
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{
		"Origin",
		"Accept",
		"Authorization",
		"Cache-Control",
		"Pragma",
		"Content-Type",
		"New-Api-User",
		"X-Requested-With",
		"X-Auth-Session",
		"X-Security-Proof",
	}
	return cors.New(config)
}

func Version() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-New-Api-Version", common.Version)
		c.Next()
	}
}
