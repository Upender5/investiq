// ============================================================
// InvestIQ :: MongoDB Collections Schema
// Part 7 of Enterprise DB Architecture
// Database: investiq_ai  (Atlas M30 → M50 in prod)
// ============================================================
// Run with: mongosh --file collections_schema.js

use("investiq_ai");

// ──────────────────────────────────────────
// 1. AI CONVERSATIONS  (chat history with Claude)
// ──────────────────────────────────────────
db.createCollection("ai_conversations", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "created_at", "status"],
      properties: {
        _id:        { bsonType: "string", description: "UUID v4" },
        user_id:    { bsonType: "string", description: "FK: auth.users.id" },
        title:      { bsonType: "string", maxLength: 300 },
        status:     { enum: ["ACTIVE", "ARCHIVED", "DELETED"] },
        context: {
          bsonType: "object",
          properties: {
            risk_profile:     { enum: ["CONSERVATIVE","MODERATE","AGGRESSIVE","VERY_AGGRESSIVE"] },
            portfolio_value:  { bsonType: "double" },
            investment_horizon_yrs: { bsonType: "int" },
            goal_types:       { bsonType: "array" }
          }
        },
        messages: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["role", "content", "timestamp"],
            properties: {
              message_id: { bsonType: "string" },
              role:       { enum: ["user", "assistant", "system"] },
              content:    { bsonType: "string" },
              timestamp:  { bsonType: "date" },
              tokens_used: { bsonType: "int" },
              model_used: { bsonType: "string" },
              // AI response metadata
              recommendations: {
                bsonType: "array",
                items: {
                  bsonType: "object",
                  properties: {
                    symbol:      { bsonType: "string" },
                    action:      { enum: ["BUY","SELL","HOLD","WATCH"] },
                    reasoning:   { bsonType: "string" },
                    confidence:  { bsonType: "double" },
                    target_price:{ bsonType: "double" },
                    risk_level:  { enum: ["LOW","MEDIUM","HIGH"] }
                  }
                }
              },
              disclaimer: { bsonType: "string" },
              feedback: {
                bsonType: "object",
                properties: {
                  rating:    { bsonType: "int", minimum: 1, maximum: 5 },
                  helpful:   { bsonType: "bool" },
                  comment:   { bsonType: "string" },
                  rated_at:  { bsonType: "date" }
                }
              }
            }
          }
        },
        total_messages: { bsonType: "int" },
        total_tokens:   { bsonType: "int" },
        last_message_at:{ bsonType: "date" },
        created_at:     { bsonType: "date" },
        updated_at:     { bsonType: "date" },
        deleted_at:     { bsonType: "date" }
      }
    }
  }
});

db.ai_conversations.createIndex({ user_id: 1, created_at: -1 });
db.ai_conversations.createIndex({ user_id: 1, status: 1, last_message_at: -1 });
db.ai_conversations.createIndex({ "messages.timestamp": 1 }, { expireAfterSeconds: 94608000 }); // 3 yr TTL

// Example Document:
/*
{
  "_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "a1b2c3d4-...",
  "title": "Should I invest in Nifty 50 ETF?",
  "status": "ACTIVE",
  "context": {
    "risk_profile": "MODERATE",
    "portfolio_value": 50000.00,
    "investment_horizon_yrs": 5,
    "goal_types": ["WEALTH"]
  },
  "messages": [
    {
      "message_id": "msg_001",
      "role": "user",
      "content": "Should I buy Nifty 50 ETF now?",
      "timestamp": ISODate("2026-06-09T10:00:00Z")
    },
    {
      "message_id": "msg_002",
      "role": "assistant",
      "content": "Based on your moderate risk profile...",
      "timestamp": ISODate("2026-06-09T10:00:02Z"),
      "tokens_used": 312,
      "model_used": "claude-sonnet-4-6",
      "recommendations": [
        { "symbol": "NIFTYBEES", "action": "BUY", "reasoning": "Low-cost index exposure", "confidence": 0.82 }
      ],
      "disclaimer": "This is AI-generated content, not SEBI-registered advice. ..."
    }
  ],
  "total_messages": 2,
  "total_tokens": 450,
  "created_at": ISODate("2026-06-09T10:00:00Z")
}
*/

// ──────────────────────────────────────────
// 2. AI RECOMMENDATIONS  (standalone advice records)
// ──────────────────────────────────────────
db.createCollection("ai_recommendations");

db.ai_recommendations.createIndex({ user_id: 1, created_at: -1 });
db.ai_recommendations.createIndex({ symbol: 1, action: 1, created_at: -1 });
db.ai_recommendations.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 }); // TTL auto-expire

