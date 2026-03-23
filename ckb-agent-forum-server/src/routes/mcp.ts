/**
 * MCP Router - CKB AI MCP Integration
 */

import { Router, Request, Response } from 'express';
import { MCPService } from '../services/mcp';
import { CKBService } from '../services/ckb';

export const MCPRouter = Router();

// Health check for MCP
MCPRouter.get('/health', async (req: Request, res: Response) => {
  const connected = await MCPService.testConnection();
  res.json({
    mcpConnected: connected,
    serverUrl: process.env.CKB_MCP_URL || 'https://mcp.ckbdev.com/ckbai'
  });
});

// List available MCP tools
MCPRouter.get('/tools', async (req: Request, res: Response) => {
  const tools = await MCPService.listTools();
  res.json({ tools });
});

// Get blockchain info via MCP
MCPRouter.get('/blockchain', async (req: Request, res: Response) => {
  const info = await MCPService.getBlockchainInfo();
  res.json(info);
});

// Get block by number
MCPRouter.get('/blocks/:number', async (req: Request, res: Response) => {
  const blockNumber = parseInt(req.params.number);
  const block = await MCPService.getBlock(blockNumber);
  if (!block) return res.status(404).json({ error: 'Block not found' });
  res.json(block);
});

// Get transaction
MCPRouter.get('/transactions/:hash', async (req: Request, res: Response) => {
  const tx = await MCPService.getTransaction(req.params.hash);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json(tx);
});

// Get balance for address
MCPRouter.get('/balance/:address', async (req: Request, res: Response) => {
  const balance = await MCPService.getBalance(req.params.address);
  res.json({ address: req.params.address, balance });
});

// Request faucet tokens (for testnet)
MCPRouter.post('/faucet', async (req: Request, res: Response) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Address required' });

  const result = await MCPService.requestFaucet(address);
  res.json(result);
});

// Deploy cell (simplified)
MCPRouter.post('/deploy-cell', async (req: Request, res: Response) => {
  const { lockScript } = req.body;
  if (!lockScript) return res.status(400).json({ error: 'lockScript required' });

  const result = await MCPService.deployCell(lockScript);
  res.json(result);
});

// Validate transaction
MCPRouter.post('/validate-tx', async (req: Request, res: Response) => {
  const { transaction } = req.body;
  if (!transaction) return res.status(400).json({ error: 'transaction required' });

  const result = await MCPService.validateTransaction(transaction);
  res.json(result);
});

// Combined endpoint: create agent with CKB wallet
MCPRouter.post('/agent-with-wallet', async (req: Request, res: Response) => {
  const { address, name, bio } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });

  // Get balance via MCP
  const balance = await MCPService.getBalance(address);

  // Try to get testnet tokens if balance is 0
  let faucetResult = null;
  if (!balance || balance === '0') {
    faucetResult = await MCPService.requestFaucet(address);
  }

  res.json({
    address,
    balance,
    faucet: faucetResult
  });
});
