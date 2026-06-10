/**
 * Centralised mock data used as React Query `placeholderData`.
 *
 * Strategy: every screen renders instantly from these mocks, then hydrates
 * with live service data when the backend responds. If a service is down the
 * mock keeps the UX intact (de-risked frontend development).
 */
import type {
  Goal,
  Holding,
  PnlHistory,
  PortfolioSummary,
  StockQuote,
  Trade,
} from "@/types";

// ─── Analytics / Dashboard ───────────────────────────────────────────────────

export const MOCK_PNL: PnlHistory[] = [
  { date: "2025-11-01", value: 2200 },
  { date: "2025-12-01", value: -1500 },
  { date: "2026-01-01", value: 5000 },
  { date: "2026-02-01", value: 3000 },
  { date: "2026-03-01", value: 8100 },
  { date: "2026-04-01", value: 6400 },
  { date: "2026-05-01", value: 12000 },
  { date: "2026-06-01", value: 18320 },
];

export const MOCK_DASHBOARD = {
  portfolioValue: 125430.5,
  totalPnl: 18320.75,
  totalPnlPercent: 17.1,
  activePositions: 12,
  todayPnl: 892.4,
  walletBalance: 12450,
  pnlHistory: MOCK_PNL,
};

export const MOCK_ALLOCATION = [
  { name: "IT", value: 42, color: "#6366f1" },
  { name: "Energy", value: 21, color: "#22c55e" },
  { name: "Banking", value: 17, color: "#3b82f6" },
  { name: "FMCG", value: 8, color: "#eab308" },
  { name: "Cash", value: 12, color: "#94a3b8" },
];

// ─── Portfolio ───────────────────────────────────────────────────────────────

export const MOCK_HOLDINGS: Holding[] = [
  { symbol: "RELIANCE", companyName: "Reliance Industries Ltd", quantity: 10, avgBuyPrice: 2450.0, currentPrice: 2620.5, pnl: 1705.0, pnlPercent: 6.96, sector: "Energy", dayChangePercent: 1.37 },
  { symbol: "TCS", companyName: "Tata Consultancy Services", quantity: 5, avgBuyPrice: 3800.0, currentPrice: 3650.0, pnl: -750.0, pnlPercent: -3.95, sector: "IT", dayChangePercent: -1.22 },
  { symbol: "INFY", companyName: "Infosys Ltd", quantity: 20, avgBuyPrice: 1500.0, currentPrice: 1680.0, pnl: 3600.0, pnlPercent: 12.0, sector: "IT", dayChangePercent: 1.33 },
  { symbol: "HDFC", companyName: "HDFC Bank Ltd", quantity: 8, avgBuyPrice: 1600.0, currentPrice: 1540.0, pnl: -480.0, pnlPercent: -3.75, sector: "Banking", dayChangePercent: -1.19 },
  { symbol: "WIPRO", companyName: "Wipro Ltd", quantity: 30, avgBuyPrice: 420.0, currentPrice: 495.0, pnl: 2250.0, pnlPercent: 17.86, sector: "IT", dayChangePercent: 0.84 },
];

export const MOCK_PORTFOLIO_SUMMARY: PortfolioSummary = {
  totalValue: 125430.5,
  totalInvested: 107109.75,
  totalPnl: 18320.75,
  totalPnlPercent: 17.1,
  activePositions: 5,
};

// ─── Market ──────────────────────────────────────────────────────────────────

export const MOCK_STOCKS: Record<string, StockQuote> = {
  RELIANCE: { symbol: "RELIANCE", name: "Reliance Industries Ltd", ltp: 2620.5, change: 35.5, changePercent: 1.37, volume: 4520000, high: 2640, low: 2590, open: 2595, prevClose: 2585, marketCap: 17750000000000, pe: 24.8, pb: 2.3, eps: 105.7, week52High: 2856, week52Low: 2220, sector: "Energy" },
  TCS: { symbol: "TCS", name: "Tata Consultancy Services", ltp: 3650, change: -45, changePercent: -1.22, volume: 1230000, high: 3710, low: 3630, open: 3690, prevClose: 3695, marketCap: 13200000000000, pe: 28.1, pb: 12.4, eps: 129.9, week52High: 4255, week52Low: 3165, sector: "IT" },
  INFY: { symbol: "INFY", name: "Infosys Ltd", ltp: 1680, change: 22, changePercent: 1.33, volume: 3100000, high: 1695, low: 1660, open: 1660, prevClose: 1658, marketCap: 6980000000000, pe: 23.5, pb: 7.8, eps: 71.4, week52High: 1930, week52Low: 1355, sector: "IT" },
  HDFC: { symbol: "HDFC", name: "HDFC Bank Ltd", ltp: 1540, change: -18.5, changePercent: -1.19, volume: 5600000, high: 1565, low: 1530, open: 1558, prevClose: 1558.5, marketCap: 11550000000000, pe: 19.2, pb: 2.8, eps: 80.2, week52High: 1794, week52Low: 1363, sector: "Banking" },
};

