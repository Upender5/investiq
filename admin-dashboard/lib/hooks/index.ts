/**
 * InvestIQ data layer — React Query hooks per backend service.
 *
 * Service map:
 *   use-analytics      → analytics-service   :9003
 *   use-market         → market-data-service :8085
 *   use-trades         → trade-service       :8083
 *   use-wallet         → wallet-service      :8084
 *   use-goals          → user-service        :8082 (+ ai-advisor :9001)
 *   use-funds          → fund-service        :8087
 *   use-ai             → ai-advisor          :9001
 *   use-scoring        → ml-scoring-service  :9002
 *   use-notifications  → notification-service:8086
 *   use-user           → user-service        :8082
 */
export * from "./use-analytics";
export * from "./use-market";
export * from "./use-trades";
export * from "./use-wallet";
export * from "./use-goals";
export * from "./use-funds";
export * from "./use-ai";
export * from "./use-scoring";
export * from "./use-notifications";
export * from "./use-user";
export * from "./use-admin";
