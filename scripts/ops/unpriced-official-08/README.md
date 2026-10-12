# 未定价模型补官方价 × 0.8

给内置清单里**还没有计费表达式**的模型写入：

**Fluxlane 定价 = 官方定价 × 0.8**

已经有 `billing_setting.billing_expr` 的模型不会改，包括 MRouter 脚本按 ×0.7 写入的那些。定价按模型名全局生效，不是渠道级配置。

官方价来自 new-api 官方预设。两个名字需要额外对应：

- `GLM-5.3-Flash` 使用预设里的 `glm-5.3-flash`。计费按模型名精确匹配；如果定价列表里只有 `glm-5.3-flash`，就写入这个名字。
- `claude-haiku-4-5-20251001-v1:0` 使用 `claude-haiku-4-5-20251001` 的官方价。这是同一模型的 Bedrock 版本后缀。

预设里没有、因此不会写入的模型：`deepseek-v4-flash-0731`、`deepseek-v4-pro-0813`、`deepseek-v4.1-flash`、`kimi-k2.5`。这些不会按 0 定价。

```bash
export FLUXLANE_BASE_URL=https://api.example.com
export FLUXLANE_ROOT_TOKEN='root 用户的 access token'
go run ./scripts/ops/unpriced-official-08
go run ./scripts/ops/unpriced-official-08 --apply
```

默认 dry-run。token 不写入代码、日志或 git。
