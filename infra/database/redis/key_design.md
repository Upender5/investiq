# InvestIQ :: Redis Key Design
## Part 8 — Enterprise DB Architecture

**Cluster:** AWS ElastiCache Redis 7.2 (cluster mode enabled)
**Shards:** 3 (dev) → 6 (prod) → 12 (10M+ users)
**Eviction policy:** `allkeys-lru` (default), `noeviction` for critical keys
**Max memory:** 32 GB per shard node (r7g.xlarge)

---

## Key Naming Convention

```
{namespace}:{entity}:{id}[:{sub-key}]
```

- **All lowercase**, colon-separated
- **No spaces**
- Always include TTL on every key
- Cluster keys: use `{tag}` for hash-slot locality

---

## 1. Authentication & Sessions

| Key Pattern | Value Type | TTL | Purpose |
|---|---|---|---|
| `session:{user_id}:{session_id}` | Hash | 7 days | Full session data |
| `jti:blacklist:{jti}` | String `"1"` | 15 min (access token lifetime) | Revoked JWT blacklist |
| `otp:{phone}:{purpose}` | Hash | 5 min | OTP value + attempts |
| `otp:rate:{phone}` | String (count) | 1 hour | OTP rate limiting (max 5/hr) |
| `login:attempts:{phone}` | String (count) | 15 min | Failed login lockout |
| `device:trusted:{user_id}:{device_id}` | String `"1"` | 30 days | Trusted device flag |
| `refresh:token:{token_hash}` | String (user_id) | 7 days | Refresh token lookup |

```
HSET session:usr_123:ses_abc user_id "usr_123" role "STUDENT" kyc_status "VERIFIED"
     phone "+919876543210" device_id "dev_xyz" ip "192.168.1.1"
EXPIRE session:usr_123:ses_abc 604800

SET jti:blacklist:jti_revoked_xyz "1" EX 900

HSET otp:+919876543210:LOGIN hash "bcrypt_hash" attempts "0" purpose "LOGIN"
EXPIRE otp:+919876543210:LOGIN 300
```

---

## 2. User & KYC Cache

| Key Pattern | Value Type | TTL | Purpose |
|---|---|---|---|
| `user:{user_id}:profile` | Hash | 5 min | Basic profile (name, kyc_status, role) |
| `user:{user_id}:risk` | String (JSON) | 1 hour | Current risk profile |
| `user:{user_id}:portfolio_ids` | List | 10 min | User's portfolio IDs |
| `user:{user_id}:wallet_id` | String | 30 min | Wallet ID lookup |
| `kyc:pending:queue` | Sorted Set (score=submitted_at) | No TTL | KYC review queue |
| `feature:flag:{flag_key}` | Hash | 5 min | Feature flag state |

```
HSET user:usr_123:profile id "usr_123" full_name "Rajan Sharma"
     kyc_status "VERIFIED" role "STUDENT"
EXPIRE user:usr_123:profile 300
```

---

## 3. Real-time Stock Prices

| Key Pattern | Value Type | TTL | Purpose |
|---|---|---|---|
| `price:{exchange}:{symbol}` | Hash | 30 sec | Live LTP + OHLCV |
| `price:batch:{exchange}` | Hash (field=symbol, val=ltp) | 30 sec | All prices in one hash |
| `price:history:{symbol}:1m` | Sorted Set (score=timestamp, val=JSON) | 1 day | 1-min candles (last 24h) |
| `price:history:{symbol}:1d` | Sorted Set (score=timestamp, val=JSON) | 7 days | Daily candles |
| `market:status` | String (JSON) | 1 min | NSE/BSE open/close status |
| `market:indices` | Hash | 30 sec | NIFTY50, SENSEX, etc. |
| `stock:info:{symbol}` | Hash | 1 hour | Static stock metadata |
| `mf:nav:{scheme_code}` | Hash | 24 hours | Mutual fund NAV |

```
HSET price:NSE:RELIANCE ltp "2950.45" open "2920.00" high "2975.30"
     low "2910.20" close "2900.00" volume "4523100"
     change "50.45" change_pct "1.74" timestamp "1749456000"
EXPIRE price:NSE:RELIANCE 30

HSET market:indices NIFTY50 "24523.45" SENSEX "80412.33"
     NIFTY_BANK "52341.20" NIFTY_IT "38901.50"
EXPIRE market:indices 30
```

---

## 4. Portfolio Snapshot

| Key Pattern | Value Type | TTL | Purpose |
|---|---|---|---|
| `portfolio:{portfolio_id}:snapshot` | String (JSON) | 2 min | Full portfolio value snapshot |
| `portfolio:{portfolio_id}:holdings` | String (JSON) | 5 min | Holdings list with live P&L |
| `portfolio:{user_id}:summary` | Hash | 2 min | Total invested, current value, pnl |
| `portfolio:{portfolio_id}:perf:{period}` | String (JSON) | 30 min | Performance chart data (1D/1W/1M) |

