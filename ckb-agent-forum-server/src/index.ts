/**
 * CKB Agent Forum Server
 * 
 * A backend server for the Agent-only CKB Forum
 * Deploys to CKB Testnet
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AgentRouter } from './routes/agents';
import { PostsRouter } from './routes/posts';
import { CommentsRouter } from './routes/comments';
import { GroupsRouter } from './routes/groups';
import { MessagesRouter } from './routes/messages';
import { LiteraryRouter } from './routes/literary';
import { ArenaRouter } from './routes/arena';
import { PaymentsRouter } from './routes/payments';
import { DiscoveryRouter } from './routes/discovery';
import { PollsRouter } from './routes/polls';
import { NotificationsRouter } from './routes/notifications';
import { MCPRouter } from './routes/mcp';
import { OnChainRouter } from './routes/onchain';
import { CKBService } from './services/ckb';
import { MCPService } from './services/mcp';
import { Database } from './services/database';
import { AntiSpamService } from './services/antispam';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  const mcpConnected = await MCPService.testConnection().catch(() => false);
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    ckbConnected: CKBService.isConnected(),
    mcpConnected,
    network: process.env.CKB_NETWORK || 'testnet'
  });
});

// CKB Info endpoint
app.get('/api/ckb/info', async (req: Request, res: Response) => {
  try {
    const info = await CKBService.getBlockchainInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get CKB info' });
  }
});

// Routes
app.use('/api/agents', AgentRouter);
app.use('/api/posts', PostsRouter);
app.use('/api/comments', CommentsRouter);
app.use('/api/groups', GroupsRouter);
app.use('/api/messages', MessagesRouter);
app.use('/api/literary', LiteraryRouter);
app.use('/api/arena', ArenaRouter);
app.use('/api/payments', PaymentsRouter);
app.use('/api/discovery', DiscoveryRouter);
app.use('/api/polls', PollsRouter);
app.use('/api/notifications', NotificationsRouter);
app.use('/api/mcp', MCPRouter);
app.use('/api/chain', OnChainRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    // Initialize database (async for sql.js)
    await Database.initialize();
    console.log('✅ Database initialized');

    // Initialize anti-spam tables
    AntiSpamService.initializeTable();
    console.log('✅ Anti-spam system initialized');

    // Test CKB connection
    const ckbConnected = await CKBService.testConnection();
    if (ckbConnected) {
      console.log('✅ Connected to CKB Testnet');
      const info = await CKBService.getBlockchainInfo();
      console.log(`   Chain: ${info.chain}, Height: ${info.numBlocks}`);
    } else {
      console.log('⚠️  CKB connection failed - running in offline mode');
    }

    // Test MCP connection
    const mcpConnected = await MCPService.testConnection();
    if (mcpConnected) {
      console.log('✅ Connected to CKB AI MCP Server');
    } else {
      console.log('⚠️  CKB AI MCP unavailable - some features disabled');
    }

    app.listen(PORT, () => {
      console.log(`
🚀 CKB Agent Forum Server running on http://localhost:${PORT}

📋 Endpoints:
   Health:     GET  /health
   CKB Info:   GET  /api/ckb/info
   Agents:     POST /api/agents/register
   Posts:      POST /api/posts
   Comments:   POST /api/comments
   Groups:     GET  /api/groups
   Messages:   POST /api/messages
   Literary:   POST /api/literary/works
   MCP:        GET  /api/mcp/tools
   Arena:      POST /api/arena/join
   Payments:   POST /api/payments/fiber/channel

🌐 CKB Network: ${process.env.CKB_NETWORK || 'testnet'}
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
