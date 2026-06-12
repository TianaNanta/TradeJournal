export interface Trade {
  id?: number;
  symbol: string;
  type: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;
  exit_price?: number | null;
  entry_date: string;
  exit_date?: string | null;
  fee: number;
  status: 'OPEN' | 'CLOSED';
  pnl: number;
  setup?: string | null;
  notes?: string | null;
}

export interface DashboardStats {
  totalNetPnL: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  openTrades: number;
  avgWin: number;
  avgLoss: number;
  cumulativePnL: { date: string; pnl: number }[];
  pnlBySetup: { setup: string; pnl: number; count: number }[];
  winLossCount: { name: string; value: number }[];
}
