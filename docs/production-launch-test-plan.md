# Fluxlane 生产上线前测试计划

本计划针对 **前后端分离 + 生产 CLB** 拓扑：Cloudflare Pages 静态控制台、`api.fluxlane.ai` / `run.fluxlane.ai` 经 CLB 入池、两台 API + 两台 RUN、共享 PostgreSQL / Redis。

脚本：`scripts/prod-launch/`。默认在跳板机执行。不要把密钥提交进仓库。

**Capacity Phase 1 = COMPLETE。** Cursor 默认不得重新执行容量压测。只有 RUN/PG/Redis 规格、核心 Relay 代码、Billing 并发路径或 CLB 架构发生实质变化后，才启动容量回归。

**API/RUN DNS 已正式指向生产 CLB。** 不存在待执行的 API/RUN DNS 切流。普通节点更新通过 CLB 摘流/入池完成，不使用 DNS。

**不能只测直连节点就认为生产入口通过。** 真正生产流量走 CLB。Billing 最重要的一项是验证两个 RUN 节点共享状态一致。

支付尚未接入，放入下一阶段，本计划不测充值/Webhook 到账。

## 1. 范围与非目标

**覆盖**

- CLB 生产入口（`https://api.fluxlane.ai`、`https://run.fluxlane.ai`）
- 控制面（登录、Session、CORS、Cookie、面板 API）
- 推理面抽样（Chat 等）
- 计费：预扣先于 Provider、双 RUN 共享余额、欠费并发不穿透
- 直连节点仅作诊断，不能替代 CLB 入口结论

**不覆盖（除非容量回归触发条件成立）**

- 容量压测 L0–L4 升档（Phase 1 已完成）
- 对上游供应商做无上限压测

**下一阶段**

- Stripe / Waffo / Pancake / 兑换码等到账链路

**默认 MANUAL APPROVAL REQUIRED（未获书面批准不得执行）**

- 停止/重启 API 或 RUN 容器
- CLB 摘流/入池
- Redis 故障注入
- PostgreSQL 故障注入
- DNS / 网络规则改变
- rollback execution

## 2. 拓扑

生产入口（验收必须以这些 Origin 为准）：

| Origin | 角色 |
| --- | --- |
| `https://www.fluxlane.ai` / `https://console.fluxlane.ai` | 静态前端 |
| `https://api.fluxlane.ai` | 控制面，经 CLB |
| `https://run.fluxlane.ai` | 推理面，经 CLB |

CLB 后端节点（诊断/摘流用，**直连通过 ≠ 生产通过**）：

| 角色 | 公网 | 内网 |
| --- | --- | --- |
| Jump | `43.160.247.94` | — |
| API-1 | `124.156.104.48` | `10.20.1.14` |
| API-2 | `43.154.68.173` | `10.20.2.7` |
| Run-1 | `43.154.184.164` | `10.20.1.15` |
| Run-2 | `150.109.45.79` | `10.20.2.11` |

共享依赖：PostgreSQL `10.20.1.11:5432` / `fluxlane_prod`；Redis `10.20.1.13:6379` / DB `0`。两台 RUN 必须共用同一 Redis 与同一主库，否则 Billing 跨节点必然分叉。

跳板机诊断单节点（不作为生产入口结论）：

```sh
curl -fsS --resolve run.fluxlane.ai:443:10.20.1.15 \
  https://run.fluxlane.ai/healthz
```

## 3. 安全规则

1. 专用测试账号与专用 Token。不要用真实客户 Key。
2. Billing 正确性测试只用廉价或 Mock 渠道。`max_tokens` 尽量小且固定，便于估算单次预扣。
3. `fluxlane_prod` 会真扣费。测前快照，测后对账并恢复测试额度。
4. 欠费并发用例必须关掉信任预扣旁路：用户额度与 Token remain 都要 **小于** `GetTrustQuota()`（`10 * QuotaPerUnit` = `5_000_000`，约 $10）。高于该值时 `shouldTrust` 会跳过预扣，变成先调 Provider 再结算。
5. Token 不得 `unlimited_quota`。
6. 密钥只放跳板机 `scripts/prod-launch/.env`，权限 `600`。

## 4. Redis 闪断：代码事实，不是推测

