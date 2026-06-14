import { Database } from 'bun:sqlite';

export interface TradeInput {
  symbol: string;
  type: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;
  exit_price?: number | null;
  entry_date: string;
  exit_date?: string | null;
  fee?: number;
  setup?: string | null;
  notes?: string | null;
}

export interface DbTrade {
  id: number;
  symbol: string;
  type: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;
  exit_price: number | null;
  entry_date: string;
  exit_date: string | null;
  fee: number;
  status: 'OPEN' | 'CLOSED';
  pnl: number;
  setup: string | null;
  notes: string | null;
  created_at: string;
}

const db = new Database('trades.db', { create: true });

export function initDb(): void {
  db.query(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL,
      entry_date TEXT NOT NULL,
      exit_date TEXT,
      fee REAL DEFAULT 0,
      status TEXT NOT NULL,
      pnl REAL DEFAULT 0,
      setup TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

function parseExitPrice(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  return Number.isNaN(num) ? null : num;
}

function parseExitDate(val: unknown): string | null {
  if (val === undefined || val === null || val === '') return null;
  return String(val);
}

export function getTrades(): DbTrade[] {
  return db.query(`SELECT * FROM trades ORDER BY entry_date DESC`).all() as DbTrade[];
}

export function getTrade(id: number): DbTrade | null {
  return db.query(`SELECT * FROM trades WHERE id = $id`).get({ $id: id }) as DbTrade | null;
}

export function createTrade(tradeData: TradeInput): DbTrade {
  const exit_price = parseExitPrice(tradeData.exit_price);
  const exit_date = parseExitDate(tradeData.exit_date);
  const fee = Number(tradeData.fee ?? 0);
  const quantity = Number(tradeData.quantity);
  const entry_price = Number(tradeData.entry_price);

  let pnl = 0;
  let status: 'OPEN' | 'CLOSED' = 'OPEN';

  if (exit_price !== null) {
    status = 'CLOSED';
    if (tradeData.type === 'LONG') {
      pnl = (exit_price - entry_price) * quantity - fee;
    } else {
      pnl = (entry_price - exit_price) * quantity - fee;
    }
  } else {
    status = 'OPEN';
    pnl = -fee;
  }

  const result = db
    .query(`
    INSERT INTO trades (symbol, type, quantity, entry_price, exit_price, entry_date, exit_date, fee, status, pnl, setup, notes)
    VALUES ($symbol, $type, $quantity, $entry_price, $exit_price, $entry_date, $exit_date, $fee, $status, $pnl, $setup, $notes)
    RETURNING id
  `)
    .get({
      $symbol: tradeData.symbol.toUpperCase(),
      $type: tradeData.type,
      $quantity: quantity,
      $entry_price: entry_price,
      $exit_price: exit_price,
      $entry_date: tradeData.entry_date,
      $exit_date: exit_date,
      $fee: fee,
      $status: status,
      $pnl: pnl,
      $setup: tradeData.setup || null,
      $notes: tradeData.notes || null,
    }) as { id: number } | null;

  if (!result) {
    throw new Error('Failed to insert trade');
  }

  const inserted = getTrade(result.id);
  if (!inserted) {
    throw new Error('Failed to retrieve inserted trade');
  }
  return inserted;
}

export function updateTrade(id: number, tradeData: Partial<TradeInput>): DbTrade | null {
  const existing = getTrade(id);
  if (!existing) return null;

  const merged = {
    ...existing,
    ...tradeData,
  };

  const exit_price = parseExitPrice(tradeData.exit_price !== undefined ? tradeData.exit_price : existing.exit_price);
  const exit_date = parseExitDate(tradeData.exit_date !== undefined ? tradeData.exit_date : existing.exit_date);
  const fee = Number(tradeData.fee !== undefined ? tradeData.fee : existing.fee);
  const quantity = Number(tradeData.quantity !== undefined ? tradeData.quantity : existing.quantity);
  const entry_price = Number(tradeData.entry_price !== undefined ? tradeData.entry_price : existing.entry_price);

  let pnl = 0;
  let status: 'OPEN' | 'CLOSED' = 'OPEN';

  if (exit_price !== null) {
    status = 'CLOSED';
    if (merged.type === 'LONG') {
      pnl = (exit_price - entry_price) * quantity - fee;
    } else {
      pnl = (entry_price - exit_price) * quantity - fee;
    }
  } else {
    status = 'OPEN';
    pnl = -fee;
  }

  db.query(`
    UPDATE trades
    SET symbol = $symbol,
        type = $type,
        quantity = $quantity,
        entry_price = $entry_price,
        exit_price = $exit_price,
        entry_date = $entry_date,
        exit_date = $exit_date,
        fee = $fee,
        status = $status,
        pnl = $pnl,
        setup = $setup,
        notes = $notes
    WHERE id = $id
  `).run({
    $id: id,
    $symbol: merged.symbol.toUpperCase(),
    $type: merged.type,
    $quantity: quantity,
    $entry_price: entry_price,
    $exit_price: exit_price,
    $entry_date: merged.entry_date,
    $exit_date: exit_date,
    $fee: fee,
    $status: status,
    $pnl: pnl,
    $setup: merged.setup || null,
    $notes: merged.notes || null,
  });

  return getTrade(id);
}

export function deleteTrade(id: number): boolean {
  const result = db.query(`DELETE FROM trades WHERE id = $id`).run({ $id: id });
  return result.changes > 0;
}

export function getStats() {
  const trades = getTrades();

  let totalNetPnL = 0;
  const totalTrades = trades.length;
  let openTrades = 0;
  let closedTradesCount = 0;
  let winsCount = 0;
  let lossesCount = 0;
  let sumWinPnL = 0;
  let sumLossPnL = 0;

  const setupPnLMap = new Map<string, { pnl: number; count: number }>();
  const datePnLMap = new Map<string, number>();

  for (const t of trades) {
    totalNetPnL += t.pnl;

    if (t.status === 'OPEN') {
      openTrades++;
    } else {
      closedTradesCount++;
      if (t.pnl > 0) {
        winsCount++;
        sumWinPnL += t.pnl;
      } else if (t.pnl < 0) {
        lossesCount++;
        sumLossPnL += t.pnl;
      }
    }

    const setupName = t.setup?.trim() || 'No Setup';
    const currentSetup = setupPnLMap.get(setupName) || { pnl: 0, count: 0 };
    setupPnLMap.set(setupName, {
      pnl: currentSetup.pnl + t.pnl,
      count: currentSetup.count + 1,
    });

    const rawDate = t.exit_date || t.entry_date;
    const dateStr = rawDate ? rawDate.split('T')[0] : 'Unknown';
    datePnLMap.set(dateStr, (datePnLMap.get(dateStr) || 0) + t.pnl);
  }

  const winRate = closedTradesCount > 0 ? (winsCount / closedTradesCount) * 100 : 0;

  const absLossPnL = Math.abs(sumLossPnL);
  const profitFactor = absLossPnL > 0 ? sumWinPnL / absLossPnL : totalNetPnL;

  const avgWin = winsCount > 0 ? sumWinPnL / winsCount : 0;
  const avgLoss = lossesCount > 0 ? sumLossPnL / lossesCount : 0;

  const sortedDates = Array.from(datePnLMap.keys())
    .filter((d) => d !== 'Unknown')
    .sort((a, b) => a.localeCompare(b));

  let cumulativePnLAccum = 0;
  const cumulativePnL = sortedDates.map((date) => {
    cumulativePnLAccum += datePnLMap.get(date) || 0;
    return { date, pnl: Number(cumulativePnLAccum.toFixed(2)) };
  });

  const pnlBySetup = Array.from(setupPnLMap.entries()).map(([setup, data]) => ({
    setup,
    pnl: Number(data.pnl.toFixed(2)),
    count: data.count,
  }));

  const winLossCount = [
    { name: 'Wins', value: winsCount },
    { name: 'Losses', value: lossesCount },
  ];

  return {
    totalNetPnL: Number(totalNetPnL.toFixed(2)),
    winRate: Number(winRate.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
    totalTrades,
    openTrades,
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    cumulativePnL,
    pnlBySetup,
    winLossCount,
  };
}
