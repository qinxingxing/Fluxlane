package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestHealthAndReadiness(t *testing.T) {
	gin.SetMode(gin.TestMode)
	MarkNotReady()
	engine := gin.New()
	SetHealthRouter(engine)
	request := func(path string) *httptest.ResponseRecorder {
		recorder := httptest.NewRecorder()
		engine.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, path, nil))
		return recorder
	}
	if response := request("/healthz"); response.Code != http.StatusOK {
		t.Fatalf("healthz status = %d, want 200", response.Code)
	}
	if response := request("/readyz"); response.Code != http.StatusServiceUnavailable {
		t.Fatalf("readyz before initialization status = %d, want 503", response.Code)
	}
	MarkReady()
	if response := request("/readyz"); response.Code != http.StatusOK {
		t.Fatalf("readyz after initialization status = %d, want 200", response.Code)
	}
	MarkNotReady()
	if response := request("/readyz"); response.Code != http.StatusServiceUnavailable {
		t.Fatalf("readyz during shutdown status = %d, want 503", response.Code)
	}
}
