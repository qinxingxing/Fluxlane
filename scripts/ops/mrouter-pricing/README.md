# MRouter 渠道模型定价

给 MRouter 当前在售的 27 个模型写入全局阶梯定价：

**Fluxlane 定价 = 官方定价 × 系数**

默认系数是 `0.7`。官方价来自 new-api 官方预设表达式（单位 $/1M tokens）。脚本用 `pkg/billingexpr` 同一套表达式解析器找出每个 `tier()` 里的价格系数并乘上系数，分档阈值（例如 `len <= 200000`）和档位外的请求规则乘数保持不变。

这是 MRouter 专用脚本。以后其他渠道请另建脚本（例如 `scripts/ops/<渠道>-pricing`），不要改这个脚本的模型清单去凑别的渠道。

## 定价是全局的

写入的是 `billing_setting.billing_expr` 和 `billing_setting.billing_mode`，按模型名生效，不是按渠道生效。当前这 27 个名字只有 MRouter 在售，所以效果等同于给 MRouter 定价。如果以后别的渠道也上架同名模型，会共用这里的价格。

## 用法

在仓库根目录执行。默认只打印对照，不写网关：

```bash
go run ./scripts/ops/mrouter-pricing
```

确认后再写入：

```bash
export FLUXLANE_BASE_URL=https://api.example.com
export FLUXLANE_ROOT_TOKEN='root 用户的 access token'
go run ./scripts/ops/mrouter-pricing --apply
```

`FLUXLANE_ROOT_TOKEN` 是 root 用户的后台 access token，请求时放在 `Authorization: Bearer`。不要把 token 写进命令行参数、脚本、日志或 git。

常用参数：

| 参数 | 默认 | 含义 |
|---|---|---|
| `--factor` | `0.7` | 官方价乘数 |
| `--apply` | 关 | 真正写入。不加这个参数就是 dry-run |
| `--source-url` | new-api 官方预设 JSON | 官方价来源 |
| `--overrides` | 内置表 | 手工官方价 JSON，`{"模型名":"官方表达式"}`，同名项覆盖内置表 |
| `--models` | 内置 27 个 | 逗号分隔的模型名 |
| `--timeout` | `30s` | 单次 HTTP 超时 |

重复执行不会把系数叠乘。每次都按当前官方价重新乘 `--factor`，再覆盖这 27 个名字。清单以外的模型保持原值。

官方预设或手工表里都没有的模型会跳过，并在退出码 `1` 时停止，不会写成 0。

## gemini-3-pro-preview

官方预设有 362 个模型，其中没有 `gemini-3-pro-preview`。内置手工官方价使用 Google 公布的分档标价（与预设里的 `gemini-3.1-pro-preview` 数字相同）：

- 上下文 ≤200k：输入 $2，缓存读 $0.20，输出 $12
- 上下文 >200k：输入 $4，缓存读 $0.40，输出 $18

音频和文本同一输入价，表达式里没有单独的 `ai`。要换成别的官方表达式，用 `--overrides`。

## 写入与校验

`--apply` 会先 `GET /api/option/`，把这 27 个模型合并进现有 map，再 `PUT /api/option/` 写两个键：

- `billing_setting.billing_expr`
- `billing_setting.billing_mode`（值为 `tiered_expr`）

写完后再次读取这两个键，确认清单外模型没变，然后请求 `GET /api/pricing`，逐模型、逐档核对展示用的输入/输出（以及缓存、音频等）系数等于官方价 × 系数。这些系数就是模型广场按 $/1M tokens 展示的价格。页面还可能再乘当前用户的分组倍率，那一层不是本脚本写入的内容。
