import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Trade } from '../types';
import { api } from '../utils/api';

interface TradeModalProps {
  trade: Trade | null;
  onClose: () => void;
  onRefresh: () => void;
  userId: string;
  accountId: string;
  currency?: string;
}

export default function TradeModal({
  trade,
  onClose,
  onRefresh,
  userId,
  accountId,
  currency = 'USD',
}: TradeModalProps) {
  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'JPY':
        return '¥';
      default:
        return '$';
    }
  };
  const cSymbol = getCurrencySymbol(currency);
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'LONG' | 'SHORT'>('LONG');
  const [quantity, setQuantity] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [fee, setFee] = useState('0');
  const [setup, setSetup] = useState('');
  const [notes, setNotes] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize form fields with trade details if in edit mode
  useEffect(() => {
    if (trade) {
      setSymbol(trade.symbol);
      setType(trade.type);
      setQuantity(String(trade.quantity));
      setEntryPrice(String(trade.entry_price));
      setEntryDate(trade.entry_date);
      setExitPrice(trade.exit_price !== null && trade.exit_price !== undefined ? String(trade.exit_price) : '');
      setExitDate(trade.exit_date !== null && trade.exit_date !== undefined ? trade.exit_date : '');
      setFee(String(trade.fee));
      setSetup(trade.setup || '');
      setNotes(trade.notes || '');
    } else {
      // Set default entry date to current local date/time
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setEntryDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [trade]);

  const handleExitPriceChange = (value: string) => {
    setExitPrice(value);
    if (value === '') {
      setExitDate('');
    } else if (!exitDate) {
      // Set to current date/time or entry date if empty
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setExitDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!symbol.trim()) {
      setValidationError('Symbol is required.');
      return;
    }
    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      setValidationError('Quantity must be greater than 0.');
      return;
    }
    const entryP = Number(entryPrice);
    if (Number.isNaN(entryP) || entryP <= 0) {
      setValidationError('Entry price must be greater than 0.');
      return;
    }
    if (!entryDate) {
      setValidationError('Entry date is required.');
      return;
    }

    const hasExitPrice = exitPrice.trim() !== '';
    let finalExitPrice: number | null = null;
    let finalExitDate: string | null = null;

    if (hasExitPrice) {
      finalExitPrice = Number(exitPrice);
      if (Number.isNaN(finalExitPrice) || finalExitPrice <= 0) {
        setValidationError('Exit price must be greater than 0.');
        return;
      }
      if (!exitDate) {
        setValidationError('Exit date is required when exit price is set.');
        return;
      }
      if (new Date(exitDate) <= new Date(entryDate)) {
        setValidationError('Exit date must be after entry date.');
        return;
      }
      finalExitDate = exitDate;
    }

    const feeVal = Number(fee);
    if (Number.isNaN(feeVal) || feeVal < 0) {
      setValidationError('Fee must be 0 or a positive number.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        symbol: symbol.trim().toUpperCase(),
        type,
        quantity: qty,
        entry_price: entryP,
        exit_price: finalExitPrice,
        entry_date: entryDate,
        exit_date: finalExitDate,
        fee: feeVal,
        setup: setup.trim() || null,
        notes: notes.trim() || null,
      };

      if (trade && trade.id !== undefined) {
        await api.updateTrade(userId, accountId, trade.id, payload);
      } else {
        await api.createTrade(userId, accountId, payload);
      }
      toast.success(trade ? 'Trade updated' : 'Trade created');
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      setValidationError('Failed to save trade. Please check server logs.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-brand-card border border-brand-border w-full max-w-xl rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-brand-border">
          <h2 className="text-lg font-bold">{trade ? `Edit ${trade.symbol} Trade` : 'Add New Trade'}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-brand-border transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {validationError && (
            <div className="p-3.5 bg-brand-danger/10 border border-brand-danger/20 rounded-lg flex items-start gap-2.5 text-brand-danger text-sm">
              <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Symbol */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Symbol</label>
              <input
                type="text"
                required
                placeholder="e.g. BTCUSD"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary placeholder:text-slate-600 uppercase"
              />
            </div>

            {/* Type/Action */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Action Type
              </label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-brand-dark border border-brand-border rounded-lg">
                <button
                  type="button"
                  onClick={() => setType('LONG')}
                  className={`py-1.5 rounded-md text-xs font-bold transition-colors ${
                    type === 'LONG' ? 'bg-brand-success text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setType('SHORT')}
                  className={`py-1.5 rounded-md text-xs font-bold transition-colors ${
                    type === 'SHORT' ? 'bg-brand-danger text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SHORT
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Quantity
              </label>
              <input
                type="number"
                step="any"
                required
                min="0.00000001"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary placeholder:text-slate-600"
              />
            </div>

            {/* Entry Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Entry Price ({cSymbol})
              </label>
              <input
                type="number"
                step="any"
                required
                min="0.00000001"
                placeholder="0.00"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary placeholder:text-slate-600"
              />
            </div>

            {/* Fee */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Commission Fee ({cSymbol})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Entry Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Entry Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary text-slate-200"
            />
          </div>

          <div className="border-t border-brand-border pt-4 mt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Exit Specifications (Optional)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Exit Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Exit Price ({cSymbol})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Leave blank if trade is open"
                  value={exitPrice}
                  onChange={(e) => handleExitPriceChange(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary placeholder:text-slate-600"
                />
              </div>

              {/* Exit Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Exit Date & Time
                </label>
                <input
                  type="datetime-local"
                  disabled={exitPrice.trim() === ''}
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Setup Strategy Tag */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Strategy / Setup Setup
            </label>
            <input
              type="text"
              placeholder="e.g. Support Bounce, Breakout, EMA Pullback"
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary placeholder:text-slate-600"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Notes / Remarks
            </label>
            <textarea
              placeholder="Record market conditions, emotions, thoughts..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary placeholder:text-slate-600 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-transparent border border-brand-border text-slate-300 hover:text-white hover:bg-brand-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors animate-fade-in flex items-center gap-2"
            >
              {saving && <RefreshCw className="animate-spin" size={16} />}
              {saving ? 'Saving...' : 'Save Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
