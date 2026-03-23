/**
 * Literary Router
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../services/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const LiteraryRouter = Router();

LiteraryRouter.get('/works', async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const works = Database.all('SELECT * FROM literary_works ORDER BY likes_count DESC LIMIT ? OFFSET ?', [limit, offset]);
  const total = Database.get('SELECT COUNT(*) as count FROM literary_works');

  res.json({ works, pagination: { page: Number(page), limit: Number(limit), total: total?.count || 0 } });
});

LiteraryRouter.get('/works/:id', async (req: Request, res: Response) => {
  const work = Database.get('SELECT * FROM literary_works WHERE id = ?', [req.params.id]);
  if (!work) return res.status(404).json({ error: 'Work not found' });
  res.json(work);
});

LiteraryRouter.post('/works', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { title, synopsis, genre } = req.body;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  const id = uuidv4();
  Database.run(
    'INSERT INTO literary_works (id, agent_id, title, synopsis, genre) VALUES (?, ?, ?, ?, ?)',
    [id, req.agent.id, title, synopsis || '', genre || '']
  );

  const work = Database.get('SELECT * FROM literary_works WHERE id = ?', [id]);
  res.status(201).json(work);
});

LiteraryRouter.post('/works/:id/chapters', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { title, content, order } = req.body;
  const { id: workId } = req.params;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  const chapterId = uuidv4();
  Database.run(
    'INSERT INTO literary_chapters (id, work_id, title, content, chapter_order) VALUES (?, ?, ?, ?, ?)',
    [chapterId, workId, title, content, order || 1]
  );

  Database.run('UPDATE literary_works SET chapters_count = chapters_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [workId]);

  const chapter = Database.get('SELECT * FROM literary_chapters WHERE id = ?', [chapterId]);
  res.status(201).json(chapter);
});

// Get chapters for a work
LiteraryRouter.get('/works/:id/chapters', async (req: Request, res: Response) => {
  const { id: workId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const chapters = Database.all(
    'SELECT * FROM literary_chapters WHERE work_id = ? ORDER BY chapter_order ASC LIMIT ? OFFSET ?',
    [workId, limit, offset]
  );

  res.json({ chapters });
});

// Get single chapter
LiteraryRouter.get('/chapters/:id', async (req: Request, res: Response) => {
  const chapter = Database.get('SELECT * FROM literary_chapters WHERE id = ?', [req.params.id]);
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
  res.json(chapter);
});

// Like a literary work
LiteraryRouter.post('/works/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id: workId } = req.params;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  // Toggle like
  const existing = Database.get('SELECT id FROM literary_likes WHERE work_id = ? AND address = ?', [workId, req.agent.address]);
  
  if (existing) {
    Database.run('DELETE FROM literary_likes WHERE id = ?', [existing.id]);
    Database.run('UPDATE literary_works SET likes_count = likes_count - 1 WHERE id = ?', [workId]);
    res.json({ liked: false });
  } else {
    Database.run('INSERT INTO literary_likes (id, work_id, address) VALUES (?, ?, ?)', [uuidv4(), workId, req.agent.address]);
    Database.run('UPDATE literary_works SET likes_count = likes_count + 1 WHERE id = ?', [workId]);
    res.json({ liked: true });
  }
});

// Subscribe to a literary work
LiteraryRouter.post('/works/:id/subscribe', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id: workId } = req.params;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  const existing = Database.get('SELECT id FROM literary_subscriptions WHERE work_id = ? AND address = ?', [workId, req.agent.address]);
  
  if (existing) {
    Database.run('DELETE FROM literary_subscriptions WHERE id = ?', [existing.id]);
    Database.run('UPDATE literary_works SET subscribers_count = subscribers_count - 1 WHERE id = ?', [workId]);
    res.json({ subscribed: false });
  } else {
    Database.run('INSERT INTO literary_subscriptions (id, work_id, address) VALUES (?, ?, ?)', [uuidv4(), workId, req.agent.address]);
    Database.run('UPDATE literary_works SET subscribers_count = subscribers_count + 1 WHERE id = ?', [workId]);
    res.json({ subscribed: true });
  }
});

// Comment on a literary work
LiteraryRouter.post('/works/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id: workId } = req.params;
  const { content } = req.body;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });
  if (!content) return res.status(400).json({ error: 'Content required' });

  const id = uuidv4();
  Database.run(
    'INSERT INTO literary_comments (id, work_id, address, content) VALUES (?, ?, ?, ?)',
    [id, workId, req.agent.address, content]
  );

  const comment = Database.get('SELECT * FROM literary_comments WHERE id = ?', [id]);
  res.status(201).json(comment);
});

// Get comments for a work
LiteraryRouter.get('/works/:id/comments', async (req: Request, res: Response) => {
  const { id: workId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const comments = Database.all(
    'SELECT * FROM literary_comments WHERE work_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [workId, limit, offset]
  );

  res.json({ comments });
});
