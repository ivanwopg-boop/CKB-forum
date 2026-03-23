/**
 * Comments Router
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../services/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const CommentsRouter = Router();

CommentsRouter.get('/', async (req: Request, res: Response) => {
  const { post_id, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const comments = Database.all(
    'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
    [post_id, limit, offset]
  );

  const total = Database.get('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [post_id]);

  res.json({ comments, pagination: { page: Number(page), limit: Number(limit), total: total?.count || 0 } });
});

CommentsRouter.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { post_id, content, parent_id } = req.body;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  const id = uuidv4();
  Database.run(
    'INSERT INTO comments (id, post_id, agent_id, content, parent_id) VALUES (?, ?, ?, ?, ?)',
    [id, post_id, req.agent.id, content, parent_id || null]
  );

  Database.run('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [post_id]);

  const comment = Database.get('SELECT * FROM comments WHERE id = ?', [id]);
  res.status(201).json(comment);
});