旧计划里「Redis 闪断 → 鉴权回源 DB；限流降级内存（额度变为按节点）」**一半是事实，一半是错误推测**。以当前代码为准：

| 说法 | 结论 | 依据 |
| --- | --- | --- |
| Session 缓存 miss 或 Redis 读失败时回源 `user_sessions` | **事实** | `GetUserSessionCached`：deny tombstone 不回源；其它错误/未命中走 DB |
| Token / 用户额度 Redis 读失败时回源 DB | **事实** | `GetTokenByKey`、`GetUserQuota` 注释与实现都是 fail-through DB |
| 生产已启用 Redis 时，Redis **闪断**会把限流降级为进程内内存，额度变成按节点 | **不是事实** | `rateLimitFactory` 在进程启动时若 `RedisEnabled` 就绑死 `redisRateLimiter`。`Eval` 失败打错误日志并 **HTTP 500 Abort**，不会切到 `memoryRateLimiter` |
| 从未配置 Redis（`RedisEnabled=false`）时用内存限流，按节点计数 | **事实** | 同一工厂的 else 分支；这是启动配置，不是运行时闪断降级 |
| 每节点独立 Redis 时限流按节点、总额度可翻倍 | **事实（错误拓扑）** | `docs/authentication.md`。生产要求共享 Redis，不是闪断行为 |

因此：共享 Redis 闪断时，预期是鉴权/额度查询仍可能回源 DB，**限流变 500 而不是变松**。不要按「降级内存」去验收。验证闪断本身属于故障注入，**MANUAL APPROVAL REQUIRED**。

钱包预扣 `DecreaseUserQuota` / `DecreaseTokenQuota` 是 `quota - N`，**没有** `WHERE quota >= N`，也 **没有** `lockForUpdate`。订阅预扣才在事务里 `lockForUpdate`。欠费并发（B17）就是要打这条钱包路径在双 RUN + CLB 下会不会穿透。

## 5. 容量冻结

Phase 1 Capacity 已完成。

**Cursor 默认禁止：** 再跑 `k6/health.js`、`k6/api-control.js`、`k6/relay-chat.js` 的升档压测，以及任何以探 p95/QPS/CPU 为目的的容量实验。

**才允许容量回归的实质变化：**

- RUN / PostgreSQL / Redis 规格变更
- 核心 Relay 代码变更
- Billing 并发路径变更（预扣、结算、退款、信任旁路、额度 SQL）
- CLB 架构变更

未满足上列条件时，第 11 节容量章节只作历史记录，不执行。

## 6. 阶段 0 — 仓库回归（离线）

发布 SHA 上：

```sh
go vet ./...
cd relaykit && GOWORK=off go vet ./... && GOWORK=off go build ./...
cd .. && go test ./...
cd web && bun install --frozen-lockfile && bun run build:check
```

计费单测至少：`service/text_quota_test.go`、`service/tiered_settle_test.go`、`service/task_billing_test.go`、`service/quota_saturation_test.go`、`pkg/billingexpr/`、`relay/helper/openai_image_request_test.go`、`common/quota_math_test.go`。

## 7. 阶段 1 — 探活（CLB 入口为门禁）

```sh
cd scripts/prod-launch
cp env.example .env
./smoke.sh                 # 默认只打 CLB DNS
DIRECT_NODE_SMOKE=1 ./smoke.sh   # 可选：直连节点诊断，不能单独判生产通过
```

**生产入口（必须过）**

| 检查 | Origin | 期望 |
| --- | --- | --- |
| `GET /healthz` | api CLB、run CLB | 200 `{"status":"ok"}` |
| `GET /readyz` | 同上 | 200 |
| `GET /api/status` | **api CLB** | 200 且 `success: true`。run CLB 可能不暴露该路径（现网为 JSON 404），不以它作为 Run 入口门禁 |
| `GET /` | api CLB | JSON 404 `route not found`，不是仪表盘 HTML |
| CORS | api CLB | `www` / `console` Origin 精确回显 + credentials；未列出 Origin 不放行 |
| `GET /v1/models` | **run CLB** + 测试 sk- | 200；坏 Key 401/403 |

直连节点的同样检查只用于定位「CLB 正常但某台机器坏了」。CLB 失败而直连成功 = 生产入口失败。

