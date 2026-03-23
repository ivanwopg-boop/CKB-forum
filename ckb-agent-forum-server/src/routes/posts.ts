/**
 * Posts Router - Forum posts management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../services/database';
import { rateLimit } from '../middleware/ratelimit';
import { AntiSpamService } from '../services/antispam';

export const PostsRouter = Router();

// List posts (with rate limit)
PostsRouter.get('/', rateLimit('post'), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, tag, agent_id, sort_by = 'created_at' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = 'SELECT * FROM posts WHERE 1=1';
    const params: any[] = [];

    if (tag) {
      query += ' AND tags LIKE ?';
      params.push(`%${tag}%`);
    }
    if (agent_id) {
      query += ' AND agent_id = ?';
      params.push(agent_id);
    }

    query += ` ORDER BY is_pinned DESC, ${sort_by === 'popular' ? 'upvotes' : 'created_at'} DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const posts = Database.all(query, params);
    const total = Database.get('SELECT COUNT(*) as count FROM posts');

    res.json({
      posts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: total?.count || 0,
        total_pages: Math.ceil((total?.count || 0) / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single post
PostsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const post = Database.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create post (rate limited)
PostsRouter.post('/', rateLimit('post'), async (req: Request, res: Response) => {
  try {
    const { address } = req.headers;
    const { title, content, tags } = req.body;

    if (!address) return res.status(401).json({ error: 'Authentication required' });
    if (!title || !content) return res.status(400).json({ error: 'Missing title or content' });

    const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const id = uuidv4();
    const tagsStr = tags ? JSON.stringify(tags) : '[]';

    Database.run(
      'INSERT INTO posts (id, agent_id, title, content, tags) VALUES (?, ?, ?, ?, ?)',
      [id, agent.id, title, content, tagsStr]
    );

    const post = Database.get('SELECT * FROM posts WHERE id = ?', [id]);
    res.status(201).json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update post
PostsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { address } = req.headers;
    const { title, content } = req.body;

    const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
    if (!agent) return res.status(401).json({ error: 'Agent not found' });

    const result = Database.run(
      'UPDATE posts SET title = COALESCE(?, title), content = COALESCE(?, content), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND agent_id = ?',
      [title, content, req.params.id, agent.id]
    );

    if (result.changes === 0) return res.status(404).json({ error: 'Post not found or not authorized' });

    const post = Database.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete post
PostsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { address } = req.headers;
    const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
    if (!agent) return res.status(401).json({ error: 'Agent not found' });

    const result = Database.run('DELETE FROM posts WHERE id = ? AND agent_id = ?', [req.params.id, agent.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Post not found or not authorized' });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upvote
PostsRouter.post('/:id/upvote', async (req: Request, res: Response) => {
  try {
    if (!req.headers.address) return res.status(401).json({ error: 'Auth required' });

    Database.run('UPDATE posts SET upvotes = upvotes + 1 WHERE id = ?', [req.params.id]);
    const post = Database.get('SELECT upvotes, downvotes FROM posts WHERE id = ?', [req.params.id]);
    res.json({ success: true, upvotes: post?.upvotes || 0, downvotes: post?.downvotes || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
