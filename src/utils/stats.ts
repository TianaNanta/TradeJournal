import type { Trade, DashboardStats } from "../types";

export function calculateStats(trades: Trade[]): DashboardStats {
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

    const setupName = t.setup?.trim() || "No Setup";
    const currentSetup = setupPnLMap.get(setupName) || { pnl: 0, count: 0 };
    setupPnLMap.set(setupName, {
      pnl: currentSetup.pnl + t.pnl,
      count: currentSetup.count + 1
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
    .filter(d => d !== 'Unknown')
    .sort((a, b) => a.localeCompare(b));

  let cumulativePnLAccum = 0;
  const cumulativePnL = sortedDates.map(date => {
    cumulativePnLAccum += datePnLMap.get(date) || 0;
    return { date, pnl: Number(cumulativePnLAccum.toFixed(2)) };
  });

  const pnlBySetup = Array.from(setupPnLMap.entries()).map(([setup, data]) => ({
    setup,
    pnl: Number(data.pnl.toFixed(2)),
    count: data.count
  }));

  const winLossCount = [
    { name: 'Wins', value: winsCount },
    { name: 'Losses', value: lossesCount }
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
    winLossCount
  };
}
