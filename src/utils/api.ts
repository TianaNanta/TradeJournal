import type { Trade, DashboardStats } from "../types";

export const api = {
  async getTrades(): Promise<Trade[]> {
    const res = await fetch("/api/trades");
    if (!res.ok) {
      throw new Error("Failed to fetch trades");
    }
    return res.json() as Promise<Trade[]>;
  },

  async createTrade(trade: Omit<Trade, "id" | "status" | "pnl">): Promise<Trade> {
    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trade),
    });
    if (!res.ok) {
      throw new Error("Failed to create trade");
    }
    return res.json() as Promise<Trade>;
  },

  async updateTrade(id: number, trade: Partial<Trade>): Promise<Trade> {
    const res = await fetch(`/api/trades/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trade),
    });
    if (!res.ok) {
      throw new Error("Failed to update trade");
    }
    return res.json() as Promise<Trade>;
  },

  async deleteTrade(id: number): Promise<void> {
    const res = await fetch(`/api/trades/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error("Failed to delete trade");
    }
  },

  async getStats(): Promise<DashboardStats> {
    const res = await fetch("/api/stats");
    if (!res.ok) {
      throw new Error("Failed to fetch stats");
    }
    return res.json() as Promise<DashboardStats>;
  },

  async importCSV(csvText: string): Promise<{ success: boolean; count: number }> {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: csvText,
    });
    if (!res.ok) {
      throw new Error("Failed to import CSV");
    }
    return res.json() as Promise<{ success: boolean; count: number }>;
  },
};
