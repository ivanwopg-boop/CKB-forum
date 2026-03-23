/**
 * Arena Router - Trading competitions
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../services/database';

export const ArenaRouter = Router();

const ARENAS = [
  { id: 'daily-ckb', name: 'Daily CKB Trading', description: 'Trade CKB derivatives', status: 'active' },
  { id: 'weekly-eth', name: 'Weekly ETH Trading', description: 'Trade ETH derivatives', status: 'active' }
];

const STOCKS = [
  { id: 'ckb', symbol: 'CKB', name: 'Nervos Native Token', price: 0.01 },
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', price: 2000 },
  { id: 'btc', symbol: 'BTC', name: 'Bitcoin', price: 50000 }
];

ArenaRouter.get('/', (req: Request, res: Response) => {
  res.json({ arenas: ARENAS });
});

ArenaRouter.get('/:id/leaderboard', (req: Request, res: Response) => {
  const portfolios = Database.all(
    `SELECT p.*, a.name as agent_name 
     FROM arena_portfolios p 
     JOIN agents a ON p.agent_id = a.id 
     WHERE p.arena_id = ? 
     ORDER BY p.pnl_percentage DESC 
     LIMIT 20`,
    [req.params.id]
  );
  
  const entries = portfolios.map((p, i) => ({
    rank: i + 1,
    agent_name: p.agent_name || 'Unknown',
    portfolio_value: p.portfolio_value,
    pnl: p.pnl_percentage
  }));
  
  res.json({ arena_id: req.params.id, period: 'daily', entries });
});

ArenaRouter.get('/:id/stocks', (req: Request, res: Response) => {
  // Add some variation to prices
  const stocksWithVariation = STOCKS.map(s => ({
    ...s,
    price_change: (Math.random() - 0.5) * 0.1,
    volume: Math.floor(Math.random() * 1000000)
  }));
  res.json({ stocks: stocksWithVariation });
});

ArenaRouter.post('/:id/join', async (req: Request, res: Response) => {
  const { address } = req.headers;
  const { id: arenaId } = req.params;

  if (!address) return res.status(401).json({ error: 'Auth required' });

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  const existing = Database.get('SELECT * FROM arena_portfolios WHERE arena_id = ? AND agent_id = ?', [arenaId, agent?.id]);
  if (existing) return res.status(409).json({ error: 'Already joined' });

  const portfolioId = uuidv4();
  Database.run(
    'INSERT INTO arena_portfolios (id, arena_id, agent_id, balance, portfolio_value) VALUES (?, ?, ?, 10000, 10000)',
    [portfolioId, arenaId, agent?.id]
  );

  const portfolio = Database.get('SELECT * FROM arena_portfolios WHERE id = ?', [portfolioId]);
  res.status(201).json(portfolio);
});

ArenaRouter.post('/:id/trade', async (req: Request, res: Response) => {
  const { address } = req.headers;
  const { id: arenaId } = req.params;
  const { stock_id, quantity, trade_type } = req.body;

  if (!address) return res.status(401).json({ error: 'Auth required' });
  if (!stock_id || !quantity || !trade_type) {
    return res.status(400).json({ error: 'Missing stock_id, quantity, or trade_type' });
  }

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  const portfolio = Database.get('SELECT * FROM arena_portfolios WHERE arena_id = ? AND agent_id = ?', [arenaId, agent?.id]);
  if (!portfolio) return res.status(404).json({ error: 'Join arena first' });

  const stock = STOCKS.find(s => s.id === stock_id);
  if (!stock) return res.status(404).json({ error: 'Stock not found' });

  const tradeId = uuidv4();
  const total = Number(quantity) * stock.price;

  // Check balance for buy
  if (trade_type === 'buy' && portfolio.balance < total) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  Database.run(
    'INSERT INTO arena_trades (id, arena_id, agent_id, stock_id, quantity, trade_type, price, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [tradeId, arenaId, agent?.id, stock_id, quantity, trade_type, stock.price, total]
  );

  // Update portfolio
  if (trade_type === 'buy') {
    Database.run('UPDATE arena_portfolios SET balance = balance - ? WHERE id = ?', [total, portfolio.id]);
  } else {
    Database.run('UPDATE arena_portfolios SET balance = balance + ? WHERE id = ?', [total, portfolio.id]);
  }

  const updated = Database.get('SELECT * FROM arena_portfolios WHERE id = ?', [portfolio.id]);
  res.status(201).json({ trade_id: tradeId, portfolio: updated });
});

// Get user's portfolio
ArenaRouter.get('/:id/portfolio', async (req: Request, res: Response) => {
  const { address } = req.headers;
  const { id: arenaId } = req.params;

  if (!address) return res.status(401).json({ error: 'Auth required' });

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  const portfolio = Database.get('SELECT * FROM arena_portfolios WHERE arena_id = ? AND agent_id = ?', [arenaId, agent?.id]);
  
  if (!portfolio) return res.status(404).json({ error: 'Join arena first' });

  // Get positions
  const trades = Database.all(
    'SELECT stock_id, SUM(CASE WHEN trade_type = ? THEN quantity ELSE -quantity END) as quantity FROM arena_trades WHERE arena_id = ? AND agent_id = ? GROUP BY stock_id',
    ['buy', arenaId, agent?.id]
  );

  const positions = trades.filter(t => t.quantity > 0).map(t => {
    const stock = STOCKS.find(s => s.id === t.stock_id);
    return { stock_id: t.stock_id, symbol: stock?.symbol, quantity: t.quantity, value: t.quantity * stock?.price };
  });

  res.json({ portfolio, positions });
});

// Get trade history
ArenaRouter.get('/:id/trades', async (req: Request, res: Response) => {
  const { address } = req.headers;
  const { id: arenaId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  if (!address) return res.status(401).json({ error: 'Auth required' });

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  const trades = Database.all(
    'SELECT * FROM arena_trades WHERE arena_id = ? AND agent_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [arenaId, agent?.id, limit, offset]
  );

  res.json({ trades });
});

// Get snapshots (historical portfolio values)
ArenaRouter.get('/:id/snapshots', async (req: Request, res: Response) => {
  const { address } = req.headers;
  const { id: arenaId } = req.params;

  if (!address) return res.status(401).json({ error: 'Auth required' });

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  const snapshots = Database.all(
    'SELECT * FROM arena_snapshots WHERE arena_id = ? AND agent_id = ? ORDER BY created_at DESC LIMIT 50',
    [arenaId, agent?.id]
  );

  res.json({ snapshots });
});
