import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, BookOpen, Calendar, ArrowLeftRight, TrendingUp, AlertCircle } from 'lucide-react';
import type { Trade, DashboardStats } from './types';
import { api } from './utils/api';
import Dashboard from './components/Dashboard';
import Journal from './components/Journal';
import CalendarView from './components/CalendarView';
import ImportExport from './components/ImportExport';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'calendar' | 'import-export'>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedTrades, fetchedStats] = await Promise.all([
        api.getTrades(),
        api.getStats()
      ]);
      setTrades(fetchedTrades);
      setStats(fetchedStats);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to load trade data. Is the backend server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (tab: 'dashboard' | 'journal' | 'calendar' | 'import-export') => {
    setActiveTab(tab);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'import-export', label: 'Import/Export', icon: ArrowLeftRight },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-brand-dark text-slate-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-card border-r border-brand-border py-6 px-4">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">TradeJournal</h1>
            <span className="text-xs text-slate-400">Personal Trading Log</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-primary text-white'
                    : 'text-slate-400 hover:bg-brand-border hover:text-slate-200'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-brand-border text-center text-xs text-slate-500">
          v0.1.0 • Running on Bun
        </div>
      </aside>

      {/* Header & Bottom Nav - Mobile */}
      <header className="md:hidden flex items-center justify-between bg-brand-card border-b border-brand-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brand-primary/10 rounded text-brand-primary">
            <TrendingUp size={20} />
          </div>
          <span className="font-bold text-base">TradeJournal</span>
        </div>
        <span className="text-xs text-slate-400">Bun + SQLite</span>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 pb-20 md:pb-0">
        {error && (
          <div className="m-4 p-4 bg-brand-danger/10 border border-brand-danger/25 rounded-lg flex items-start gap-3 text-brand-danger">
            <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="font-semibold text-sm">Connection Error</h3>
              <p className="text-xs mt-1 text-brand-danger/90">{error}</p>
              <button
                onClick={fetchData}
                className="mt-2 text-xs font-semibold underline hover:text-brand-danger/80"
              >
                Retry connection
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {loading && !stats ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard stats={stats} trades={trades} onRefresh={fetchData} onViewJournal={() => setActiveTab('journal')} />
              )}
              {activeTab === 'journal' && (
                <Journal trades={trades} onRefresh={fetchData} />
              )}
              {activeTab === 'calendar' && (
                <CalendarView trades={trades} />
              )}
              {activeTab === 'import-export' && (
                <ImportExport onImportSuccess={fetchData} trades={trades} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-card border-t border-brand-border flex justify-around py-2 z-10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
                isActive ? 'text-brand-primary' : 'text-slate-400'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