export function mockQuote(symbol: string): StockQuote {
  return (
    MOCK_STOCKS[symbol] ?? {
      symbol,
      name: symbol,
      ltp: 1000,
      change: 10,
      changePercent: 1,
      volume: 1000000,
      high: 1010,
      low: 990,
      open: 995,
      prevClose: 990,
    }
  );
}

/** Deterministic-ish random walk for chart placeholders. */
export function generateMockOHLC(base: number, days: number) {
  const data = [];
  let price = base * 0.82;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    price = price * (1 + (Math.random() - 0.48) * 0.025);
    data.push({
      date: d.toISOString().split("T")[0],
      close: Math.round(price * 100) / 100,
      open: Math.round(price * 0.995 * 100) / 100,
    });
  }
  return data;
}

// ─── Trades ──────────────────────────────────────────────────────────────────

export const MOCK_TRADES: Trade[] = [];

// ─── Goals ───────────────────────────────────────────────────────────────────

export const MOCK_GOALS: Goal[] = [
  { id: "g1", type: "RETIREMENT", name: "Retirement Corpus", targetAmount: 30000000, currentAmount: 125430, targetDate: "2050-01-01", monthlyRequired: 12400, assetAllocation: { equity: 70, debt: 25, gold: 5 }, onTrack: true, progressPercent: 0.42 },
  { id: "g2", type: "HOUSE", name: "Dream Home Down Payment", targetAmount: 2000000, currentAmount: 380000, targetDate: "2028-06-01", monthlyRequired: 28500, assetAllocation: { equity: 50, debt: 45, gold: 5 }, onTrack: false, progressPercent: 19 },
  { id: "g3", type: "EMERGENCY", name: "Emergency Fund", targetAmount: 300000, currentAmount: 210000, targetDate: "2026-12-31", monthlyRequired: 10000, assetAllocation: { equity: 0, debt: 100, gold: 0 }, onTrack: true, progressPercent: 70 },
  { id: "g4", type: "EDUCATION", name: "Child's Education", targetAmount: 5000000, currentAmount: 120000, targetDate: "2040-06-01", monthlyRequired: 8200, assetAllocation: { equity: 80, debt: 15, gold: 5 }, onTrack: true, progressPercent: 2.4 },
];

// ─── AI ──────────────────────────────────────────────────────────────────────

export const MOCK_AI_INSIGHTS = [
  { type: "opportunity", text: "WIPRO up 17.8% — consider booking partial profits to reduce IT overweight" },
  { type: "risk", text: "IT sector is 42% of portfolio — above recommended 25%. Rebalancing advised" },
  { type: "action", text: "₹12,450 idle cash in wallet — consider auto-investing in Liquid Fund (6.8% annualized)" },
];

export const MOCK_STOCK_ANALYSIS: Record<string, string[]> = {
  RELIANCE: [
    "Reliance Industries continues to dominate India's energy-to-retail conglomerate space. Jio Platforms remains a key growth driver with 450M+ subscribers.",
    "Financial Health: Revenue CAGR of 18% over 3 years, EBITDA margins expanding to 18.5%. Net debt reduced significantly post rights issue.",
    "Bull Case: Jio Financial Services could unlock significant value; New Energy business (green hydrogen, solar) could become a ₹5,000 Cr revenue stream by FY27.",
    "Bear Case: Global commodity price volatility impacts O2C margins. Regulatory risks in telecom sector.",
    "AI Verdict: Accumulate on dips below ₹2,500. Target ₹2,950 (12-month). Fair value range: ₹2,400–₹3,100.",
  ],
  TCS: [
    "TCS remains the bellwether for India's IT sector. BFSI vertical (32% of revenue) showing signs of recovery after 2 soft quarters.",
    "Financial Health: Industry-best EBIT margins at 24.5%, virtually debt-free balance sheet, consistent 80%+ free cash flow conversion.",
    "Bull Case: Generative AI deals pipeline growing 3x YoY; Europe deal wins accelerating as clients accelerate cloud migration.",
    "Bear Case: US macroeconomic slowdown could delay discretionary IT spending. Attrition normalizing but pricing pressure persists.",
    "AI Verdict: Hold existing positions. Long-term buy on meaningful correction (< ₹3,400). Target ₹4,100 (18-month).",
  ],
};

export const AI_DISCLAIMER =
  "This is for educational purposes only and is not SEBI-registered investment advice. Please consult a qualified financial advisor before making investment decisions.";
