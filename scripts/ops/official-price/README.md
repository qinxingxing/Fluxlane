# 全站模型改回官方原价

把定价列表里的模型，以及已经写入计费表达式的模型，改回 new-api 官方原价。原价就是官方表达式本身，不再乘 0.7 或 0.8。

已经等于原价的模型不改。官方预设里没有价格的模型保持现状，不会写成 0。`gemini-3-pro-preview` 使用 Google 公布的分档标价。`claude-haiku-4-5-20251001-v1:0` 使用 `claude-haiku-4-5-20251001` 的原价。

定价按模型名全局生效。

```bash
export FLUXLANE_BASE_URL=https://api.example.com
export FLUXLANE_ROOT_TOKEN='root 用户的 access token'
go run ./scripts/ops/official-price
go run ./scripts/ops/official-price --apply
```

默认 dry-run。token 不写入代码、日志或 git。
