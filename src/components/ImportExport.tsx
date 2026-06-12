import { useState } from 'react';
import { Download, Upload, Database, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import type { Trade } from '../types';
import { api } from '../utils/api';

interface ImportExportProps {
  trades: Trade[];
  onImportSuccess: () => void;
  userId: string;
  accountId: string;
}

export default function ImportExport({ trades, onImportSuccess, userId, accountId }: ImportExportProps) {
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pastedCSV, setPastedCSV] = useState('');

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trades, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trades_export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = ["symbol", "type", "quantity", "entry_price", "exit_price", "entry_date", "exit_date", "fee", "setup", "notes"];
    const rows = trades.map(t => [
      t.symbol,
      t.type,
      t.quantity,
      t.entry_price,
      t.exit_price ?? "",
      t.entry_date,
      t.exit_date ?? "",
      t.fee,
      t.setup ?? "",
      t.notes ?? ""
    ].map(val => {
      const strVal = String(val);
      if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    }).join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `trades_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const processCSV = async (csvText: string) => {
    setImportStatus(null);
    try {
      const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        setImportStatus({ type: 'error', message: "CSV file is empty or missing headers." });
        return;
      }
      
      const firstLine = lines[0];
      const headers = firstLine.split(",").map(h => h.trim().toLowerCase());
      
      const required = ["symbol", "type", "quantity", "entry_price", "entry_date"];
      const missing = required.filter(h => !headers.includes(h));
      
      if (missing.length > 0) {
        setImportStatus({ type: 'error', message: `Missing required CSV columns: ${missing.join(", ")}` });
        return;
      }

      const res = await api.importCSV(userId, accountId, csvText);
      if (res.success) {
        setImportStatus({ type: 'success', message: `Successfully imported ${res.count} trades.` });
        setPastedCSV('');
        onImportSuccess();
      } else {
        setImportStatus({ type: 'error', message: "Import completed but 0 trades were processed. Check row format." });
      }
    } catch (err: unknown) {
      console.error(err);
      setImportStatus({ type: 'error', message: "An error occurred parsing the CSV text." });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      await processCSV(text);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedCSV.trim()) return;
    await processCSV(pastedCSV);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import / Export</h1>
        <p className="text-slate-400 text-sm mt-1">Backup your trading journal or import trades from external logs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
              <Database className="text-brand-primary" size={20} />
              Export Database
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Download your entire trading history in JSON format (ideal for importing back into TradeJournal) or standard CSV format (useful for analysis in Excel or Google Sheets).
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={handleExportJSON}
              className="flex items-center justify-center gap-2 bg-brand-border hover:bg-brand-border/80 border border-brand-border text-slate-200 hover:text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              <Download size={16} /> JSON Backup
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 bg-brand-border hover:bg-brand-border/80 border border-brand-border text-slate-200 hover:text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              <FileText size={16} /> Export CSV
            </button>
          </div>
        </div>

        {/* Import Card (File Upload) */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
            <Upload className="text-brand-primary" size={20} />
            Import CSV File
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Upload a CSV file containing your trades. The file must include the following headers:
          </p>

          <div className="bg-brand-dark rounded-lg p-3.5 mb-6">
            <code className="text-xs text-slate-300 break-all select-all font-mono">
              symbol,type,quantity,entry_price,exit_price,entry_date,exit_date,fee,setup,notes
            </code>
            <div className="mt-2 text-[10px] text-slate-500">
              * Required: symbol, type (LONG/SHORT), quantity, entry_price, entry_date (ISO8601 string)
            </div>
          </div>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-brand-border hover:border-brand-primary/50 rounded-xl py-6 px-4 cursor-pointer hover:bg-brand-border/10 transition-all text-center">
            <Upload size={32} className="text-slate-500 mb-2" />
            <span className="text-sm font-semibold text-slate-300">Click to upload file</span>
            <span className="text-xs text-slate-500 mt-1">Accepts standard .csv logs</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Paste CSV Import */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-6">
        <h2 className="text-base font-bold mb-4">Or Paste CSV Log Directly</h2>
        
        <form onSubmit={handlePasteSubmit} className="space-y-4">
          <textarea
            rows={5}
            placeholder="symbol,type,quantity,entry_price,exit_price,entry_date,exit_date,fee,setup,notes&#10;ETHUSD,LONG,2,3500,3400,2026-06-12T08:00,2026-06-12T12:00,15,Breakout,Loss play"
            value={pastedCSV}
            onChange={(e) => setPastedCSV(e.target.value)}
            className="w-full bg-brand-dark border border-brand-border rounded-lg p-3 text-xs focus:outline-none focus:border-brand-primary placeholder:text-slate-700 font-mono resize-none"
          />

          <div className="flex justify-between items-center">
            <div>
              {importStatus && (
                <div className={`flex items-center gap-2 text-xs font-semibold ${
                  importStatus.type === 'success' ? 'text-brand-success' : 'text-brand-danger'
                }`}>
                  {importStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <span>{importStatus.message}</span>
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={!pastedCSV.trim()}
              className="bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors"
            >
              Parse & Import
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
