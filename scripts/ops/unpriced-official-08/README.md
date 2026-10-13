# 把模型价写回官方价

`group-factor` 按 `web/src/features/pricing/data/official-prices.json` 把模型价写回官方价。厂商分组系数不再写进模型价，只在请求计费和定价页上使用。

把官方价乘进模型价的旧脚本在 `scripts/ops/archive/baked-group-factor-20261013/`。

线上价格已经是官方价时会跳过。线上价格仍是「官方价 × 分组系数」时会写回官方价。其他价格会中止，避免覆盖无关改动。

```bash
export FLUXLANE_BASE_URL=https://api.example.com
export FLUXLANE_ROOT_TOKEN='root 用户的 access token'
go run ./scripts/ops/unpriced-official-08 group-factor
go run ./scripts/ops/unpriced-official-08 group-factor --apply
```

默认 dry-run。token 不写入代码、日志或 git。
