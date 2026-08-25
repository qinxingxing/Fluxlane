# Fluxlane 生产上线前测试计划

本计划针对 **前后端分离后的生产拓扑**：Cloudflare Pages 静态控制台、API 控制面、Run 推理面、共享 PostgreSQL / Redis。目标是在 DNS 切流或扩大真实流量前，证明网关、鉴权、计费和多节点一致性可上线。

脚本入口：`scripts/prod-launch/`。在跳板机上执行，不要在个人电脑沙箱里打生产。

## 1. 范围与非目标

**覆盖**

- 控制面（登录、Session、CORS、Cookie、面板 API）
- 推理面（OpenAI / Claude / Gemini / 图像 / 音频 / 任务）
- 计费（预扣、结算、退款、钱包 / 订阅、倍率 / 按次 / 阶梯表达式）
- 压测（探活、鉴权、Relay、并发扣费守恒）
- 多节点故障与回滚

**不覆盖**

- 用真实付费用户账号做破坏性试验
- 对上游供应商做无上限压测（会烧钱、会触发对方限流）
- 在本仓库提交密钥、SSH 私钥、数据库密码

## 2. 拓扑

切流目标 CVM（`deploy/api-cvm`，**当前 DNS 尚未切过来**）：

| 角色 | 用途 | 公网 | 内网 |
| --- | --- | --- | --- |
| Jump | 跑脚本 / k6，避开本地沙箱 | `43.160.247.94` | — |
| API-1 | 新控制面 | `124.156.104.48` | `10.20.1.14` |
| API-2 | 新控制面 | `43.154.68.173` | `10.20.2.7` |
| Run-1 | 新推理面 | `43.154.184.164` | `10.20.1.15` |
| Run-2 | 新推理面 | `150.109.45.79` | `10.20.2.11` |

固定依赖（见 `deploy/api-cvm/README.md`）：

- PostgreSQL `10.20.1.11:5432` / `fluxlane_prod`
- Redis `10.20.1.13:6379` / DB `0`

对外 Origin：

| Origin | 角色 |
| --- | --- |
| `https://www.fluxlane.ai` / `https://console.fluxlane.ai` | 静态前端（Cloudflare Pages） |
| `https://api.fluxlane.ai` | 平台控制面（登录、账单、渠道、Webhooks） |
| `https://run.fluxlane.ai` | 公开推理 API（用户 sk- 调用） |
| 预发：`https://test.fluxlane.ai` + `https://api-test.fluxlane.ai` | 切流前应先在这里跑完整计划 |

**DNS 现状：** 公网解析目前仍指向旧入口（抽样：`api.fluxlane.ai` → `124.156.126.104`，`run.fluxlane.ai` → `43.132.195.221`），与上表 CVM 不同。因此：

1. 对 **现网** 做基线：直接 `curl https://api.fluxlane.ai/healthz`（走 DNS）。
2. 对 **新节点** 做切流前验收：必须从跳板机用 `--resolve` 或内网 IP 打到上表地址。新 CVM 公网 443 可能只对跳板机 / VPC 开放（本环境直连 `124.156.104.48:443` 超时，旧 DNS 入口正常）。
3. 切 DNS 后立刻重复阶段 1，确认解析已落到新 CVM。

跳板机访问单台新节点时绑 SNI，避免打到旧入口：

```sh
curl -fsS --resolve api.fluxlane.ai:443:10.20.1.14 \
  https://api.fluxlane.ai/healthz
```

## 3. 安全规则

1. **专用测试账号**。单独用户 + 单独 Token，额度可控，测完恢复。不要用真实客户 Key。
2. **专用廉价 / Mock 渠道**。压测 Relay 时指向内部 Mock 或最低价模型，`max_tokens=1`。禁止对 GPT-5 / Claude 大模型做高并发。
3. **生产库会真扣费**。`fluxlane_prod` 上的每一次成功 Relay 都会改 `users.quota` / `tokens.remain_quota` / `logs`。先记快照，测完对账。
4. **共享 Redis**。限流键在集群内共享。压测 429 是预期，不要当成网关故障，除非错误率失控。
5. **`BATCH_UPDATE_ENABLED`**。若开启，额度落库有 `BATCH_UPDATE_INTERVAL`（默认约 5s）延迟。对账前至少再等一个间隔。
6. **密钥不入库**。复制 `scripts/prod-launch/env.example` 为跳板机本地 `.env`，权限 `600`。