// Schema:
/*
{
  "_id": "uuid",
  "user_id": "uuid",
  "conversation_id": "uuid",           // nullable
  "recommendation_type": "STOCK|MF|ETF|PORTFOLIO|REBALANCE",
  "symbol": "RELIANCE",
  "action": "BUY|SELL|HOLD|SWITCH|SIP_START|SIP_STOP",
  "amount_inr": 5000.00,
  "quantity": 2,
  "reasoning": "Strong Q4 earnings, sector tailwinds...",
  "confidence_score": 0.78,
  "risk_level": "MEDIUM",
  "time_horizon": "1Y",
  "target_price": 3200.00,
  "stop_loss": 2600.00,
  "factors": ["FUNDAMENTAL", "TECHNICAL", "SENTIMENT"],
  "disclaimer": "...",
  "acted_upon": false,
  "order_id": null,
  "feedback": { "rating": 4, "helpful": true },
  "model_version": "claude-sonnet-4-6",
  "created_at": ISODate(),
  "expires_at": ISODate()              // 7 days
}
*/

// ──────────────────────────────────────────
// 3. MARKET NEWS & ANALYSIS
// ──────────────────────────────────────────
db.createCollection("market_news");

db.market_news.createIndex({ published_at: -1 });
db.market_news.createIndex({ symbols: 1, published_at: -1 });
db.market_news.createIndex({ source: 1, published_at: -1 });
db.market_news.createIndex({ "sentiment.label": 1, published_at: -1 });
db.market_news.createIndex({ tags: 1 });
db.market_news.createIndex(
  { title: "text", summary: "text", content: "text" },
  { weights: { title: 10, summary: 5, content: 1 }, name: "news_text_search" }
);
db.market_news.createIndex({ published_at: 1 }, { expireAfterSeconds: 7776000 }); // 90-day TTL

/*
{
  "_id": "uuid",
  "title": "RBI Keeps Repo Rate Unchanged at 6.5%",
  "summary": "...",
  "content": "...",
  "source": "ECONOMIC_TIMES|MONEYCONTROL|NSE|BSE|SEBI|PTI",
  "source_url": "https://...",
  "author": "PTI",
  "image_url": "https://...",
  "symbols": ["HDFCBANK", "SBIN", "BANKBARODA"],
  "tags": ["BANKING", "RBI", "MONETARY_POLICY"],
  "sentiment": {
    "label": "NEUTRAL",                // POSITIVE | NEUTRAL | NEGATIVE
    "score": 0.05,                     // -1.0 to 1.0
    "confidence": 0.88,
    "analyzed_at": ISODate()
  },
  "impact": {
    "predicted_direction": "NEUTRAL",
    "affected_sectors": ["BANKING", "NBFC"],
    "magnitude": "LOW"
  },
  "published_at": ISODate(),
  "scraped_at": ISODate()
}
*/

// ──────────────────────────────────────────
// 4. STOCK INSIGHTS  (AI-generated research notes)
// ──────────────────────────────────────────
db.createCollection("stock_insights");

db.stock_insights.createIndex({ symbol: 1, exchange: 1, generated_at: -1 }, { unique: false });
db.stock_insights.createIndex({ "generated_at": 1 }, { expireAfterSeconds: 604800 }); // 7-day TTL

/*
{
  "_id": "uuid",
  "symbol": "INFY",
  "exchange": "NSE",
  "company_name": "Infosys Ltd",
  "generated_at": ISODate(),
  "summary": "Infosys reported strong Q1 FY27 results...",
  "fundamental": {
    "pe_ratio": 22.4,
    "pb_ratio": 5.1,
    "roe": 28.5,
    "debt_to_equity": 0.03,
    "revenue_growth_yoy": 12.4,
    "profit_growth_yoy": 8.1,
    "verdict": "FAIRLY_VALUED"
  },
  "technical": {
    "trend": "BULLISH",
    "support": 1520.00,
    "resistance": 1680.00,
    "rsi": 62,
    "macd_signal": "BUY",
    "moving_avg_50": 1555.00,
    "moving_avg_200": 1490.00
  },
  "sentiment": {
    "news_score": 0.35,
    "social_score": 0.20,
    "overall": "POSITIVE"
  },
  "analyst_ratings": {
    "buy": 18, "hold": 7, "sell": 2,
    "target_price_avg": 1720.00,
    "target_price_high": 1850.00,
    "target_price_low": 1580.00
  },
  "risks": ["INR-USD volatility", "IT spending slowdown"],
  "catalysts": ["Strong deal wins", "AI services demand"],
  "suitable_for": ["MODERATE", "AGGRESSIVE"],
  "overall_rating": "ACCUMULATE",
  "model_version": "claude-sonnet-4-6"
}
*/

