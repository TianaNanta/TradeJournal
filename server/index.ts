import { createTrade, deleteTrade, getStats, getTrade, getTrades, initDb, type TradeInput, updateTrade } from './db';

// Initialize Database
initDb();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function importCSVTrades(csvText: string): number {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('No data in CSV file');
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  const symbolIndex = headers.indexOf('symbol');
  const typeIndex = headers.indexOf('type');
  const quantityIndex = headers.indexOf('quantity');
  const entryPriceIndex = headers.indexOf('entry_price');
  const exitPriceIndex = headers.indexOf('exit_price');
  const entryDateIndex = headers.indexOf('entry_date');
  const exitDateIndex = headers.indexOf('exit_date');
  const feeIndex = headers.indexOf('fee');
  const setupIndex = headers.indexOf('setup');
  const notesIndex = headers.indexOf('notes');

  if (
    symbolIndex === -1 ||
    typeIndex === -1 ||
    quantityIndex === -1 ||
    entryPriceIndex === -1 ||
    entryDateIndex === -1
  ) {
    throw new Error('Missing required CSV headers: symbol, type, quantity, entry_price, entry_date');
  }

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < headers.length) continue;

    const symbol = row[symbolIndex];
    const type = row[typeIndex].toUpperCase();
    const quantity = Number(row[quantityIndex]);
    const entry_price = Number(row[entryPriceIndex]);
    const entry_date = row[entryDateIndex];

    if (
      !symbol ||
      (type !== 'LONG' && type !== 'SHORT') ||
      Number.isNaN(quantity) ||
      Number.isNaN(entry_price) ||
      !entry_date
    ) {
      continue;
    }

    const exit_price = exitPriceIndex !== -1 && row[exitPriceIndex] !== '' ? Number(row[exitPriceIndex]) : null;
    const exit_date = exitDateIndex !== -1 && row[exitDateIndex] !== '' ? row[exitDateIndex] : null;
    const fee = feeIndex !== -1 && row[feeIndex] !== '' ? Number(row[feeIndex]) : 0;
    const setup = setupIndex !== -1 ? row[setupIndex] : null;
    const notes = notesIndex !== -1 ? row[notesIndex] : null;

    createTrade({
      symbol,
      type: type as 'LONG' | 'SHORT',
      quantity,
      entry_price,
      exit_price: Number.isNaN(Number(exit_price)) ? null : exit_price,
      entry_date,
      exit_date,
      fee: Number.isNaN(fee) ? 0 : fee,
      setup,
      notes,
    });
    count++;
  }

  return count;
}

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    if (method === 'OPTIONS') {
      return corsPreflight();
    }

    if (path.startsWith('/api/')) {
      try {
        if (path === '/api/trades' && method === 'GET') {
          return jsonResponse(getTrades());
        }

        if (path === '/api/trades' && method === 'POST') {
          const body = (await req.json()) as unknown;
          if (body && typeof body === 'object') {
            const data = body as Record<string, unknown>;
            if (!data.symbol || !data.type || !data.quantity || !data.entry_price || !data.entry_date) {
              return jsonResponse({ error: 'Missing required fields' }, 400);
            }
            const trade = createTrade({
              symbol: String(data.symbol),
              type: data.type === 'SHORT' ? 'SHORT' : 'LONG',
              quantity: Number(data.quantity),
              entry_price: Number(data.entry_price),
              exit_price: data.exit_price !== undefined && data.exit_price !== null ? Number(data.exit_price) : null,
              entry_date: String(data.entry_date),
              exit_date: data.exit_date !== undefined && data.exit_date !== null ? String(data.exit_date) : null,
              fee: data.fee !== undefined ? Number(data.fee) : 0,
              setup: data.setup !== undefined ? String(data.setup) : null,
              notes: data.notes !== undefined ? String(data.notes) : null,
            });
            return jsonResponse(trade, 201);
          }
          return jsonResponse({ error: 'Invalid JSON body' }, 400);
        }

        const tradeIdMatch = path.match(/^\/api\/trades\/(\d+)$/);
        if (tradeIdMatch) {
          const id = parseInt(tradeIdMatch[1], 10);
          if (method === 'GET') {
            const trade = getTrade(id);
            if (!trade) return jsonResponse({ error: 'Trade not found' }, 404);
            return jsonResponse(trade);
          }

          if (method === 'PUT') {
            const body = (await req.json()) as unknown;
            if (body && typeof body === 'object') {
              const data = body as Record<string, unknown>;
              const updateData: Partial<TradeInput> = {};
              if (data.symbol !== undefined) updateData.symbol = String(data.symbol);
              if (data.type !== undefined) updateData.type = data.type === 'SHORT' ? 'SHORT' : 'LONG';
              if (data.quantity !== undefined) updateData.quantity = Number(data.quantity);
              if (data.entry_price !== undefined) updateData.entry_price = Number(data.entry_price);
              if (data.exit_price !== undefined)
                updateData.exit_price =
                  data.exit_price !== null && data.exit_price !== '' ? Number(data.exit_price) : null;
              if (data.entry_date !== undefined) updateData.entry_date = String(data.entry_date);
              if (data.exit_date !== undefined)
                updateData.exit_date = data.exit_date !== null && data.exit_date !== '' ? String(data.exit_date) : null;
              if (data.fee !== undefined) updateData.fee = Number(data.fee);
              if (data.setup !== undefined) updateData.setup = data.setup !== null ? String(data.setup) : null;
              if (data.notes !== undefined) updateData.notes = data.notes !== null ? String(data.notes) : null;

              const updated = updateTrade(id, updateData);
              if (!updated) return jsonResponse({ error: 'Trade not found' }, 404);
              return jsonResponse(updated);
            }
            return jsonResponse({ error: 'Invalid JSON body' }, 400);
          }

          if (method === 'DELETE') {
            const deleted = deleteTrade(id);
            if (!deleted) return jsonResponse({ error: 'Trade not found' }, 404);
            return jsonResponse({ success: true });
          }
        }

        if (path === '/api/stats' && method === 'GET') {
          return jsonResponse(getStats());
        }

        if (path === '/api/import' && method === 'POST') {
          const csvText = await req.text();
          const count = importCSVTrades(csvText);
          return jsonResponse({ success: true, count });
        }

        return jsonResponse({ error: 'Not Found' }, 404);
      } catch (err) {
        console.error(err);
        return jsonResponse({ error: 'Internal Server Error' }, 500);
      }
    }

    let filePath = `./dist${path}`;
    if (path === '/') {
      filePath = './dist/index.html';
    }

    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    const indexFile = Bun.file('./dist/index.html');
    if (await indexFile.exists()) {
      return new Response(indexFile);
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Server listening on port ${server.port}`);
