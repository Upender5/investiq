// Auth
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export interface OtpSendRequest {
  phone: string;
}

export interface OtpVerifyRequest {
  phone: string;
  otp: string;
}

// User
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
}

// Portfolio / Holdings
export interface Holding {
  symbol: string;
  companyName: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  totalPnlPercent: number;
  activePositions: number;
}

// Trades
export type TradeSide = "BUY" | "SELL";
export type TradeType = "MARKET" | "LIMIT";
export type TradeStatus = "PENDING" | "EXECUTED" | "CANCELLED" | "REJECTED";

export interface Trade {
  orderId: string;
  symbol: string;
  side: TradeSide;
  type: TradeType;
  quantity: number;
  price: number;
  status: TradeStatus;
  createdAt: string;
}

export interface PlaceOrderRequest {
  symbol: string;
  side: TradeSide;
  type: TradeType;
  quantity: number;
  price?: number;
}

// Market
export interface StockQuote {
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
}

// Wallet
export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "BUY" | "SELL";

export interface WalletBalance {
  available: number;
  locked: number;
  total: number;
}

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  createdAt: string;
}

// Notifications
export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: "TRADE" | "WALLET" | "SYSTEM" | "ALERT";
}

// Analytics
export interface PnlHistory {
  date: string;
  value: number;
}

export interface DashboardStats {
  portfolioValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  activePositions: number;
  recentTrades: Trade[];
  pnlHistory: PnlHistory[];
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