## 8. 阶段 2 — 前后端分离

| 用例 | 期望 |
| --- | --- |
| 控制台登录/刷新 | 只打 `api.fluxlane.ai`（CLB） |
| 复制 API Key | 调用 Origin 为 `run.fluxlane.ai`（CLB） |
| Playground | 控制面 UserAuth，扣用户额度 |

OAuth 回调仍在 API Origin。支付 Webhook 随支付阶段再测。

## 9. 阶段 3 — Relay 抽样

用测试 Token 打 **`https://run.fluxlane.ai`（CLB）**，记下 `X-Oneapi-Request-Id`。不要 `--resolve` 钉死单台 RUN——否则测不到跨节点共享状态。

最低：非流 Chat、流式 Chat、错误模型（不扣费）、余额为 0（预扣失败、无 Provider 调用）。其它协议按业务需要抽样。

## 10. 阶段 4 — 计费（本阶段核心）

内部额度：`QuotaPerUnit = 500_000`（$1 = 500_000 quota）。信任旁路阈值：`GetTrustQuota() = 5_000_000`。

### 10.1 顺序（必须先预扣再调 Provider）

`controller.Relay`：估价 → `PreConsumeBilling` 失败则 **return** → 之后才 `getChannel` / Helper 调上游。失败 defer `Refund`。

验收口径：**不存在先调用 Provider 后发现没钱。** HTTP 200 视为 Provider 已被调用；预扣失败应为 403 且渠道侧无对应上游请求。

例外：用户+Token 都高于信任阈值时 `shouldTrust` 把预扣额打成 0。欠费用例必须把余额压到阈值以下，否则测的是「先用后算」。

### 10.2 双 RUN 共享状态（Billing 最重要）

流量必须进 **run CLB**，让请求落到 Run-1 与 Run-2。禁止用 `TARGET_HOST`/`--resolve` 把整个用例钉在一台 RUN 上再宣称生产通过。

断言（结算等待 `BATCH_UPDATE_INTERVAL` 之后）：

```
sum(成功消费日志 quota) == 测试前 user.quota - 测试后 user.quota
                         == 测试前 token.remain - 测试后 token.remain
两台 RUN 看到的是同一份余额，不存在「每台各扣各的」
失败请求预扣全部退回，无残留 reservation
最终 user.quota >= 0 且 token.remain_quota >= 0
```

脚本（走 CLB，不要设 TARGET_HOST）：

```sh
./billing-verify.sh
./billing-verify.sh --stream
# 额度充足时的跨节点守恒（不是容量升档）
k6 run -e TEST_API_KEY="$TEST_API_KEY" -e TEST_MODEL="$TEST_MODEL" \
  -e TOTAL_REQUESTS=20 k6/concurrent-billing.js
```

### 10.3 必测矩阵

| ID | 场景 | 断言 |
| --- | --- | --- |
| B1 | CLB 非流 Chat | 用户/Token/日志 quota 三分一致 |
| B2 | CLB 流式 Chat | 同上，`is_stream=true` |
| B5 | 上游失败 | 预扣退回，无残留 |
| B13 | 余额 0 | 403，Provider 调用数 = 0 |
| B17 | 余额只够 N 次，并发明显大于 N（默认 5 vs 20），打 CLB | 见下节 |

B3/B4/B6–B16 仍有效；B4 补扣若代码走无下限 `quota - N`，出现负余额视为 **No-Go**，不要改口径去迁就实现。

### 10.4 B17 — 欠费并发（5 vs 20）

**准备**

1. 廉价/Mock 模型，单次预扣近似恒定，记为 `Q`（可先在足额账号打 1 次从日志读 `quota`）。
2. 测试用户 `quota` 与 Token `remain_quota` 都设为 `5 * Q`（允许 ±1 次误差的缓冲不要加）。
3. 两者都必须 `< 5_000_000`，Token 非无限额，走钱包（不要订阅 `lockForUpdate` 路径混进来，除非另开订阅用例）。
4. Mock 渠道打开请求计数，或事后用渠道日志 / Provider 侧计数。没有 Mock 时，**HTTP 200 次数作为 Provider 调用上限的代理**（预扣失败不得是 200）。

