import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { DollarSign, Percent, Scale, Activity, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import type { DashboardStats, Trade } from '../types';

interface DashboardProps {
  stats: DashboardStats | null;
  trades: Trade[];
  onRefresh: () => void;
  onViewJournal: () => void;
}

const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(value));
  if (value > 0) {
    return `+${formatted}`;
  }
  if (value < 0) {
    return `-${formatted}`;
  }
  return formatted;
};

const PIE_COLORS = ['#10B981', '#EF4444'];

export default function Dashboard({ stats, trades, onViewJournal }: DashboardProps) {
  if (!stats || stats.totalTrades === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <div className="p-4 bg-brand-card border border-brand-border rounded-full text-brand-primary mb-6 animate-pulse">
          <Activity size={48} />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Trades Logged Yet</h2>
        <p className="text-slate-400 max-w-md mb-8">
          Start journaling your trades to see performance metrics, charts, and key performance indicators here.
        </p>
        <button
          onClick={onViewJournal}
          className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/95 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          Go to Journal to Add Trade <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  const recentTrades = trades.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Performance Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of your trading activity and metrics</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net PnL */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Net PnL</p>
              <h3 className={`text-2xl font-bold mt-2 ${
                stats.totalNetPnL > 0 ? 'text-brand-success' : stats.totalNetPnL < 0 ? 'text-brand-danger' : 'text-slate-300'
              }`}>
                {formatCurrency(stats.totalNetPnL)}
              </h3>
            </div>
            <div className={`p-2 rounded-lg ${
              stats.totalNetPnL >= 0 ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-danger/10 text-brand-danger'
            }`}>
              <DollarSign size={20} />
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Win Rate</p>
              <h3 className="text-2xl font-bold mt-2 text-slate-100">
                {stats.winRate}%
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
              <Percent size={20} />
            </div>
          </div>
          <div className="w-full bg-brand-border rounded-full h-1.5 mt-4">
            <div
              className="bg-brand-primary h-1.5 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, stats.winRate))}%` }}
            />
          </div>
        </div>

        {/* Profit Factor */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Profit Factor</p>
              <h3 className="text-2xl font-bold mt-2 text-slate-100">
                {stats.profitFactor.toFixed(2)}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
              <Scale size={20} />
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-3">
            {stats.profitFactor >= 1.5 ? '🏆 High efficiency' : stats.profitFactor >= 1.0 ? '📈 Profitable' : '📉 Unprofitable'}
          </p>
        </div>

        {/* Trades Count */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total / Open Trades</p>
              <h3 className="text-2xl font-bold mt-2 text-slate-100">
                {stats.totalTrades} <span className="text-slate-500 text-sm font-normal">/ {stats.openTrades} open</span>
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <Activity size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Avg Win / Avg Loss Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-full bg-brand-success/10 text-brand-success">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Average Win</p>
            <h4 className="text-xl font-bold text-brand-success mt-1">{formatCurrency(stats.avgWin)}</h4>
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-full bg-brand-danger/10 text-brand-danger">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Average Loss</p>
            <h4 className="text-xl font-bold text-brand-danger mt-1">{formatCurrency(stats.avgLoss)}</h4>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumulative PnL Line Chart */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 lg:col-span-2">
          <h3 className="text-base font-bold mb-6">Cumulative PnL ($)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.cumulativePnL} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#151C2C', borderColor: '#1F293D', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Line
                  type="monotone"
                  dataKey="pnl"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Pie Chart */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5">
          <h3 className="text-base font-bold mb-6">Win / Loss Ratio</h3>
          <div className="h-72 flex flex-col justify-between">
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.winLossCount}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.winLossCount.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#151C2C', borderColor: '#1F293D', borderRadius: '8px' }}
                    itemStyle={{ color: '#f1f5f9' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {stats.winLossCount[0].value === 0 && stats.winLossCount[1].value === 0 && (
              <p className="text-slate-400 text-xs text-center pb-2">No closed trades yet.</p>
            )}
          </div>
        </div>

        {/* PnL by Setup Bar Chart */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 lg:col-span-3">
          <h3 className="text-base font-bold mb-6">PnL by Setup Strategy ($)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.pnlBySetup} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <XAxis dataKey="setup" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#151C2C', borderColor: '#1F293D', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {stats.pnlBySetup.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Trades Panel */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-bold">Recent Trades</h3>
          <button
            onClick={onViewJournal}
            className="text-xs text-brand-primary font-semibold hover:underline flex items-center gap-1"
          >
            View Full Journal <ArrowRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-border text-slate-400 text-xs font-semibold uppercase">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 px-4">Symbol</th>
                <th className="pb-3 px-4 text-center">Type</th>
                <th className="pb-3 px-4 text-center">Status</th>
                <th className="pb-3 px-4 text-right">PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-sm">
              {recentTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-brand-border/20 transition-colors">
                  <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">
                    {trade.entry_date.split('T')[0]} {trade.entry_date.split('T')[1] || ''}
                  </td>
                  <td className="py-3 px-4 font-bold uppercase">{trade.symbol}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      trade.type === 'LONG' ? 'bg-brand-success/15 text-brand-success' : 'bg-brand-danger/15 text-brand-danger'
                    }`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      trade.status === 'OPEN' ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-500/15 text-slate-400'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right font-bold ${
                    trade.pnl > 0 ? 'text-brand-success' : trade.pnl < 0 ? 'text-brand-danger' : 'text-slate-400'
                  }`}>
                    {formatCurrency(trade.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
