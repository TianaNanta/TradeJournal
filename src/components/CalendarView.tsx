import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Database, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { Trade } from '../types';
import { importDemoData } from '../utils/demoData';
import { formatCurrency } from '../utils/format';

interface CalendarViewProps {
  trades: Trade[];
  userId: string;
  accountId: string;
  onRefresh: () => void;
  currency?: string;
}

export default function CalendarView({ trades, userId, accountId, onRefresh, currency = 'USD' }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Group closed trades by exit_date (YYYY-MM-DD)
  const dailyStats = useMemo(() => {
    const record: Record<string, { pnl: number; trades: Trade[] }> = {};
    for (const t of trades) {
      if (t.status === 'CLOSED' && t.exit_date) {
        const datePart = t.exit_date.split('T')[0];
        if (!record[datePart]) {
          record[datePart] = { pnl: 0, trades: [] };
        }
        record[datePart].pnl += t.pnl;
        record[datePart].trades.push(t);
      }
    }
    return record;
  }, [trades]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Calendar grid generation
  const calendarCells = useMemo(() => {
    const cells: { date: Date; dateStr: string; isCurrentMonth: boolean; dayNumber: number }[] = [];

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
      cells.push({
        date: prevDate,
        dateStr,
        isCurrentMonth: false,
        dayNumber: d,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const currDate = new Date(year, month, d);
      const dateStr = `${currDate.getFullYear()}-${String(currDate.getMonth() + 1).padStart(2, '0')}-${String(currDate.getDate()).padStart(2, '0')}`;
      cells.push({
        date: currDate,
        dateStr,
        isCurrentMonth: true,
        dayNumber: d,
      });
    }

    // Next month padding (fill up to multiple of 7, total 42 cells)
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      cells.push({
        date: nextDate,
        dateStr,
        isCurrentMonth: false,
        dayNumber: d,
      });
    }

    return cells;
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDateStr(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDateStr(null);
  };

  // Selected date trades details
  const selectedDayDetails = selectedDateStr ? dailyStats[selectedDateStr] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Calendar PnL</h1>
          <p className="text-slate-400 text-sm mt-1">Daily aggregated profits and losses for closed trades</p>
        </div>
      </div>

      {trades.length === 0 && (
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 text-center space-y-3">
          <p className="text-slate-400 text-sm">
            No closed trades yet. Add trades in the Journal tab to see your daily PnL breakdown.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await importDemoData(userId, accountId);
                if (res.success) {
                  toast.success(`Imported ${res.count} demo trades`);
                  onRefresh();
                }
              } catch (err) {
                console.error(err);
                toast.error('Failed to import demo data');
              }
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary px-3 py-1.5 rounded-lg transition-colors"
          >
            <Database size={14} />
            Load Demo Data
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid card */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 lg:col-span-2">
          {/* Header controls */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CalendarIcon className="text-brand-primary" size={20} />
              {monthNames[month]} {year}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-brand-border hover:bg-brand-border text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-brand-border hover:bg-brand-border text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 bg-brand-border/40 p-0.5 rounded-lg">
            {calendarCells.map((cell, _idx) => {
              const dayStat = dailyStats[cell.dateStr];
              const hasTrades = !!dayStat;
              const isSelected = selectedDateStr === cell.dateStr;

              return (
                <div
                  key={cell.dateStr}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedDateStr(cell.dateStr);
                  }}
                  className={`min-h-[72px] sm:min-h-[84px] bg-brand-dark p-1.5 flex flex-col justify-between rounded-md cursor-pointer transition-all hover:bg-brand-border/30 select-none ${
                    cell.isCurrentMonth ? 'text-slate-200' : 'text-slate-600'
                  } ${isSelected ? 'ring-2 ring-brand-primary bg-brand-primary/5' : ''}`}
                >
                  <span className="text-xs font-semibold">{cell.dayNumber}</span>

                  {hasTrades ? (
                    <div
                      className={`text-[10px] sm:text-xs font-bold py-0.5 px-1 rounded text-center truncate ${
                        dayStat.pnl > 0
                          ? 'bg-brand-success/10 text-brand-success'
                          : dayStat.pnl < 0
                            ? 'bg-brand-danger/10 text-brand-danger'
                            : 'bg-slate-500/10 text-slate-400'
                      }`}
                    >
                      {formatCurrency(dayStat.pnl, currency)}
                    </div>
                  ) : (
                    <div className="h-4" /> // empty spacer
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected date details panel */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 flex flex-col min-h-[300px]">
          <h3 className="text-base font-bold mb-4 pb-3 border-b border-brand-border">
            Trades on {selectedDateStr || 'Select a Date'}
          </h3>

          {!selectedDateStr ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
              <Info size={32} className="mb-2 text-slate-600" />
              <p className="text-sm">Click on any date in the calendar to view closed trade details.</p>
            </div>
          ) : !selectedDayDetails ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
              <p className="text-sm">No closed trades recorded on this date.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-brand-dark/50 p-3 rounded-lg border border-brand-border">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Day Net PnL</span>
                  <span
                    className={`text-base font-bold font-mono ${
                      selectedDayDetails.pnl > 0
                        ? 'text-brand-success'
                        : selectedDayDetails.pnl < 0
                          ? 'text-brand-danger'
                          : 'text-slate-400'
                    }`}
                  >
                    {formatCurrency(selectedDayDetails.pnl, currency)}
                  </span>
                </div>

                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {selectedDayDetails.trades.map((trade) => (
                    <div
                      key={trade.id}
                      className="p-3 bg-brand-dark border border-brand-border rounded-lg space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold uppercase text-slate-100">{trade.symbol}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              trade.type === 'LONG'
                                ? 'bg-brand-success/15 text-brand-success'
                                : 'bg-brand-danger/15 text-brand-danger'
                            }`}
                          >
                            {trade.type}
                          </span>
                        </div>
                        <span
                          className={`font-bold font-mono ${
                            trade.pnl > 0
                              ? 'text-brand-success'
                              : trade.pnl < 0
                                ? 'text-brand-danger'
                                : 'text-slate-400'
                          }`}
                        >
                          {formatCurrency(trade.pnl, currency)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                        <div>
                          Qty: <span className="text-slate-200">{trade.quantity}</span>
                        </div>
                        <div className="text-right">
                          Entry: <span className="text-slate-200">${trade.entry_price.toFixed(2)}</span>
                        </div>
                        <div>
                          Fee: <span className="text-slate-200">${trade.fee.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          Exit: <span className="text-slate-200">${trade.exit_price?.toFixed(2) || '—'}</span>
                        </div>
                      </div>
                      {trade.setup && (
                        <div className="pt-1 text-[10px] text-slate-400">
                          Setup:{' '}
                          <span className="px-1.5 py-0.2 rounded bg-brand-border text-slate-300 font-semibold">
                            {trade.setup}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
