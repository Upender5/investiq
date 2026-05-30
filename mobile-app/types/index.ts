// Auth
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface OtpSendResponse {
  message: string;
}

export interface OtpVerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// User
export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  kycStatus: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
}

// Portfolio
export interface Portfolio {
  totalValue: number;
  invested: number;
  returns: number;
  returnsPercent: number;
  todayPnl: number;
  todayPnlPercent: number;
  positions: Position[];
}

export interface Position {
  id: string;
  symbol: string;
  companyName: string;
  quantity: number;
  avgBuyPrice: number;
  ltp: number;
  pnl: number;
  pnlPercent: number;
}

// Market
export interface Stock {
  symbol: string;
  companyName: string;
  ltp: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  exchange: 'NSE' | 'BSE';
}

// Trade / Order
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'PENDING' | 'COMPLETE' | 'FAILED' | 'CANCELLED';

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  executedPrice?: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
}

// Wallet
export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
}

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'BUY' | 'SELL' | 'FEE';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  createdAt: string;
  status: 'PENDING' | 'COMPLETE' | 'FAILED';
}
