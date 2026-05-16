# InvestIQ — Claude Code Context

## Project
AI-powered investment app for Indian college students.
Monorepo with Java (Spring Boot) microservices + Python (FastAPI) AI services.

## Tech stack
- Java 21 + Spring Boot 3.3 (auth, user, trade, wallet, market-data, notification)
- Python 3.12 + FastAPI (ai-advisor, ml-scoring, analytics, background-jobs)
- React Native (mobile app)
- Next.js 15 (admin dashboard)
- PostgreSQL 16 + TimescaleDB (primary DB)
- Redis 7 (cache, sessions, rate limiting)
- MongoDB (AI chats, news, learn content)
- Apache Kafka (event bus between services)
- Docker + Kubernetes on AWS (ap-south-1)

## Service ports (local dev)
- API Gateway:        8080
- Auth service:       8081
- User service:       8082
- Trade service:      8083
- Wallet service:     8084
- Market data:        8085
- Notification svc:   8086
- AI advisor:         9001
- ML scoring:         9002
- Analytics:          9003
- Background jobs:    9004

## Conventions
- Java: package com.investiq.{service}
- Python: module investiq_{service}
- REST versioning: /api/v1/
- All dates: ISO 8601 UTC
- Money: BigDecimal, never float
- IDs: UUID v4
- Secrets: never hardcode — use env vars

## Key business rules
- Minimum investment: ₹10
- KYC required before first trade
- All AI responses must include disclaimer
- Audit log every financial transaction
- Rate limit: 60 trades/min per user