// ──────────────────────────────────────────
// 5. LEARNING CONTENT  (InvestIQ Academy)
// ──────────────────────────────────────────
db.createCollection("learning_content", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "type", "difficulty", "is_published"],
      properties: {
        type: { enum: ["ARTICLE","VIDEO","QUIZ","INFOGRAPHIC","COURSE"] },
        difficulty: { enum: ["BEGINNER","INTERMEDIATE","ADVANCED"] }
      }
    }
  }
});

db.learning_content.createIndex({ type: 1, difficulty: 1, is_published: 1 });
db.learning_content.createIndex({ tags: 1 });
db.learning_content.createIndex({ "series_id": 1, "order_in_series": 1 });
db.learning_content.createIndex({ title: "text", content: "text" });

// ──────────────────────────────────────────
// 6. USER PREFERENCES  (UI / app settings)
// ──────────────────────────────────────────
db.createCollection("user_preferences");
db.user_preferences.createIndex({ user_id: 1 }, { unique: true });

/*
{
  "_id": "user_id",
  "user_id": "uuid",
  "theme": "DARK",
  "language": "en",
  "currency_display": "INR",
  "default_exchange": "NSE",
  "chart_type": "CANDLESTICK",
  "chart_period": "1D",
  "watchlist_sort": "CHANGE_PCT_DESC",
  "portfolio_view": "CURRENT_VALUE",
  "show_pnl_in": "BOTH",              // AMOUNT | PERCENT | BOTH
  "biometric_enabled": true,
  "app_lock_timeout_min": 5,
  "news_categories": ["MARKETS","ECONOMY","COMPANY"],
  "ai_advice_frequency": "WEEKLY",
  "onboarding_completed": true,
  "onboarding_steps": { "kyc": true, "bank": true, "first_investment": false },
  "home_widgets": ["PORTFOLIO", "MARKET_OVERVIEW", "AI_INSIGHT", "WATCHLIST"],
  "updated_at": ISODate()
}
*/

// ──────────────────────────────────────────
// 7. ANALYTICS EVENTS  (behavioural analytics)
// ──────────────────────────────────────────
db.createCollection("analytics_events");

db.analytics_events.createIndex({ user_id: 1, timestamp: -1 });
db.analytics_events.createIndex({ event_name: 1, timestamp: -1 });
db.analytics_events.createIndex({ "properties.symbol": 1, timestamp: -1 });
db.analytics_events.createIndex({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2-year TTL

// ──────────────────────────────────────────
// 8. RESEARCH REPORTS  (PDF metadata)
// ──────────────────────────────────────────
db.createCollection("research_reports");
db.research_reports.createIndex({ symbols: 1, published_date: -1 });
db.research_reports.createIndex({ broker: 1, published_date: -1 });
db.research_reports.createIndex({ title: "text", summary: "text" });

/*
{
  "_id": "uuid",
  "title": "Reliance Industries — Q4 FY26 Result Update",
  "broker": "MORGAN_STANLEY",
  "analyst": "Ridham Desai",
  "symbols": ["RELIANCE"],
  "report_type": "RESULT_UPDATE|INITIATION|SECTOR_UPDATE|STRATEGY",
  "recommendation": "BUY",
  "target_price": 3500.00,
  "s3_key": "reports/2026/RELIANCE_Q4FY26_MS.pdf",
  "pages": 12,
  "published_date": ISODate(),
  "summary": "...",
  "scraped_at": ISODate()
}
*/

// ──────────────────────────────────────────
// SHARDING STRATEGY
// ──────────────────────────────────────────
// ai_conversations:  shard on { user_id: "hashed" }  — even distribution per user
// market_news:       shard on { published_at: 1 }     — range shard, time-based queries
// analytics_events:  shard on { user_id: "hashed" }
// stock_insights:    shard on { symbol: 1 }           — symbol-locality
// user_preferences:  shard on { user_id: "hashed" }

sh.enableSharding("investiq_ai");
sh.shardCollection("investiq_ai.ai_conversations",  { user_id: "hashed" });
sh.shardCollection("investiq_ai.analytics_events",  { user_id: "hashed" });
sh.shardCollection("investiq_ai.market_news",       { published_at: 1 });
sh.shardCollection("investiq_ai.stock_insights",    { symbol: 1 });
sh.shardCollection("investiq_ai.user_preferences",  { user_id: "hashed" });

print("✅ InvestIQ MongoDB collections created successfully.");
