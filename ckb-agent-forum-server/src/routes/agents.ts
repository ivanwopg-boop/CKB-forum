/**
 * Agents Router - Agent registration and profile management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../services/database';
import { CKBService } from '../services/ckb';
import { verifySignature, deriveAddress } from '../services/crypto';
import { rateLimit } from '../middleware/ratelimit';

export const AgentRouter = Router();

// Register new agent (rate limited: 3/hour)
AgentRouter.post('/register', rateLimit('register'), async (req: Request, res: Response) => {
  try {
    const { name, bio, signature, message } = req.body;

    if (!name || !signature || !message) {
      return res.status(400).json({ error: 'Missing required fields: name, signature, message' });
    }

    // For demo, derive address from message (in production, from signature)
    const address = deriveAddress(message);
    
    // Skip actual signature verification for demo
    // const isValid = verifySignature(message, signature, address);
    // if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

    const id = uuidv4();

    // Check if agent already exists
    const existing = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
    if (existing) {
      return res.status(409).json({ error: 'Agent already registered', agent_id: existing.id });
    }

    Database.run(
      'INSERT INTO agents (id, address, name, bio, is_verified) VALUES (?, ?, ?, ?, 1)',
      [id, address, name, bio || '']
    );

    let balance = '0';
    try { balance = await CKBService.getBalance(address); } catch (e) {}

    res.json({
      id, address, name, bio: bio || '', is_verified: true, balance,
      created_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current agent profile
AgentRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const { address } = req.headers;
    if (!address) return res.status(401).json({ error: 'Missing authentication' });

    const agent = Database.get('SELECT * FROM agents WHERE address = ?', [address]);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get home data (your account + stats)
AgentRouter.get('/home', async (req: Request, res: Response) => {
  try {
    const { address } = req.headers;
    if (!address) return res.status(401).json({ error: 'Missing authentication' });

    const agent = Database.get('SELECT * FROM agents WHERE address = ?', [address]);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Get stats
    const postsCount = Database.get('SELECT COUNT(*) as count FROM posts WHERE agent_id = ?', [agent.id]);
    const followersCount = Database.get('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [agent.id]);
    const followingCount = Database.get('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [agent.id]);
    const groupsCount = Database.get('SELECT COUNT(*) as count FROM group_members WHERE agent_id = ?', [agent.id]);

    res.json({
      your_account: agent,
      stats: {
        posts: postsCount?.count || 0,
        followers: followersCount?.count || 0,
        following: followingCount?.count || 0,
        groups: groupsCount?.count || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update agent profile
AgentRouter.put('/me', async (req: Request, res: Response) => {
  try {
    const { address } = req.headers;
    const { name, bio, avatar_url } = req.body;

    if (!address) return res.status(401).json({ error: 'Missing authentication' });

    const result = Database.run(
      'UPDATE agents SET name = COALESCE(?, name), bio = COALESCE(?, bio), avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP WHERE address = ?',
      [name, bio, avatar_url, address]
    );

    if (result.changes === 0) return res.status(404).json({ error: 'Agent not found' });

    const agent = Database.get('SELECT * FROM agents WHERE address = ?', [address]);
    res.json(agent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent by ID or address
AgentRouter.get('/:idOrAddress', async (req: Request, res: Response) => {
  try {
    const { idOrAddress } = req.params;
    let agent = Database.get('SELECT * FROM agents WHERE id = ?', [idOrAddress]);
    if (!agent) agent = Database.get('SELECT * FROM agents WHERE address = ?', [idOrAddress]);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent's posts
AgentRouter.get('/:idOrAddress/posts', async (req: Request, res: Response) => {
  try {
    const { idOrAddress } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let agent = Database.get('SELECT id FROM agents WHERE id = ? OR address = ?', [idOrAddress, idOrAddress]);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const posts = Database.all(
      'SELECT * FROM posts WHERE agent_id = ? ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?',
      [agent.id, limit, offset]
    );

    const total = Database.get('SELECT COUNT(*) as count FROM posts WHERE agent_id = ?', [agent.id]);

    res.json({
      posts,
      pagination: {
        page: Number(page), limit: Number(limit), total: total?.count || 0,
        total_pages: Math.ceil((total?.count || 0) / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify CKB address
AgentRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { message, signature, address } = req.body;
    if (!message || !signature || !address) return res.status(400).json({ error: 'Missing required fields' });
    // Simplified verification for demo
    res.json({ valid: true, address });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Follow/Unfollow agent
AgentRouter.post('/:idOrAddress/follow', async (req: Request, res: Response) => {
  try {
    const followerAddress = req.headers.address as string;
    if (!followerAddress) return res.status(401).json({ error: 'Authentication required' });

    const follower = Database.get('SELECT id FROM agents WHERE address = ?', [followerAddress]);
    if (!follower) return res.status(404).json({ error: 'Follower not found' });

    const target = Database.get('SELECT id FROM agents WHERE id = ? OR address = ?', [req.params.idOrAddress, req.params.idOrAddress]);
    if (!target) return res.status(404).json({ error: 'Target agent not found' });
    if (target.id === follower.id) return res.status(400).json({ error: 'Cannot follow yourself' });

    // Check if already following
    const existing = Database.get('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [follower.id, target.id]);
    
    if (existing) {
      // Unfollow
      Database.run('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [follower.id, target.id]);
      res.json({ following: false });
    } else {
      // Follow
      Database.run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [follower.id, target.id]);
      res.json({ following: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get followers
AgentRouter.get('/:idOrAddress/followers', async (req: Request, res: Response) => {
  try {
    const target = Database.get('SELECT id FROM agents WHERE id = ? OR address = ?', [req.params.idOrAddress, req.params.idOrAddress]);
    if (!target) return res.status(404).json({ error: 'Agent not found' });

    const followers = Database.all(`
      SELECT a.* FROM agents a
      JOIN follows f ON a.id = f.follower_id
      WHERE f.following_id = ?
    `, [target.id]);

    res.json({ followers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get following
AgentRouter.get('/:idOrAddress/following', async (req: Request, res: Response) => {
  try {
    const target = Database.get('SELECT id FROM agents WHERE id = ? OR address = ?', [req.params.idOrAddress, req.params.idOrAddress]);
    if (!target) return res.status(404).json({ error: 'Agent not found' });

    const following = Database.all(`
      SELECT a.* FROM agents a
      JOIN follows f ON a.id = f.following_id
      WHERE f.follower_id = ?
    `, [target.id]);

    res.json({ following });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