**执行（必须打 CLB）**

```sh
./underfunded-burst.sh --allowed 5 --total 20
```

同时发出 20 个 Chat。不要串行。

**必须成立**

| 断言 | 失败含义 |
| --- | --- |
| Provider 实际调用数 ≤ 5（无 Mock 则 `HTTP 200 ≤ 5`） | 预扣没有在集群内串行化，或多出来的请求先打了上游 |
| 最终 `user.quota >= 0` 且 `token.remain_quota >= 0` | 余额穿透 |
| `HTTP 200` 对应消费日志条数一致；被拒请求结算后无净预扣 | 残留 reservation |
| 被拒请求不得出现渠道上游成功记录 | 先调 Provider 后发现没钱 |
| 20 次里应有大量 403（额度不足），不是 20 次全 200 | 预扣被信任旁路或 CLB 只打到一台且缓存脏读放大 |

若 200 次 > 5：查 Redis 额度缓存脏读、无 `quota >= N` 的 SQL、`BATCH_UPDATE` 延迟、以及是否误开信任旁路。这是 Billing 并发路径缺陷，不是「再压一次容量」。

## 11. 阶段 5 — 容量（历史，默认不执行）

Phase 1 已完成。脚本 `k6/health.js`、`k6/api-control.js`、`k6/relay-chat.js` 保留供回归触发时使用。未触发第 5 节条件时 **不要跑**。

## 12. 阶段 6 — 故障与摘流（全部 MANUAL APPROVAL REQUIRED）

未获批准不得做：停/重启容器、CLB 摘流/入池、Redis/PG 故障注入、改 DNS 或网络规则、执行 rollback。

获批后的期望（供审批单使用，不是默认执行项）：

| 实验 | 期望 |
| --- | --- |
| CLB 摘 Run-1 / 入池 | 摘流后推理仍经 CLB 成功；入池后 B17 仍不穿透 |
| 停一台 RUN 容器 | 与上类似；进行中的流式允许失败但须退预扣 |
| Redis 闪断 | Session/Token/额度查询可回源 DB；**限流为 500，不是内存降级**。恢复后无已撤销 Session 复活 |
| PG 故障 | 预扣/结算失败关闭，不出现只调 Provider 不记账 |
| rollback | 按当时批准的回滚手册，与「API/RUN DNS 切流」无关 |

## 13. 阶段 7 — 支付（下一阶段）

未接入。本阶段不做 Stripe / Waffo / Pancake / 兑换码。计划里出现的 webhook Origin 约束留到支付阶段。

## 14. Go / No-Go

**Go（本阶段）**

- CLB 上的探活、CORS、API-only、`/v1/models` 通过
- B1/B2/B5/B13 通过
- B17：Provider 调用 ≤ 允许次数、余额不穿透、无残留预扣、无先调后发现没钱
- 双 RUN 共享余额对账通过（流量走 CLB）
- 未把直连节点结果当成生产入口结论
- 未在无回归触发时重做容量压测
- 未在无批准时做故障注入/摘流/rollback

**No-Go**

- 只测了 `--resolve` 单节点
- B17 出现 200 次 > N、负余额、失败请求仍占额度、或渠道日志显示未预扣就调了上游
- 两台 RUN 额度不一致
- 把 Redis 闪断「降级内存限流」当成已验收行为

## 15. 跳板机默认执行顺序（无容量、无故障注入）

```sh
ssh ubuntu@43.160.247.94
cd /path/to/repo/scripts/prod-launch
cp env.example .env && chmod 600 .env

./smoke.sh
./billing-verify.sh
./billing-verify.sh --stream

set -a && . ./.env && set +a
# 足额、走 CLB，验证双 RUN 共享状态（20 次，不是容量升档）
k6 run -e TEST_API_KEY="$TEST_API_KEY" -e TEST_MODEL="$TEST_MODEL" \
  -e TOTAL_REQUESTS=20 k6/concurrent-billing.js

# 先把测试用户/Token 余额调到 5*Q，再：
./underfunded-burst.sh --allowed 5 --total 20
```

不要加 `TARGET_HOST`。不要跑第 11 节 k6 升档。不要停容器、不要动 CLB 摘流、不要注入 Redis/PG。
