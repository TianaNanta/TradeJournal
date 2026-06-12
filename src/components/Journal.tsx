import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Edit, Trash2, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import type { Trade } from '../types';
import { api } from '../utils/api';
import TradeModal from './TradeModal';

interface JournalProps {
  trades: Trade[];
  onRefresh: () => void;
  userId: string;
  accountId: string;
  currency?: string;
}

export default function Journal({ trades, onRefresh, userId, accountId, currency = 'USD' }: JournalProps) {
  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(Math.abs(value));
    if (value > 0) {
      return `+${formatted}`;
    }
    if (value < 0) {
      return `-${formatted}`;
    }
    return formatted;
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [setupFilter, setSetupFilter] = useState<string>('ALL');

  const [sortField, setSortField] = useState<'entry_date' | 'pnl'>('entry_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Get dynamic unique setups list
  const uniqueSetups = useMemo(() => {
    const list = trades.map(t => t.setup?.trim()).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [trades]);

  // Filtered & Sorted Trades
  const processedTrades = useMemo(() => {
    const filtered = trades.filter(t => {
      const matchesSearch = t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      
      const tradeSetup = t.setup?.trim() || '';
      const matchesSetup = setupFilter === 'ALL' || 
        (setupFilter === 'No Setup' && !tradeSetup) || 
        tradeSetup === setupFilter;

      return matchesSearch && matchesStatus && matchesType && matchesSetup;
    });

    const sorted = [...filtered].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'entry_date') {
        valA = a.entry_date;
        valB = b.entry_date;
      } else if (sortField === 'pnl') {
        valA = a.pnl;
        valB = b.pnl;
      }

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [trades, searchQuery, statusFilter, typeFilter, setupFilter, sortField, sortOrder]);

  // Reset pagination on filter change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, setupFilter]);

  // Pagination calculations
  const totalItems = processedTrades.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTrades = useMemo(() => {
    return processedTrades.slice(startIndex, startIndex + pageSize);
  }, [processedTrades, startIndex, pageSize]);

  const handleSort = (field: 'entry_date' | 'pnl') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this trade? This action cannot be undone.")) {
      try {
        await api.deleteTrade(userId, accountId, id);
        onRefresh();
      } catch (err) {
        console.error(err);
        alert("Failed to delete trade.");
      }
    }
  };

  const handleEditClick = (trade: Trade) => {
    setEditingTrade(trade);
    setIsModalOpen(true);
  };

  const handleNewClick = () => {
    setEditingTrade(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trading Journal</h1>
          <p className="text-slate-400 text-sm mt-1">Record and inspect individual trades</p>
        </div>
        <button
          onClick={handleNewClick}
          className="flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/95 text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={18} /> Add New Trade
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search symbol or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-brand-primary placeholder:text-slate-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm">
            <Filter className="text-slate-400 mr-2 flex-shrink-0" size={16} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'OPEN' | 'CLOSED')}
              className="bg-transparent w-full focus:outline-none cursor-pointer text-slate-200"
            >
              <option value="ALL" className="bg-brand-card">All Statuses</option>
              <option value="OPEN" className="bg-brand-card">Open Trades</option>
              <option value="CLOSED" className="bg-brand-card">Closed Trades</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm">
            <Filter className="text-slate-400 mr-2 flex-shrink-0" size={16} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'LONG' | 'SHORT')}
              className="bg-transparent w-full focus:outline-none cursor-pointer text-slate-200"
            >
              <option value="ALL" className="bg-brand-card">All Types</option>
              <option value="LONG" className="bg-brand-card">LONG</option>
              <option value="SHORT" className="bg-brand-card">SHORT</option>
            </select>
          </div>
        </div>

        {/* Setup Filter */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-border">
          <button
            onClick={() => setSetupFilter('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              setupFilter === 'ALL' ? 'bg-brand-primary text-white' : 'bg-brand-dark text-slate-400 border border-brand-border hover:text-slate-200'
            }`}
          >
            All Setups
          </button>
          <button
            onClick={() => setSetupFilter('No Setup')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              setupFilter === 'No Setup' ? 'bg-brand-primary text-white' : 'bg-brand-dark text-slate-400 border border-brand-border hover:text-slate-200'
            }`}
          >
            No Setup
          </button>
          {uniqueSetups.map(setup => (
            <button
              key={setup}
              onClick={() => setSetupFilter(setup)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                setupFilter === setup ? 'bg-brand-primary text-white' : 'bg-brand-dark text-slate-400 border border-brand-border hover:text-slate-200'
              }`}
            >
              {setup}
            </button>
          ))}
        </div>
      </div>

      {/* Main Journal Data Table */}
      <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
        {totalItems === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-base">No matching trades found.</p>
            <p className="text-xs mt-1">Try resetting or modifying filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-dark/30 text-slate-400 text-xs font-semibold uppercase select-none">
                    <th className="py-4 px-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('entry_date')}>
                      <div className="flex items-center gap-1">
                        Date
                        {sortField === 'entry_date' ? (
                          sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-500" />
                        )}
                      </div>
                    </th>
                    <th className="py-4 px-4">Symbol</th>
                    <th className="py-4 px-4 text-center">Type</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-right">Qty</th>
                    <th className="py-4 px-4 text-right">Entry</th>
                    <th className="py-4 px-4 text-right">Exit</th>
                    <th className="py-4 px-4 text-right">Fee</th>
                    <th className="py-4 px-4 cursor-pointer hover:text-slate-200 text-right" onClick={() => handleSort('pnl')}>
                      <div className="flex items-center justify-end gap-1">
                        PnL
                        {sortField === 'pnl' ? (
                          sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-500" />
                        )}
                      </div>
                    </th>
                    <th className="py-4 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border text-sm">
                  {paginatedTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-brand-border/20 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {trade.entry_date.split('T')[0]} <span className="text-xs">{trade.entry_date.split('T')[1] || ''}</span>
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
                      <td className="py-3 px-4 text-right text-slate-300 font-mono">{trade.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-300 font-mono">${trade.entry_price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-slate-300 font-mono">
                        {trade.exit_price !== null && trade.exit_price !== undefined ? `$${trade.exit_price.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">${trade.fee.toFixed(2)}</td>
                      <td className={`py-3 px-4 text-right font-bold font-mono ${
                        trade.pnl > 0 ? 'text-brand-success' : trade.pnl < 0 ? 'text-brand-danger' : 'text-slate-400'
                      }`}>
                        {formatCurrency(trade.pnl)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(trade)}
                            className="p-1 text-slate-400 hover:text-brand-primary hover:bg-brand-border/40 rounded transition-colors"
                            title="Edit trade"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => trade.id !== undefined && handleDelete(trade.id)}
                            className="p-1 text-slate-400 hover:text-brand-danger hover:bg-brand-border/40 rounded transition-colors"
                            title="Delete trade"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden divide-y divide-brand-border">
              {paginatedTrades.map((trade) => (
                <div key={trade.id} className="p-4 space-y-3 hover:bg-brand-border/10 transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase text-base">{trade.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        trade.type === 'LONG' ? 'bg-brand-success/15 text-brand-success' : 'bg-brand-danger/15 text-brand-danger'
                      }`}>
                        {trade.type}
                      </span>
                    </div>
                    <span className={`text-base font-bold font-mono ${
                      trade.pnl > 0 ? 'text-brand-success' : trade.pnl < 0 ? 'text-brand-danger' : 'text-slate-400'
                    }`}>
                      {formatCurrency(trade.pnl)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-400">
                    <div>Entry Date: <span className="text-slate-200">{trade.entry_date.split('T')[0]}</span></div>
                    <div className="text-right">Status: <span className={`font-semibold ${trade.status === 'OPEN' ? 'text-blue-400' : 'text-slate-400'}`}>{trade.status}</span></div>
                    <div>Qty / Price: <span className="text-slate-200">{trade.quantity} @ ${trade.entry_price.toFixed(2)}</span></div>
                    <div className="text-right">
                      Exit: <span className="text-slate-200">
                        {trade.exit_price !== null && trade.exit_price !== undefined ? `$${trade.exit_price.toFixed(2)}` : '—'}
                      </span>
                    </div>
                  </div>

                  {trade.setup && (
                    <div className="text-xs">
                      Setup: <span className="px-2 py-0.5 rounded bg-brand-border text-slate-300 font-semibold">{trade.setup}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2 border-t border-brand-border/50">
                    <button
                      onClick={() => handleEditClick(trade)}
                      className="flex items-center gap-1 text-xs text-brand-primary font-semibold py-1 px-2.5 rounded bg-brand-primary/10 hover:bg-brand-primary/15 transition-colors"
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      onClick={() => trade.id !== undefined && handleDelete(trade.id)}
                      className="flex items-center gap-1 text-xs text-brand-danger font-semibold py-1 px-2.5 rounded bg-brand-danger/10 hover:bg-brand-danger/15 transition-colors"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-4 border-t border-brand-border bg-brand-dark/10 gap-3">
              <span className="text-xs text-slate-400">
                Showing {startIndex + 1} to {Math.min(startIndex + pageSize, totalItems)} of {totalItems} trades
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded bg-brand-border text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded bg-brand-border text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Trade Modal (Add / Edit) */}
      {isModalOpen && (
        <TradeModal
          trade={editingTrade}
          onClose={() => setIsModalOpen(false)}
          onRefresh={onRefresh}
          userId={userId}
          accountId={accountId}
          currency={currency}
        />
      )}
    </div>
  );
}
