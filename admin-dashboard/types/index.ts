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
  sector?: string;
  dayChange?: number;
  dayChangePercent?: number;
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
export type TradeType = "MARKET" | "LIMIT" | "GTT" | "STOP_LOSS" | "BRACKET";
export type TradeStatus = "PENDING" | "EXECUTED" | "CANCELLED" | "REJECTED" | "PARTIALLY_FILLED";

export interface Trade {
  orderId: string;
  symbol: string;
  side: TradeSide;
  type: TradeType;
  quantity: number;
  price: number;
  status: TradeStatus;
  createdAt: string;
  triggerPrice?: number;
  stopLoss?: number;
  target?: number;
}

export interface PlaceOrderRequest {
  symbol: string;
  side: TradeSide;
  type: TradeType;
  quantity: number;
  price?: number;
  triggerPrice?: number;
  stopLoss?: number;
  target?: number;
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
  open?: number;
  prevClose?: number;
  marketCap?: number;
  pe?: number;
  pb?: number;
  eps?: number;
  week52High?: number;
  week52Low?: number;
  sector?: string;
}

export interface OHLCVPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
  type: "TRADE" | "WALLET" | "SYSTEM" | "ALERT" | "AI" | "IPO" | "GOAL";
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

// Mutual Funds
export interface MutualFund {
  id: string;
  name: string;
  amc: string;
  category: "Equity" | "Debt" | "Hybrid" | "Gold" | "International";
  subCategory: string;
  nav: number;
  navDate: string;
  returns1Y: number;
  returns3Y: number;
  returns5Y: number;
  riskRating: "Low" | "Moderate" | "Moderately High" | "High" | "Very High";
  rating: number;
  expenseRatio: number;
  aum: number;
  minSIP: number;
  minLumpsum: number;
  fundManager?: string;
  benchmark?: string;
}

export interface SIP {
  id: string;
  fundId: string;
  fundName: string;
  amount: number;
  frequency: "MONTHLY" | "WEEKLY" | "QUARTERLY";
  nextDueDate: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  startDate: string;
  totalInvested: number;
  currentValue: number;
}

// IPO
export interface IPO {
  id: string;
  companyName: string;
  symbol: string;
  issueSize: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  openDate: string;
  closeDate: string;
  listingDate?: string;
  listingPrice?: number;
  status: "UPCOMING" | "OPEN" | "CLOSED" | "LISTED";
  gmp: number;
  subscriptionTimes?: number;
  lotSize: number;
  category: string;
  rating?: number;
  industry?: string;
}

// Goals
export type GoalType = "RETIREMENT" | "HOUSE" | "EDUCATION" | "EMERGENCY" | "CAR" | "TRAVEL" | "MARRIAGE" | "CUSTOM";

export interface Goal {
  id: string;
  type: GoalType;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyRequired: number;
  assetAllocation: { equity: number; debt: number; gold: number };
  onTrack: boolean;
  progressPercent: number;
}

// AI Chat
export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AIAdvisorRequest {
  user_id: string;
  question: string;
  risk_profile: string;
  budget_inr: number;
}

export interface AIAdvisorResponse {
  answer: string;
  recommendations: string[];
  disclaimer: string;
}

// Portfolio Health
export interface PortfolioHealth {
  overallScore: number;
  diversificationScore: number;
  riskReturnScore: number;
  goalAlignmentScore: number;
  qualityScore: number;
  costEfficiencyScore: number;
  insights: string[];
  actions: RebalanceSuggestion[];
}

// Rebalancing
export interface RebalanceSuggestion {
  symbol: string;
  companyName: string;
  action: "BUY" | "SELL";
  quantity: number;
  amount: number;
  reason: string;
  currentWeight: number;
  targetWeight: number;
}

// Capital Gains
export interface CapitalGain {
  symbol: string;
  companyName: string;
  purchaseDate: string;
  saleDate: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  gain: number;
  gainType: "STCG" | "LTCG";
}

// Learning
export interface Course {
  id: string;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  duration: string;
  lessons: number;
  completedLessons: number;
  category: string;
  tags: string[];
  enrolled: boolean;
}

// Community
export interface DiscussionPost {
  id: string;
  author: string;
  initials: string;
  content: string;
  symbol?: string;
  likes: number;
  replies: number;
  createdAt: string;
  tags: string[];
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

// Asset allocation
export interface AllocationSlice {
  name: string;
  value: number;
  color: string;
}
