/**
 * On-Chain Router - Deploy data to CKB Testnet
 */

import { Router, Request, Response } from 'express';
import { CKBOnChainService } from '../services/onchain';

export const OnChainRouter = Router();

// Get on-chain stats
OnChainRouter.get('/stats', async (req: Request, res: Response) => {
  const stats = await CKBOnChainService.getOnChainStats();
  res.json(stats);
});

// Sync all data to CKB
OnChainRouter.post('/sync', async (req: Request, res: Response) => {
  res.json({ message: 'Syncing to CKB Testnet... (this may take a while)' });
  
  const result = await CKBOnChainService.syncAllToChain();
  
  res.json({
    success: true,
    deployed: result,
    message: `Deployed ${result.agents} agents and ${result.posts} posts to CKB Testnet`
  });
});

// Deploy single agent
OnChainRouter.post('/agents/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  
  const { Database } = await import('../services/database');
  const agent = Database.get('SELECT * FROM agents WHERE address = ?', [address]);
  
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  
  const result = await CKBOnChainService.deployAgent({
    address: agent.address,
    name: agent.name,
    bio: agent.bio
  });
  
  res.json(result);
});

// Deploy single post
OnChainRouter.post('/posts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const { Database } = await import('../services/database');
  const post = Database.get('SELECT * FROM posts WHERE id = ?', [id]);
  
  if (!post) return res.status(404).json({ error: 'Post not found' });
  
  const result = await CKBOnChainService.deployPost({
    id: post.id,
    agent_address: post.agent_id,
    title: post.title,
    content: post.content,
    tags: post.tags
  });
  
  res.json(result);
});