```
SET portfolio:pf_123:snapshot '{"total_value":125000,"invested":100000,"pnl":25000,"pnl_pct":25.0}' EX 120

HSET portfolio:usr_123:summary total_value "125000" invested "100000"
     pnl "25000" pnl_pct "25.0" day_change "1250" day_change_pct "1.01"
EXPIRE portfolio:usr_123:summary 120
```

---

## 5. Rate Limiting (Sliding Window)

| Key Pattern | Value Type | TTL | Limit |
|---|---|---|---|
| `rl:api:{user_id}:{endpoint}` | Sorted Set | 1 min window | 60 req/min |
| `rl:trade:{user_id}` | String (count) | 1 min | 60 trades/min (SEBI) |
| `rl:otp:{phone}` | String (count) | 1 hour | 5 OTPs/hour |
| `rl:withdraw:{user_id}` | String (count) | 24 hours | 3 withdrawals/day |
| `rl:ai:{user_id}` | String (count) | 1 hour | 20 AI requests/hour |
| `rl:login:{ip}` | String (count) | 15 min | 20 attempts/15min |

```lua
-- Sliding window rate limit (Lua script — atomic)
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count < limit then
  redis.call('ZADD', key, now, now .. math.random())
  redis.call('EXPIRE', key, window / 1000)
  return 1
else
  return 0
end
```

---

## 6. Wallet / Payment Cache

| Key Pattern | Value Type | TTL | Purpose |
|---|---|---|---|
| `wallet:{user_id}:balance` | Hash | 30 sec | Available + locked balance |
| `wallet:{user_id}:limit` | Hash | 5 min | Daily/monthly remaining limit |
| `payment:{payment_id}:status` | String | 30 min | Payment gateway status |
| `idempotency:{key}` | String (response JSON) | 24 hours | Idempotency dedup |

```
HSET wallet:usr_123:balance available "45230.50" locked "5000.00" total "50230.50"
EXPIRE wallet:usr_123:balance 30
```

---

## 7. AI Advisor Cache

| Key Pattern | Value Type | TTL | Purpose |
|---|---|---|---|
| `ai:advice:{user_id}:{symbol}` | String (JSON) | 6 hours | Cached advice per symbol |
| `ai:insight:{symbol}` | String (JSON) | 1 hour | Stock insight (shared across users) |
| `ai:sentiment:{symbol}` | Hash | 30 min | Latest sentiment score |
| `ai:top_picks:{risk_profile}` | String (JSON) | 1 hour | Top AI picks by risk |

---

## 8. Search & Discovery Cache

| Key Pattern | Value Type | TTL | Purpose |
|---|---|---|---|
| `search:stocks:{query}` | String (JSON) | 10 min | Stock search results |
| `search:mf:{query}` | String (JSON) | 10 min | MF search results |
| `popular:stocks:{exchange}` | List | 1 hour | Most searched/traded today |
| `top:gainers:{exchange}` | String (JSON) | 5 min | Top gainers list |
| `top:losers:{exchange}` | String (JSON) | 5 min | Top losers list |
| `52wk:highs:{exchange}` | String (JSON) | 30 min | 52-week high hitters |

---

## 9. Pub/Sub Channels (WebSocket price feed)

| Channel Pattern | Publisher | Subscribers | Data |
|---|---|---|---|
| `price.update.{symbol}` | market-data-service | WebSocket gateway | Live tick |
| `order.update.{user_id}` | trade-service | WebSocket gateway | Order status change |
| `portfolio.update.{user_id}` | portfolio-service | WebSocket gateway | P&L update |
| `notification.{user_id}` | notification-service | WebSocket gateway | Push message |
| `market.status` | market-data-service | All connected clients | Market open/close |

---

## Memory Estimation (10M users)

| Category | Keys | Avg Size | Total |
|---|---|---|---|
| Sessions (1M active) | 1,000,000 | 500 B | 500 MB |
| Live prices (5000 stocks) | 5,000 | 300 B | 1.5 MB |
| Portfolio snapshots (2M active) | 2,000,000 | 2 KB | 4 GB |
| Rate limiting | 5,000,000 | 100 B | 500 MB |
| OTPs | 50,000 | 100 B | 5 MB |
| AI cache | 500,000 | 5 KB | 2.5 GB |
| Wallet balances | 5,000,000 | 100 B | 500 MB |
| **Total** | | | **~8 GB** |

**Recommendation:** r7g.xlarge (32 GB) × 3 shards = 96 GB capacity → 12× headroom

---

## Eviction + Memory Policies

```
# redis.conf
maxmemory 28gb
maxmemory-policy allkeys-lru
maxmemory-samples 10

# Critical keys (sessions, rate limits) — use separate DB or keyspace
# DB 0: prices, portfolio, search cache  → allkeys-lru
# DB 1: sessions, OTPs, rate limits      → noeviction (alert when near limit)
# DB 2: idempotency, payment status      → allkeys-lru (24h TTL self-purges)
```
