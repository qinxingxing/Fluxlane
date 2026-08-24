package router

import (
	"net/http"
	"sync/atomic"

	"github.com/gin-gonic/gin"
)

var applicationReady atomic.Bool

// SetHealthRouter registers process-level probes before any business route
// groups. These handlers intentionally avoid authentication, rate limiting,
// sessions, billing, providers, PostgreSQL, and Redis.
func SetHealthRouter(engine *gin.Engine) {
	engine.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	engine.GET("/readyz", func(c *gin.Context) {
		if !applicationReady.Load() {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
}

func MarkReady() { applicationReady.Store(true) }
func MarkNotReady() { applicationReady.Store(false) }
