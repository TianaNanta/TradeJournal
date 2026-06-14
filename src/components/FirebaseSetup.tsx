import { AlertCircle, ArrowRight, CheckCircle, Database, Info } from 'lucide-react';
import { useState } from 'react';
import { saveFirebaseConfig } from '../utils/firebase';

interface FirebaseSetupProps {
  onConfigured: () => void;
}

export default function FirebaseSetup({ onConfigured }: FirebaseSetupProps) {
  const [rawConfig, setRawConfig] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePasteChange = (val: string) => {
    setRawConfig(val);
    setError(null);

    // Try to parse JSON directly
    try {
      const cleaned = val
        .trim()
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '');
      const json = JSON.parse(cleaned);
      if (json.apiKey && json.projectId) {
        setApiKey(json.apiKey || '');
        setAuthDomain(json.authDomain || '');
        setProjectId(json.projectId || '');
        setStorageBucket(json.storageBucket || '');
        setMessagingSenderId(json.messagingSenderId || '');
        setAppId(json.appId || '');
        return;
      }
    } catch (_e) {
      // Ignore and try regex
    }

    // Try regex matching for standard JavaScript object formatting
    const apiKeyMatch = val.match(/apiKey:\s*["']([^"']+)["']/);
    const authDomainMatch = val.match(/authDomain:\s*["']([^"']+)["']/);
    const projectIdMatch = val.match(/projectId:\s*["']([^"']+)["']/);
    const storageBucketMatch = val.match(/storageBucket:\s*["']([^"']+)["']/);
    const messagingSenderIdMatch = val.match(/messagingSenderId:\s*["']([^"']+)["']/);
    const appIdMatch = val.match(/appId:\s*["']([^"']+)["']/);

    if (apiKeyMatch) setApiKey(apiKeyMatch[1]);
    if (authDomainMatch) setAuthDomain(authDomainMatch[1]);
    if (projectIdMatch) setProjectId(projectIdMatch[1]);
    if (storageBucketMatch) setStorageBucket(storageBucketMatch[1]);
    if (messagingSenderIdMatch) setMessagingSenderId(messagingSenderIdMatch[1]);
    if (appIdMatch) setAppId(appIdMatch[1]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!apiKey.trim() || !projectId.trim()) {
      setError('API Key and Project ID are required minimum fields.');
      return;
    }

    const config = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    const isSaved = saveFirebaseConfig(config);
    if (isSaved) {
      setSuccess(true);
      setTimeout(() => {
        onConfigured();
      }, 1500);
    } else {
      setError('Failed to initialize Firebase with the provided configuration. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 text-slate-100 font-sans relative overflow-hidden">
      {/* Visual background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-brand-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-brand-success/5 blur-[120px] pointer-events-none" />

      <div className="bg-brand-card/60 backdrop-blur-md border border-brand-border w-full max-w-2xl rounded-2xl shadow-2xl p-6 sm:p-8 z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-brand-primary/10 rounded-xl text-brand-primary mb-2">
            <Database size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Connect Firebase Online</h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            TradeJournal needs a Firebase Project to store your trades online and handle user sign-in.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-brand-danger/10 border border-brand-danger/25 rounded-xl flex items-start gap-3 text-brand-danger text-sm">
            <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-brand-success/15 border border-brand-success/25 rounded-xl flex items-center gap-3 text-brand-success text-sm">
            <CheckCircle className="flex-shrink-0" size={18} />
            <span>Firebase configured successfully! Initializing app...</span>
          </div>
        )}

        {/* Quick Instructions Alert */}
        <div className="bg-brand-dark/50 border border-brand-border rounded-xl p-4 flex gap-3 text-xs text-slate-400">
          <Info className="text-brand-primary flex-shrink-0 mt-0.5" size={16} />
          <div className="space-y-1">
            <h4 className="font-semibold text-slate-300">How to get your config:</h4>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>
                Open{' '}
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-primary underline hover:text-brand-primary/80"
                >
                  Firebase Console
                </a>{' '}
                and create/select a project.
              </li>
              <li>
                Go to Project Settings &rarr; General &rarr; Add App (choose <strong>Web</strong>).
              </li>
              <li>Enable Firestore Database and Authentication (Google + Email/Password providers).</li>
              <li>Copy the `firebaseConfig` object and paste it in the box below.</li>
            </ol>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="fb-raw-config"
              className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
            >
              Paste Firebase Config Code Snippet
            </label>
            <textarea
              id="fb-raw-config"
              rows={4}
              value={rawConfig}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "...",\n  projectId: "...",\n  ...\n};`}
              className="w-full bg-brand-dark border border-brand-border rounded-xl p-3 text-xs focus:outline-none focus:border-brand-primary placeholder:text-slate-700 font-mono resize-none transition-all"
            />
            <span className="text-[10px] text-slate-500">Pasting automatically fills out the fields below.</span>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-brand-border"></div>
            <span className="flex-shrink mx-4 text-slate-600 text-xs font-semibold uppercase">Or enter manually</span>
            <div className="flex-grow border-t border-brand-border"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="fb-api-key"
                className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                API Key
              </label>
              <input
                id="fb-api-key"
                type="text"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-primary placeholder:text-slate-700"
              />
            </div>

            <div>
              <label
                htmlFor="fb-project-id"
                className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Project ID
              </label>
              <input
                id="fb-project-id"
                type="text"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="trade-journal-12345"
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-primary placeholder:text-slate-700"
              />
            </div>

            <div>
              <label
                htmlFor="fb-auth-domain"
                className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Auth Domain
              </label>
              <input
                id="fb-auth-domain"
                type="text"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                placeholder="trade-journal-12345.firebaseapp.com"
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-primary placeholder:text-slate-700"
              />
            </div>

            <div>
              <label
                htmlFor="fb-app-id"
                className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                App ID
              </label>
              <input
                id="fb-app-id"
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1:1234567890:web:abcdef..."
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-primary placeholder:text-slate-700"
              />
            </div>

            <div>
              <label
                htmlFor="fb-storage-bucket"
                className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Storage Bucket
              </label>
              <input
                id="fb-storage-bucket"
                type="text"
                value={storageBucket}
                onChange={(e) => setStorageBucket(e.target.value)}
                placeholder="trade-journal-12345.appspot.com"
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-primary placeholder:text-slate-700"
              />
            </div>

            <div>
              <label
                htmlFor="fb-messaging-sender-id"
                className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Messaging Sender ID
              </label>
              <input
                id="fb-messaging-sender-id"
                type="text"
                value={messagingSenderId}
                onChange={(e) => setMessagingSenderId(e.target.value)}
                placeholder="1234567890"
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-primary placeholder:text-slate-700"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/95 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm font-medium mt-6 shadow-lg shadow-brand-primary/10 hover:shadow-brand-primary/20"
          >
            Connect & Save <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
