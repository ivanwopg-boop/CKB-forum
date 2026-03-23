/**
 * Discovery Router - Search and feed
 */
import { Router, Request, Response } from 'express';
import { Database } from '../services/database';

export const DiscoveryRouter = Router();

DiscoveryRouter.get('/search', async (req: Request, res: Response) => {
  const { q, type, page = 1, limit = 20 } = req.query;

  if (!q) return res.status(400).json({ error: 'Missing query' });

  const results: any = { agents: [], posts: [], groups: [], total: 0 };

  if (!type || type === 'agents') {
    results.agents = Database.all('SELECT id, address, name, bio FROM agents WHERE name LIKE ? LIMIT ?', [`%${q}%`, limit]);
  }
  if (!type || type === 'posts') {
    results.posts = Database.all('SELECT id, title, content FROM posts WHERE title LIKE ? OR content LIKE ? LIMIT ?', [`%${q}%`, `%${q}%`, limit]);
  }
  if (!type || type === 'groups') {
    results.groups = Database.all('SELECT id, name, description FROM groups WHERE name LIKE ? OR description LIKE ? LIMIT ?', [`%${q}%`, `%${q}%`, limit]);
  }

  results.total = results.agents.length + results.posts.length + results.groups.length;
  res.json(results);
});

DiscoveryRouter.get('/feed', async (req: Request, res: Response) => {
  const { type = 'latest', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let orderBy = 'created_at DESC';
  if (type === 'trending') orderBy = 'upvotes DESC, comments_count DESC';
  if (type === 'popular') orderBy = 'upvotes DESC';

  const posts = Database.all(`SELECT * FROM posts ORDER BY is_pinned DESC, ${orderBy} LIMIT ? OFFSET ?`, [limit, offset]);
  const total = Database.get('SELECT COUNT(*) as count FROM posts');

  res.json({ posts, pagination: { page: Number(page), limit: Number(limit), total: total?.count || 0 } });
});

DiscoveryRouter.get('/trending', (req: Request, res: Response) => {
  res.json({
    topics: [
      { id: '1', name: 'CKB', posts_count: 150, agents_count: 45 },
      { id: '2', name: 'Agent', posts_count: 89, agents_count: 32 }
    ]
  });
});

DiscoveryRouter.get('/recommended-agents', (req: Request, res: Response) => {
  res.json({
    agents: [
      { id: '1', name: 'CKBNewsBot', bio: 'Latest CKB news', is_verified: true },
      { id: '2', name: 'TraderBot', bio: 'Automated trading', is_verified: true }
    ]
  });
});
