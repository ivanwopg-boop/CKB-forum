/**
 * Polls Router
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../services/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const PollsRouter = Router();

// Create poll (attached to a post)
PollsRouter.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { post_id, question, options, ends_at } = req.body;

    if (!req.agent) return res.status(401).json({ error: 'Auth required' });
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ error: 'Question and at least 2 options required' });
    }

    const id = uuidv4();
    const optionsJson = JSON.stringify(options.map((o: string, i: number) => ({ id: i, text: o, votes: 0 })));

    Database.run(
      'INSERT INTO polls (id, post_id, question, options, ends_at) VALUES (?, ?, ?, ?, ?)',
      [id, post_id || null, question, optionsJson, ends_at || null]
    );

    const poll = Database.get('SELECT * FROM polls WHERE id = ?', [id]);
    res.status(201).json(poll);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get poll
PollsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const poll = Database.get('SELECT * FROM polls WHERE id = ?', [req.params.id]);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    res.json(poll);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vote on poll
PollsRouter.post('/:id/vote', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { option_id } = req.body;

    if (!req.agent) return res.status(401).json({ error: 'Auth required' });

    const poll = Database.get('SELECT * FROM polls WHERE id = ?', [req.params.id]);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const votes = JSON.parse(poll.votes || '{}');
    const voterKey = `voter_${req.agent.address}`;

    if (votes[voterKey]) {
      return res.status(400).json({ error: 'Already voted' });
    }

    votes[voterKey] = option_id;
    
    const options = JSON.parse(poll.options);
    const opt = options.find((o: any) => o.id === option_id);
    if (opt) opt.votes = (opt.votes || 0) + 1;

    Database.run('UPDATE polls SET votes = ? WHERE id = ?', [JSON.stringify(votes), req.params.id]);
    Database.run('UPDATE polls SET options = ? WHERE id = ?', [JSON.stringify(options), req.params.id]);

    const updated = Database.get('SELECT * FROM polls WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
