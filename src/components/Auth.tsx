import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { AlertCircle, Key, Lock, LogIn, Mail, RefreshCw, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { clearFirebaseConfig, getFirebaseAuth, googleProvider } from '../utils/firebase';

interface AuthProps {
  onResetConfig: () => void;
}

export default function Auth({ onResetConfig }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getFriendlyErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/invalid-email':
        return 'The email address is invalid.';
      case 'auth/user-disabled':
        return 'This user account has been disabled.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup closed before completion.';
      case 'auth/cancelled-in-popup-by-user':
        return 'Sign-in popup was cancelled.';
      default:
        return 'Failed to authenticate. Please try again.';
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError('Please fill out all fields.');
      setLoading(false);
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }
    }

    try {
      const auth = getFirebaseAuth();
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      console.error(err);
      const errorCode = (err as { code?: string }).code || '';
      setError(getFriendlyErrorMessage(errorCode));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error(err);
      const errorCode = (err as { code?: string }).code || '';
      if (errorCode !== 'auth/popup-closed-by-user') {
        setError(getFriendlyErrorMessage(errorCode));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfig = () => {
    if (
      window.confirm(
        'Are you sure you want to disconnect from this Firebase project? You will need to re-enter your config credentials.',
      )
    ) {
      clearFirebaseConfig();
      onResetConfig();
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 text-slate-100 font-sans relative overflow-hidden">
      {/* Background radial gradient spot */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-danger/5 blur-[130px] pointer-events-none" />

      <div className="bg-brand-card/60 backdrop-blur-md border border-brand-border w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 z-10 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome to TradeJournal</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            {isSignUp ? 'Create your trading account to log trades' : 'Sign in to access your online trading journal'}
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex border-b border-brand-border">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
              !isSignUp
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
              isSignUp
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-brand-danger/10 border border-brand-danger/25 rounded-lg flex items-start gap-2.5 text-brand-danger text-xs leading-relaxed animate-shake">
            <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-brand-dark border border-brand-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand-primary text-slate-100 placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-brand-dark border border-brand-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand-primary text-slate-100 placeholder:text-slate-600"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label
                htmlFor="auth-confirm-password"
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  id="auth-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-brand-dark border border-brand-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand-primary text-slate-100 placeholder:text-slate-600"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-50 disabled:cursor-wait text-white font-semibold py-2 rounded-lg text-sm transition-colors mt-6 shadow-md shadow-brand-primary/10 hover:shadow-brand-primary/20"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : isSignUp ? (
              <>
                <UserPlus size={16} /> Create Account
              </>
            ) : (
              <>
                <LogIn size={16} /> Sign In
              </>
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-brand-border"></div>
          <span className="flex-shrink mx-4 text-slate-600 text-xs font-semibold uppercase">Or continue with</span>
          <div className="flex-grow border-t border-brand-border"></div>
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-900 font-semibold py-2 rounded-lg text-sm transition-colors border border-slate-200"
        >
          {/* Google Icon G SVG */}
          <svg className="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24">
            <title>Google</title>
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.927h6.6c-.285 1.514-1.14 2.8-2.43 3.66v3.048h3.915c2.29-2.113 3.66-5.22 3.66-8.565z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.955-1.08 7.94-2.91l-3.915-3.048c-1.08.72-2.47 1.155-4.025 1.155-3.1 0-5.725-2.093-6.66-4.908H1.38v3.15C3.36 21.36 7.425 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.34 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.56H1.38C.5 8.31 0 10.1 0 12s.5 3.69 1.38 5.44l3.96-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.425 0 3.36 2.64 1.38 6.56l3.96 3.15c.935-2.815 3.56-4.96 6.66-4.96z"
            />
          </svg>
          Google
        </button>

        {/* Footer actions */}
        <div className="pt-4 border-t border-brand-border text-center">
          <button
            type="button"
            onClick={handleResetConfig}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-primary transition-colors focus:outline-none"
          >
            <Key size={12} /> Disconnect Firebase Project
          </button>
        </div>
      </div>
    </div>
  );
}
