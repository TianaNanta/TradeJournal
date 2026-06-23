import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  AlertCircle,
  ArrowLeftRight,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  TrendingUp,
  User as UserIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Auth from './components/Auth';
import CalendarView from './components/CalendarView';
import Dashboard from './components/Dashboard';
import FirebaseSetup from './components/FirebaseSetup';
import ImportExport from './components/ImportExport';
import Journal from './components/Journal';
import type { BrokerAccount, DashboardStats, Trade } from './types';
import { api } from './utils/api';
import { getFirebaseAuth, isFirebaseConfigured } from './utils/firebase';
import { formatCurrency } from './utils/format';
import { calculateStats } from './utils/stats';

function App() {
  const [isConfigured, setIsConfigured] = useState(isFirebaseConfigured());
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'calendar' | 'import-export'>('dashboard');
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<BrokerAccount | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [newAccountCapital, setNewAccountCapital] = useState('10000');
  const [newAccountCurrency, setNewAccountCurrency] = useState('USD');
  const [accountError, setAccountError] = useState<string | null>(null);

  // 1. Firebase Auth listener
  useEffect(() => {
    if (!isConfigured) {
      setLoadingAuth(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      const auth = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setLoadingAuth(false);
      });
    } catch (e) {
      console.error(e);
      setLoadingAuth(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isConfigured]);

  // 2. Fetch Accounts
  const fetchAccounts = useCallback(async (userId: string) => {
    try {
      const fetchedAccounts = await api.getAccounts(userId);
      setAccounts(fetchedAccounts);
      return fetchedAccounts;
    } catch (err) {
      console.error('Failed to load broker accounts:', err);
      setError('Failed to load broker accounts. Check Firestore rules.');
      return [];
    }
  }, []);

  // 3. Fetch Trades and stats for active account
  const fetchTrades = useCallback(async (userId: string, accountId: string) => {
    setLoadingData(true);
    setError(null);
    try {
      const fetchedTrades = await api.getTrades(userId, accountId);
      setTrades(fetchedTrades);
      const computedStats = calculateStats(fetchedTrades);
      setStats(computedStats);
    } catch (err) {
      console.error('Failed to load trades:', err);
      setError('Failed to load trade data from online database.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  // 4. Global Refetch / Refresh
  const refreshData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const fetchedAccounts = await api.getAccounts(user.uid);
      setAccounts(fetchedAccounts);

      // If active account no longer exists, default to first or null
      let currentActive = activeAccount;
      if (currentActive) {
        const stillExists = fetchedAccounts.find((a) => a.id === currentActive!.id);
        if (stillExists) {
          // Update details (capital might have changed)
          currentActive = stillExists;
          setActiveAccount(stillExists);
        } else {
          currentActive = fetchedAccounts[0] || null;
          setActiveAccount(fetchedAccounts[0] || null);
        }
      } else {
        currentActive = fetchedAccounts[0] || null;
        setActiveAccount(fetchedAccounts[0] || null);
      }

      if (currentActive) {
        const fetchedTrades = await api.getTrades(user.uid, currentActive.id);
        setTrades(fetchedTrades);
        const computedStats = calculateStats(fetchedTrades);
        setStats(computedStats);
      } else {
        setTrades([]);
        setStats(null);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to refresh data.');
    } finally {
      setLoadingData(false);
    }
  }, [user, activeAccount]);

  // Fetch accounts on user login
  useEffect(() => {
    if (user) {
      setLoadingData(true);
      fetchAccounts(user.uid)
        .then((fetched) => {
          if (fetched.length > 0) {
            const storedId = localStorage.getItem(`active_acc_${user.uid}`);
            const match = fetched.find((a) => a.id === storedId);
            const active = match || fetched[0];
            setActiveAccount(active);
            localStorage.setItem(`active_acc_${user.uid}`, active.id);
          } else {
            setActiveAccount(null);
          }
        })
        .finally(() => setLoadingData(false));
    } else {
      setAccounts([]);
      setActiveAccount(null);
      setTrades([]);
      setStats(null);
    }
  }, [user, fetchAccounts]);

  // Fetch trades on active account change
  useEffect(() => {
    if (user && activeAccount) {
      fetchTrades(user.uid, activeAccount.id);
      localStorage.setItem(`active_acc_${user.uid}`, activeAccount.id);
    }
  }, [user, activeAccount, fetchTrades]);

  const handleAccountChange = (account: BrokerAccount) => {
    setActiveAccount(account);
    toast.success(`Switched to ${account.name}`);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAccountError(null);

    if (!newAccountName.trim()) {
      setAccountError('Account name is required.');
      return;
    }

    const cap = Number(newAccountCapital);
    if (Number.isNaN(cap) || cap < 0) {
      setAccountError('Initial capital must be a positive number.');
      return;
    }
    setCreatingAccount(true);
    try {
      const created = await api.createAccount(user.uid, {
        name: newAccountName.trim(),
        initialCapital: cap,
        currency: newAccountCurrency,
      });

      const updatedAccounts = await fetchAccounts(user.uid);
      // Set the newly created account as active
      const match = updatedAccounts.find((a) => a.id === created.id) || created;
      setActiveAccount(match);

      // Reset form
      setNewAccountName('');
      setNewAccountCapital('10000');
      toast.success('Account created');
      setIsAccountModalOpen(false);
    } catch (err) {
      console.error(err);
      setAccountError('Failed to create account.');
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!user) return;
    if (
      window.confirm(
        'Are you sure you want to delete this broker account? All trades associated with it will be permanently deleted. This action cannot be undone.',
      )
    ) {
      try {
        await api.deleteAccount(user.uid, accountId);
        const updatedAccounts = await fetchAccounts(user.uid);
        if (updatedAccounts.length > 0) {
          setActiveAccount(updatedAccounts[0]);
        } else {
          setActiveAccount(null);
        }
        toast.success('Account deleted');
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete account');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      const auth = getFirebaseAuth();
      toast.success('Signed out');
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFirebaseConfigured = () => {
    setIsConfigured(true);
  };

  const handleResetConfig = () => {
    setIsConfigured(false);
    setUser(null);
  };

  // Nav Items definition
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'import-export', label: 'Import/Export', icon: ArrowLeftRight },
  ] as const;

  // Render Firebase Setup screen
  if (!isConfigured) {
    return <FirebaseSetup onConfigured={handleFirebaseConfigured} />;
  }

  // Render Loader while checking authentication
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center text-slate-100 font-sans">
        <RefreshCw className="animate-spin text-brand-primary mb-4" size={36} />
        <span className="text-sm text-slate-400 font-medium">Checking authentication status...</span>
      </div>
    );
  }

  // Render Authentication screen
  if (!user) {
    return <Auth />;
  }

  // Render Create First Account screen if logged in but has no accounts
  if (accounts.length === 0 && !loadingData) {
    return (
      <>
        <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 text-slate-100 font-sans relative overflow-hidden">
          {/* Background radial gradient spot */}
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-primary/10 blur-[130px] pointer-events-none" />
          <div className="bg-brand-card/60 backdrop-blur-md border border-brand-border w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 z-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-brand-primary/10 rounded-xl text-brand-primary mb-2">
                <FolderOpen size={32} />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">Create Your Trading Account</h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                Please initialize your first broker or trading account to start logging trades.
              </p>
            </div>

            {accountError && (
              <div className="p-3.5 bg-brand-danger/10 border border-brand-danger/25 rounded-lg text-brand-danger text-xs flex items-start gap-2">
                <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
                <span>{accountError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label
                  htmlFor="first-acc-name"
                  className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  Broker / Account Name
                </label>
                <input
                  id="first-acc-name"
                  type="text"
                  required
                  placeholder="e.g. Interactive Brokers, Binance"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="first-acc-capital"
                    className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
                  >
                    Initial Capital
                  </label>
                  <input
                    id="first-acc-capital"
                    type="number"
                    required
                    min="0"
                    value={newAccountCapital}
                    onChange={(e) => setNewAccountCapital(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label
                    htmlFor="first-acc-currency"
                    className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
                  >
                    Currency
                  </label>
                  <select
                    id="first-acc-currency"
                    value={newAccountCurrency}
                    onChange={(e) => setNewAccountCurrency(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary text-slate-200 cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingAccount}
                className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-6"
              >
                {creatingAccount && <RefreshCw className="animate-spin" size={16} />}
                {creatingAccount ? 'Creating...' : 'Create Account & Enter'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-xs text-slate-500 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#151C2C',
              color: '#f1f5f9',
              border: '1px solid #1F293D',
            },
          }}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-brand-dark text-slate-100 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-brand-card border-r border-brand-border py-6 px-4 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
              <TrendingUp size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">TradeJournal</h1>
              <span className="text-xs text-slate-400">Online Trading Log</span>
            </div>
          </div>

          {/* Account Switcher Section */}
          <div className="border-t border-b border-brand-border py-4 px-2 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <span>Trading Account</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(true)}
                  className="p-1 rounded text-slate-400 hover:bg-brand-border hover:text-white transition-colors"
                  title="Create new account"
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(true)}
                  className="p-1 rounded text-slate-400 hover:bg-brand-border hover:text-white transition-colors"
                  title="Manage accounts"
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>

            {/* Dropdown Styled Selector */}
            {activeAccount && (
              <div className="relative group">
                <select
                  value={activeAccount.id}
                  onChange={(e) => {
                    const match = accounts.find((a) => a.id === e.target.value);
                    if (match) handleAccountChange(match);
                  }}
                  className="w-full bg-brand-dark border border-brand-border rounded-xl px-3 py-2.5 text-sm font-semibold flex justify-between items-center text-slate-200 cursor-pointer appearance-none focus:outline-none focus:border-brand-primary"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-brand-card py-2">
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-200 transition-colors"
                />
              </div>
            )}

            {activeAccount && (
              <div className="bg-brand-dark/40 border border-brand-border rounded-xl p-3 space-y-1 mt-2">
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>Current Capital</span>
                  <span className="font-mono text-slate-300">
                    Initial: {activeAccount.currency} {activeAccount.initialCapital.toLocaleString()}
                  </span>
                </div>
                <div
                  className={`text-base font-bold font-mono ${
                    activeAccount.currentCapital >= activeAccount.initialCapital
                      ? 'text-brand-success'
                      : 'text-brand-danger'
                  }`}
                >
                  {formatCurrency(activeAccount.currentCapital, activeAccount.currency)}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
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
        </div>

        {/* User Info & Footer */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-brand-dark/40 border border-brand-border rounded-xl p-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center font-bold text-sm select-none border border-brand-primary/20 uppercase">
              {user.email ? user.email[0] : <UserIcon size={14} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate leading-tight text-xs text-slate-200">{user.email || 'Trader'}</p>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Online User</span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
            <span>Online Storage</span>
            <button type="button" onClick={handleResetConfig} className="hover:underline hover:text-brand-primary">
              Reset Firebase Config
            </button>
          </div>
        </div>
      </aside>

      {/* Header & Bottom Nav - Mobile */}
      <header className="md:hidden bg-brand-card border-b border-brand-border px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-primary/10 rounded text-brand-primary">
              <TrendingUp size={20} />
            </div>
            <span className="font-bold text-base">TradeJournal</span>
          </div>

          {/* Mobile Account Switter */}
          {activeAccount && (
            <div className="flex items-center gap-1 bg-brand-dark border border-brand-border rounded-lg px-2.5 py-1 text-xs font-semibold max-w-[150px] truncate">
              <select
                value={activeAccount.id}
                onChange={(e) => {
                  const match = accounts.find((a) => a.id === e.target.value);
                  if (match) handleAccountChange(match);
                }}
                className="bg-transparent w-full focus:outline-none cursor-pointer appearance-none text-slate-200 pr-4 relative"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-brand-card py-1 text-slate-300">
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Mobile quick balance indicator */}
        {activeAccount && (
          <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-brand-border text-xs">
            <span className="text-slate-400">Current Capital:</span>
            <span
              className={`font-bold font-mono ${
                activeAccount.currentCapital >= activeAccount.initialCapital
                  ? 'text-brand-success'
                  : 'text-brand-danger'
              }`}
            >
              {formatCurrency(activeAccount.currentCapital, activeAccount.currency)}
            </span>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 pb-20 md:pb-0">
        {error && (
          <div className="m-4 p-4 bg-brand-danger/10 border border-brand-danger/25 rounded-lg flex items-start gap-3 text-brand-danger">
            <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="font-semibold text-sm">Database Error</h3>
              <p className="text-xs mt-1 text-brand-danger/90">{error}</p>
              <button
                type="button"
                onClick={refreshData}
                className="mt-2 text-xs font-semibold underline hover:text-brand-danger/80"
              >
                Retry connection
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {loadingData && !stats ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard
                  stats={stats}
                  trades={trades}
                  onRefresh={refreshData}
                  onViewJournal={() => setActiveTab('journal')}
                  userId={user.uid}
                  accountId={activeAccount?.id || ''}
                  currency={activeAccount?.currency}
                />
              )}
              {activeTab === 'journal' && (
                <Journal
                  trades={trades}
                  onRefresh={refreshData}
                  userId={user.uid}
                  accountId={activeAccount?.id || ''}
                  currency={activeAccount?.currency}
                />
              )}
              {activeTab === 'calendar' && (
                <CalendarView
                  trades={trades}
                  userId={user.uid}
                  accountId={activeAccount?.id || ''}
                  onRefresh={refreshData}
                  currency={activeAccount?.currency}
                />
              )}
              {activeTab === 'import-export' && (
                <ImportExport
                  onImportSuccess={refreshData}
                  trades={trades}
                  userId={user.uid}
                  accountId={activeAccount?.id || ''}
                />
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
              type="button"
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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

      {/* MODAL: Add New Account */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-card border border-brand-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
              <h2 className="text-base font-bold">Add New Trading Account</h2>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              {accountError && (
                <div className="p-3 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-brand-danger text-xs flex gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{accountError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="add-acc-name"
                  className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Account Name
                </label>
                <input
                  id="add-acc-name"
                  type="text"
                  required
                  placeholder="e.g. Robinhood, FTMO"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="add-acc-capital"
                    className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1"
                  >
                    Initial Capital
                  </label>
                  <input
                    id="add-acc-capital"
                    type="number"
                    required
                    min="0"
                    value={newAccountCapital}
                    onChange={(e) => setNewAccountCapital(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label
                    htmlFor="add-acc-currency"
                    className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1"
                  >
                    Currency
                  </label>
                  <select
                    id="add-acc-currency"
                    value={newAccountCurrency}
                    onChange={(e) => setNewAccountCurrency(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary text-slate-200 cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold border border-brand-border text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAccount}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creatingAccount && <RefreshCw className="animate-spin" size={14} />}
                  {creatingAccount ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Manage Accounts */}
      {isManageModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-card border border-brand-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
              <h2 className="text-base font-bold">Manage Trading Accounts</h2>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              <div className="space-y-3">
                {accounts.map((acc) => {
                  const isCurrent = activeAccount?.id === acc.id;
                  const formatAccountCurrency = (val: number) => {
                    return new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: acc.currency,
                    }).format(val);
                  };

                  return (
                    <div
                      key={acc.id}
                      className={`flex justify-between items-center p-3 rounded-lg border transition-all ${
                        isCurrent
                          ? 'bg-brand-primary/5 border-brand-primary/45'
                          : 'bg-brand-dark/50 border-brand-border'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-sm truncate">{acc.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-border text-slate-400 uppercase">
                            {acc.currency}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-1 text-[11px] font-mono text-slate-400">
                          <span>Initial: {formatAccountCurrency(acc.initialCapital)}</span>
                          <span
                            className={
                              acc.currentCapital >= acc.initialCapital ? 'text-brand-success' : 'text-brand-danger'
                            }
                          >
                            Current: {formatAccountCurrency(acc.currentCapital)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-brand-primary flex items-center gap-1 mr-2 select-none bg-brand-primary/10 px-2 py-0.5 rounded">
                            <Check size={12} /> Active
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={accounts.length === 1}
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-1.5 text-slate-500 hover:text-brand-danger hover:bg-brand-danger/10 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          title="Delete account"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 bg-brand-dark/40 border-t border-brand-border flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-border text-slate-200 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#151C2C',
            color: '#f1f5f9',
            border: '1px solid #1F293D',
          },
        }}
      />
    </div>
  );
}

export default App;