## 4. 前置条件

- 跳板机可 SSH 到四台 CVM，可访问 `10.20.1.11` / `10.20.1.13`
- 已安装 `curl`、`jq`、[k6](https://grafana.com/docs/k6/latest/)
- 测试用户、测试 Token、（建议）面板 Access Token
- 已知该 Token 的分组倍率和目标模型计费模式（倍率 / 按次价 / `tiered_expr`）
- 四台节点 `SESSION_SECRET`、`CRYPTO_SECRET` 相同，共用同一 Redis 与主库
- 控制面：`SERVE_FRONTEND=false`，`SESSION_COOKIE_SECURE=true`，`CORS_ALLOW_ORIGINS` 与 `SESSION_COOKIE_TRUSTED_URL` 为精确 Origin 列表

建议先在预发 Origin 跑完整计划，生产只复跑探活、小流量计费抽样和一次受控压测。

## 5. 阶段 0 — 仓库回归（离线）

在发布镜像对应的 git SHA 上：

```sh
go vet ./...
cd relaykit && GOWORK=off go vet ./... && GOWORK=off go build ./...
cd .. && go test ./...
cd web && bun install --frozen-lockfile && bun run build:check
```

计费相关单测至少要绿：

- `service/text_quota_test.go`
- `service/tiered_settle_test.go`
- `service/task_billing_test.go`
- `service/quota_saturation_test.go`
- `pkg/billingexpr/billingexpr_test.go`
- `relay/helper/openai_image_request_test.go`
- `relay/helper/max_tokens_bounds_test.go`
- `common/quota_math_test.go`

这些保护的是公式与溢出钳制，不能代替线上对账。

## 6. 阶段 1 — 基础设施探活

在跳板机：

```sh
cd scripts/prod-launch
cp env.example .env   # 填入目标，不要提交
./smoke.sh
```

`smoke.sh` 默认打的是上表 **新 CVM 公网 IP**。必须在跳板机执行。现网 DNS 基线可另外直接：

```sh
curl -fsS https://api.fluxlane.ai/healthz
curl -fsS https://api.fluxlane.ai/readyz
curl -fsS https://run.fluxlane.ai/healthz
```

现网抽样（切流前旧入口）：`/healthz`、`/readyz` 为 200；`GET /` 为 JSON `route not found`；`Origin: https://www.fluxlane.ai` 与 `https://console.fluxlane.ai` 的 CORS 预检回显对应 Origin 且 `Allow-Credentials: true`；未列出 Origin 返回 403。新 CVM 需要用同样断言再跑一遍。

**逐节点检查**

| 检查 | 期望 |
| --- | --- |
| `GET /healthz` | `200`，`{"status":"ok"}`，不依赖 DB / Redis |
| `GET /readyz` | `200`；进程未就绪或关停中为 `503` |
| `GET /api/status` | `200` 且 `success: true`（Docker healthcheck 也打这个） |
| `GET /`（API 节点） | `SERVE_FRONTEND=false` 时 JSON `404 route not found`，不是旧仪表盘 HTML |
| TLS | 证书匹配 `api.fluxlane.ai` / `run.fluxlane.ai`，TLS 1.2+ |
| 内网依赖 | 从 API / Run 节点 `timeout 5 bash -c '</dev/tcp/10.20.1.11/5432'` 与 Redis `6379` 成功 |
| 容器 | `docker inspect` health = `healthy`；日志无反复 `ALTER TABLE`、无 Session 密钥不一致告警 |

**CORS / Cookie（控制面）**

从浏览器或用 `Origin` 头：

- `OPTIONS /api/user/self`，`Origin: https://www.fluxlane.ai` → `Access-Control-Allow-Origin` 精确回显该 Origin，且 `Allow-Credentials: true`
- 未在白名单的 Origin 不得回显
- 登录后 Refresh Cookie：`HttpOnly`、`Secure`、`SameSite=Strict`
- 跨 Origin 的 `POST /api/user/auth/refresh` 必须带合法 `Origin`，否则 OriginGuard 拒绝

**鉴权冒烟**

- 密码登录 → 拿到 `access_token` + Session
- Access 过期后 refresh 轮换成功，多标签页不互相踢下线
- logout 撤销当前 Session；`GET /api/user/sessions` 不再列出
- 用测试 sk-：`GET /v1/models` 在 **Run** Origin 成功；错误 Key 返回 401

## 7. 阶段 2 — 前后端分离契约

前端在 `www` / `console` 主机上会钉死：

- 控制面 `https://api.fluxlane.ai`（`API_BASE_URL`）
- 推理面 `https://run.fluxlane.ai`（`PUBLIC_API_BASE_URL`，Key 复制、Playground 调用）

| 用例 | 期望 |
| --- | --- |
| 控制台登录、刷新、改资料 | 只打 `api.fluxlane.ai`，Cookie 不泄漏到 Run |
| 创建 / 复制 API Key | 展示的调用 Origin 是 `run.fluxlane.ai` |
| Playground `/pg/chat/completions` | 走控制面 UserAuth，扣测试用户额度 |
| OAuth | 服务端回调在 API Origin；浏览器 redirect URI 在前端 Origin |
| Stripe / Waffo / Pancake webhook | 只注册在 API Origin，CDN 不得缓存 |
| 静态资源 | Cloudflare Pages / `_redirects` SPA fallback；`/api/*`、`/v1/*` 不得被 Pages 吃掉 |
| 预发 | `test.fluxlane.ai` + `api-test.fluxlane.ai` 用同一套 CORS / Cookie 变量 |

浏览器至少走通：登录 → 仪表盘额度 → 创建 Token → Playground 一条消息 → 用量日志能看到该请求。

## 8. 阶段 3 — Relay 功能抽样

每条路径用 **测试 Token** 打 **Run** Origin，记录 `X-Oneapi-Request-Id`。

| 协议 | 端点 | 最低抽样 |
| --- | --- | --- |
| OpenAI Chat | `POST /v1/chat/completions` | 非流 + 流式 |
| Completions | `POST /v1/completions` | 一条短 prompt |
| Claude | `POST /v1/messages` | 非流 + 流式；如启用 cache 再加一条 |
| Responses | `POST /v1/responses` | 一条 |
| Gemini | `POST /v1beta/models/{model}:generateContent` | 一条 |
| Embeddings | `POST /v1/embeddings` | 一条 |
| Image | `POST /v1/images/generations` | `n=1`，确认 `n` 上限拒绝 |
| Audio TTS / STT | `/v1/audio/speech`、`/v1/audio/transcriptions` | 各一条 |
| 任务视频 | `/v1/videos` 或 Kling | 提交 → 查询 → 成功结算或失败退款 |
| 错误 | 错误模型名 / 超大 `max_tokens` | 400，**不扣费**或预扣后退回 |
| 余额不足 | 把测试 Token remain 调到极低 | 预扣失败，上游不应被调用 |

流式：首字节时间、中间断开、`STREAMING_TIMEOUT` 后客户端应能看到完整错误；计费按实际上游 usage 结算，不得出现负额度。

## 9. 阶段 4 — 计费测试

内部额度：`QuotaPerUnit = 500_000`，即 **$1 = 500_000 quota**。

### 9.1 计费链路

每次成功 Relay：

1. **估价 / 预扣** `PreConsumeBilling` → 钱包或订阅预留，同时扣 Token remain
2. 调上游
3. **结算** `SettleBilling`：`delta = actual - preConsumed`；多退少补
4. 写 `logs`（`type=2` 消费）；饱和事件在 `other.admin_info.quota_saturation`（仅管理员可见）
5. 失败且 Session 仍需退款时走 `Refund`，不得把已结算资金再退一次

任务（视频等）另有预扣 → 轮询终态 → `RecalculateTaskQuota` / `RefundTaskQuota`，用 CAS 防止双退。

### 9.2 公式（对账用）

**倍率模式**（`UsePrice=false`）：

```
effective_prompt = prompt - (cache/image/audio 中被单独计价的部分，按语义裁剪)
quota = (effective_prompt + cache*cacheRatio + ... + completion*completionRatio)
        * modelRatio * groupRatio
        + tool_surcharge + other_ratios
```

OpenAI 语义下 `prompt_tokens` 含 cache；Claude 语义下 `input_tokens` 已是纯文本。对账必须看日志里的 `usage_semantic` / 渠道类型，不能混用。

**按次价**：

```
quota = modelPrice * QuotaPerUnit * groupRatio + surcharges
```

**阶梯表达式** `tiered_expr`（见 `pkg/billingexpr/expr.md`）：

```
quota = exprOutput / 1_000_000 * QuotaPerUnit * groupRatio
```

系数是 **$/1M tokens**。阶梯条件必须用 `len` 而不是 `p`（cache 命中会缩小 `p`，不能拿来切档）。

结算时表达式与请求快照冻结在 `BillingSnapshot`；auto-group 换组后按最终组刷新 group 相关字段再结算。

### 9.3 必测矩阵

对每个启用中的计费模式（倍率 / 按次 / 阶梯），用测试账号跑：

| ID | 场景 | 断言 |
| --- | --- | --- |
| B1 | 非流 Chat，usage 完整 | `user.quota` 减少量 = Token remain 减少量 = 消费日志 `quota` |
| B2 | 流式 Chat | 同上；日志 `is_stream=true` |
| B3 | 预扣 > 实际（短输出） | 差额退回；日志记录返还 |
| B4 | 预扣 < 实际（长输出） | 补扣成功；余额不足时补扣失败路径可观测、不出现负 quota |
| B5 | 上游 4xx/5xx / 超时无 usage | 预扣退回；`type=5` 错误日志；用户额度恢复 |
| B6 | 钱包 vs 订阅 | 订阅请求只动订阅已用额度，不动钱包；反之亦然 |
| B7 | Playground | 扣用户额度，不扣 Token remain |
| B8 | 分组倍率 | 同一模型换测试用户 group，quota 按 `groupRatio` 线性变化 |
| B9 | Claude cache `cr`/`cc`/`cc1h` | 表达式或倍率单独计价时不与 `p` 双计；`len` 仍为全上下文 |
| B10 | 图像 `n` | `n` 超 `dto.MaxImageN` 返回 400，不扣费；合法 `n` 按倍计 |
| B11 | 工具附加费（web_search 等） | 日志 `tool_surcharges` 与额度一致 |
| B12 | 任务成功 / 失败 | 成功：终态 quota = 实际；失败：预扣全退；并发完成不双退 |
| B13 | 余额为 0 | 请求被拒，无上游调用（渠道日志无对应请求） |
| B14 | 错误模型 / 非法 `max_tokens` | 400；额度不变 |
| B15 | 管理员 vs 普通用户看同一条日志 | 普通用户看不到 `admin_info.quota_saturation` |
| B16 | 控制面 `GET /dashboard/billing/usage` | 与近期消费日志合计一致（允许导出粒度误差） |

### 9.4 手工对账步骤

```sh
# 1. 快照 Token 额度（只需 sk-）
curl -fsS -H "Authorization: Bearer $TEST_API_KEY" \
  "$API_BASE/api/usage/token/"

# 2. 打一条最小 Chat，记下响应头 X-Oneapi-Request-Id
# 3. 若开启批量更新，等待 BATCH_UPDATE_INTERVAL + 2s
# 4. 再快照；delta 应等于该条消费日志 quota
# 5. 用面板 Token 拉日志
curl -fsS -H "Authorization: Bearer $DASHBOARD_ACCESS_TOKEN" \
  "$API_BASE/api/log/self?type=2&request_id=$REQUEST_ID"
```

封装脚本：

```sh
./billing-verify.sh          # 单次请求对账
./billing-verify.sh --stream
```

**手工算一遍期望值**：从管理后台读出该模型 `modelRatio` / `modelPrice` / 表达式和用户 `groupRatio`，用响应里的 `usage` 套 9.2 公式，与日志 `quota` 比较。差 1 quota 可能来自最小扣费（倍率为正且计算结果为 0 时会记 1）；更大偏差视为失败。

### 9.5 并发守恒（计费压测核心）

同一测试 Token、同一廉价模型，从跳板机并发 N 次（建议先 N=20，再 N=100）：

```
sum(成功请求的日志 quota) == (测试前 remain - 测试后 remain)
sum(日志 quota) == (测试前 user.quota - 测试后 user.quota)
失败请求的预扣必须全部退回
任何时刻 user.quota >= 0 且 token.remain_quota 不错成大数（int32 回绕）
```

```sh
k6 run k6/concurrent-billing.js
./billing-verify.sh --expect-requests "$SUCCESS_COUNT"
```

若对不上：先查 `BATCH_UPDATE` 是否未刷完，再查 Redis 用户额度缓存与 DB 是否分叉，再查是否有请求打到了别的 Token。

## 10. 阶段 5 — 压测

在 **跳板机** 跑，流量走内网 IP + SNI。不要从笔记本打公网。

### 10.1 分层，不要混在一次实验里

| 层 | 脚本 | 目的 | 注意 |
| --- | --- | --- | --- |
| L0 探活 | `k6/health.js` | nginx + 进程 | `/healthz` 不碰 DB，可打高 |
| L1 控制面 | `k6/api-control.js` | `/api/status`、带 Token 的 `/v1/models` | 触发 Redis + 鉴权；登录接口有 CriticalRateLimit，不要压 login |
| L2 Relay | `k6/relay-chat.js` | Chat 非流 | **只打 Mock / 廉价模型** |
| L3 流式 | 同脚本 `STREAM=true` | 长连接、超时、worker 占用 | 并发按 FD / `proxy_read_timeout` 收敛 |
| L4 计费并发 | `k6/concurrent-billing.js` | 扣费守恒 | 额度要够 N 次成功 |

建议阶梯：10 → 50 → 200 VUs。每档 3–5 分钟。下一档前看错误率、p95、CPU、Redis、PG 连接数。

### 10.2 通过标准（可按容量调整，不得无标准放行）

在 Mock / 廉价模型、`max_tokens=1` 前提下：

| 指标 | L0 `/healthz` | L1 `/v1/models` | L2 非流 Chat |
| --- | --- | --- | --- |
| HTTP 成功（非 429） | ≥ 99.9% | ≥ 99.5% | ≥ 99% |
| p95 延迟 | < 50ms（同 VPC） | < 200ms | 视上游；网关开销应稳定 |
| p99 | < 150ms | < 500ms | 无持续爬升 |
| 5xx | 0 | ≈ 0 | ≈ 0 |
| 429 | 允许，记录阈值 | 允许 | 允许 |
| CPU（API/Run） | < 70% | < 70% | < 80% |
| Redis | 无持续 eviction / 超时 | 同左 | 同左 |
| PostgreSQL | 连接数远离上限 | 同左 | 同左 |

压测中 **user/token quota 不得变负**。L2 结束后立刻跑 9.5 对账。

### 10.3 观察

- 节点：`docker stats`、nginx `stub_status` 或 access log 5xx
- 应用：`/api/status` 中的 batch update 开关；容器 json-file 日志
- Redis：`INFO stats`、rate-limit 键 `rateLimit:v2:*`
- PG：`pg_stat_activity`、锁等待（预扣行锁）
- 上游：Mock 的 QPS；真实渠道则看渠道禁用 / 自动拉黑是否被压测误触发

## 11. 阶段 6 — 多节点与故障

所有节点必须：同一 `SESSION_SECRET`、同一 `CRYPTO_SECRET`、同一 Redis、同一主库。独立 Redis 会导致限流按节点翻倍、Session 最多延迟一个 `SYNC_FREQUENCY`（默认 60s）才收敛，生产不接受。

| 实验 | 步骤 | 期望 |
| --- | --- | --- |
| Session 粘滞 | 登录后 `--resolve` 打 API-2 的 refresh | 成功，不 401 |
| 限流共享 | 打满 Global API 限流后换节点再打 | 仍 429（共享 Redis） |
| API 节点宕机 | 停 API-1 容器 | 控制面经另一节点可用；`readyz` 在停机过程变 503 |
| Run 节点宕机 | 停 Run-1 | 推理经 Run-2 成功；进行中的流式允许失败但须退预扣 |
| Redis 闪断 | 短暂 block Redis | 鉴权回源 DB；限流降级内存（额度变为按节点）。恢复后无脏 Session 复活 |
| 主从 | `NODE_TYPE=slave` 的节点不跑渠道同步 / 订阅重置等主任务 | 定时任务不双跑 |

回滚演练（切 DNS 前）：`sudo /usr/local/sbin/rollback-fluxlane-api`（见 `deploy/api-cvm/README.md`），确认旧控制面仍可接流量。

## 12. 阶段 7 — 支付与充值（沙箱）

只在支付沙箱 / 最小金额：

- Stripe webhook：签名校验、幂等、到账后 `logs.type=1`，用户 quota 增加量 = 订单
- Waffo / Pancake：`POST /api/waffo-pancake/webhook/:env` 的 env 必须与 Pancake 槽位一致
- 兑换码：额度增加一次，重复提交失败
- 订阅：预扣走订阅池；到期重置任务只在 master 跑一次

Webhook 必须打到 API Origin，不能打到 Pages 域名。

## 13. 阶段 8 — 发布与切流清单

1. 镜像 SHA 与本计划跑通的 SHA 一致  
2. 预发（`test.fluxlane.ai`）阶段 1–5 通过  
3. 生产探活 + 小流量 B1/B2/B5 + 一次短压测  
4. CORS / Cookie / OAuth 生产 Origin 已换成 `https://www.fluxlane.ai`（及 console）  
5. `SERVE_FRONTEND=false` 已在 API / Run 生效  
6. Webhook / OAuth 回调只指向 API  
7. 回滚命令已在 API-1 演练  
8. 值班：能查 `X-Oneapi-Request-Id` → 日志 → 用户/Token 额度

## 14. Go / No-Go

**Go**

- 探活、CORS、Cookie、分离 Origin 全部通过  
- B1–B6、B13、并发守恒通过  
- L0–L2 达到第 10.2 节阈值，无 5xx 尖峰  
- 单节点故障不影响另一节点鉴权与扣费  
- 回滚演练成功  

**No-Go**

- 额度对不上、出现负额度或 int32 回绕  
- 失败请求不退预扣  
- 前端无法 refresh / 跨节点 Session 失效  
- 压测 5xx 或 p99 持续恶化  
- 节点间 `SESSION_SECRET` / Redis 不一致  

## 15. 跳板机执行顺序

```sh
ssh ubuntu@43.160.247.94
cd /path/to/new-api/scripts/prod-launch
cp env.example .env && chmod 600 .env   # 填测试 Key，勿提交

./smoke.sh
./billing-verify.sh
./billing-verify.sh --stream

set -a && . ./.env && set +a
k6 run -e TEST_API_KEY="$TEST_API_KEY" k6/health.js
k6 run -e TEST_API_KEY="$TEST_API_KEY" k6/api-control.js
# Run-1 内网：TARGET_HOST 是 IP，SNI 保持 run.fluxlane.ai
k6 run -e TEST_API_KEY="$TEST_API_KEY" -e TEST_MODEL="$TEST_MODEL" \
  -e TARGET_HOST=10.20.1.15 -e SNI=run.fluxlane.ai k6/relay-chat.js
k6 run -e TEST_API_KEY="$TEST_API_KEY" -e TEST_MODEL="$TEST_MODEL" \
  -e TARGET_HOST=10.20.1.15 -e SNI=run.fluxlane.ai k6/concurrent-billing.js
./billing-verify.sh --expect-requests <k6 成功数>
```

单节点绑定示例（写入 `.env` 的 `CURL_RESOLVE`）：

```sh
export CURL_RESOLVE="api.fluxlane.ai:443:10.20.1.14"
```
