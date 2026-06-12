import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
  increment
} from "firebase/firestore";
import { getFirestoreDb } from "./firebase";
import type { Trade, BrokerAccount } from "../types";

// Helper to calculate PnL client-side
export function calculateTradePnL(trade: {
  type: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;
  exit_price?: number | null;
  fee: number;
}): { pnl: number; status: 'OPEN' | 'CLOSED' } {
  const quantity = Number(trade.quantity);
  const entry_price = Number(trade.entry_price);
  const fee = Number(trade.fee);
  const exit_price = trade.exit_price !== undefined && trade.exit_price !== null ? Number(trade.exit_price) : null;

  if (exit_price !== null && !isNaN(exit_price)) {
    const pnl = trade.type === 'LONG'
      ? (exit_price - entry_price) * quantity - fee
      : (entry_price - exit_price) * quantity - fee;
    return { pnl: Number(pnl.toFixed(2)), status: 'CLOSED' };
  } else {
    return { pnl: -fee, status: 'OPEN' };
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export const api = {
  // --- BROKER ACCOUNTS ---
  async getAccounts(userId: string): Promise<BrokerAccount[]> {
    const db = getFirestoreDb();
    const accountsRef = collection(db, "users", userId, "accounts");
    const q = query(accountsRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        initialCapital: data.initialCapital,
        currentCapital: data.currentCapital !== undefined ? data.currentCapital : data.initialCapital,
        currency: data.currency,
        createdAt: data.createdAt
      } as BrokerAccount;
    });
  },

  async createAccount(userId: string, accountData: Omit<BrokerAccount, "id" | "createdAt" | "currentCapital">): Promise<BrokerAccount> {
    const db = getFirestoreDb();
    const accountsRef = collection(db, "users", userId, "accounts");
    const createdAt = new Date().toISOString();
    const docRef = await addDoc(accountsRef, {
      ...accountData,
      currentCapital: accountData.initialCapital,
      createdAt
    });

    return {
      id: docRef.id,
      ...accountData,
      currentCapital: accountData.initialCapital,
      createdAt
    };
  },

  async deleteAccount(userId: string, accountId: string): Promise<void> {
    const db = getFirestoreDb();
    
    // First delete all trades under the account
    const tradesRef = collection(db, "users", userId, "accounts", accountId, "trades");
    const tradesSnapshot = await getDocs(tradesRef);
    const batch = writeBatch(db);
    tradesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Now delete the account document
    const accountRef = doc(db, "users", userId, "accounts", accountId);
    await deleteDoc(accountRef);
  },

  // --- TRADES ---
  async getTrades(userId: string, accountId: string): Promise<Trade[]> {
    const db = getFirestoreDb();
    const tradesRef = collection(db, "users", userId, "accounts", accountId, "trades");
    const q = query(tradesRef, orderBy("entry_date", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      } as Trade;
    });
  },

  async createTrade(
    userId: string,
    accountId: string,
    tradeData: Omit<Trade, "id" | "status" | "pnl" | "accountId">
  ): Promise<Trade> {
    const db = getFirestoreDb();
    const { pnl, status } = calculateTradePnL(tradeData);
    
    const payload = {
      ...tradeData,
      symbol: tradeData.symbol.toUpperCase(),
      status,
      pnl,
      accountId
    };

    // Add trade doc
    const tradesRef = collection(db, "users", userId, "accounts", accountId, "trades");
    const docRef = await addDoc(tradesRef, payload);

    // Update account's capital
    const accountRef = doc(db, "users", userId, "accounts", accountId);
    await updateDoc(accountRef, {
      currentCapital: increment(pnl)
    });

    return {
      id: docRef.id,
      ...payload
    };
  },

  async updateTrade(
    userId: string,
    accountId: string,
    tradeId: string,
    tradeData: Partial<Trade>
  ): Promise<Trade> {
    const db = getFirestoreDb();
    const tradeDocRef = doc(db, "users", userId, "accounts", accountId, "trades", tradeId);
    
    // Fetch existing trade to merge and find old PnL
    const docSnap = await getDoc(tradeDocRef);
    if (!docSnap.exists()) {
      throw new Error("Trade not found");
    }
    const existing = docSnap.data() as Trade;
    const merged = { ...existing, ...tradeData };
    
    // Recalculate pnl & status
    const { pnl, status } = calculateTradePnL({
      type: merged.type,
      quantity: merged.quantity,
      entry_price: merged.entry_price,
      exit_price: merged.exit_price,
      fee: merged.fee
    });

    const pnlDifference = pnl - existing.pnl;

    const payload = {
      ...tradeData,
      symbol: merged.symbol.toUpperCase(),
      status,
      pnl
    };

    // Update trade doc
    await updateDoc(tradeDocRef, payload);

    // Update account's capital with the PnL difference
    const accountRef = doc(db, "users", userId, "accounts", accountId);
    await updateDoc(accountRef, {
      currentCapital: increment(pnlDifference)
    });

    return {
      id: tradeId,
      ...merged,
      ...payload
    };
  },

  async deleteTrade(userId: string, accountId: string, tradeId: string): Promise<void> {
    const db = getFirestoreDb();
    const tradeDocRef = doc(db, "users", userId, "accounts", accountId, "trades", tradeId);
    
    // Fetch trade first to know its PnL for decrementation
    const docSnap = await getDoc(tradeDocRef);
    if (!docSnap.exists()) {
      throw new Error("Trade not found");
    }
    const trade = docSnap.data() as Trade;

    // Delete trade
    await deleteDoc(tradeDocRef);

    // Update account's capital
    const accountRef = doc(db, "users", userId, "accounts", accountId);
    await updateDoc(accountRef, {
      currentCapital: increment(-trade.pnl)
    });
  },

  async importCSV(userId: string, accountId: string, csvText: string): Promise<{ success: boolean; count: number }> {
    const db = getFirestoreDb();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error("No data in CSV file");
    }

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    
    const symbolIndex = headers.indexOf("symbol");
    const typeIndex = headers.indexOf("type");
    const quantityIndex = headers.indexOf("quantity");
    const entryPriceIndex = headers.indexOf("entry_price");
    const exitPriceIndex = headers.indexOf("exit_price");
    const entryDateIndex = headers.indexOf("entry_date");
    const exitDateIndex = headers.indexOf("exit_date");
    const feeIndex = headers.indexOf("fee");
    const setupIndex = headers.indexOf("setup");
    const notesIndex = headers.indexOf("notes");

    if (symbolIndex === -1 || typeIndex === -1 || quantityIndex === -1 || entryPriceIndex === -1 || entryDateIndex === -1) {
      throw new Error("Missing required CSV headers: symbol, type, quantity, entry_price, entry_date");
    }

    const tradesRef = collection(db, "users", userId, "accounts", accountId, "trades");
    let batch = writeBatch(db);
    let count = 0;
    let totalImportedPnL = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length < headers.length) continue;

      const symbol = row[symbolIndex];
      const type = row[typeIndex].toUpperCase();
      const quantity = Number(row[quantityIndex]);
      const entry_price = Number(row[entryPriceIndex]);
      const entry_date = row[entryDateIndex];

      if (!symbol || (type !== "LONG" && type !== "SHORT") || isNaN(quantity) || isNaN(entry_price) || !entry_date) {
        continue;
      }

      const exit_price = exitPriceIndex !== -1 && row[exitPriceIndex] !== "" ? Number(row[exitPriceIndex]) : null;
      const exit_date = exitDateIndex !== -1 && row[exitDateIndex] !== "" ? row[exitDateIndex] : null;
      const fee = feeIndex !== -1 && row[feeIndex] !== "" ? Number(row[feeIndex]) : 0;
      const setup = setupIndex !== -1 ? row[setupIndex] : null;
      const notes = notesIndex !== -1 ? row[notesIndex] : null;

      const cleanExitPrice = isNaN(Number(exit_price)) ? null : exit_price;
      const cleanFee = isNaN(fee) ? 0 : fee;

      const { pnl, status } = calculateTradePnL({
        type: type as 'LONG' | 'SHORT',
        quantity,
        entry_price,
        exit_price: cleanExitPrice,
        fee: cleanFee
      });

      const newDocRef = doc(tradesRef);
      batch.set(newDocRef, {
        symbol: symbol.toUpperCase(),
        type: type as 'LONG' | 'SHORT',
        quantity,
        entry_price,
        exit_price: cleanExitPrice,
        entry_date,
        exit_date,
        fee: cleanFee,
        setup: setup || null,
        notes: notes || null,
        status,
        pnl,
        accountId
      });

      totalImportedPnL += pnl;
      count++;
      
      if (count % 490 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    }

    if (count > 0 && count % 490 !== 0) {
      await batch.commit();
    }

    // Update account's capital in one batch at the end
    if (count > 0) {
      const accountRef = doc(db, "users", userId, "accounts", accountId);
      await updateDoc(accountRef, {
        currentCapital: increment(totalImportedPnL)
      });
    }

    return { success: count > 0, count };
  }
};
