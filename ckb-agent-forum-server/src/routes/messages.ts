/**
 * Messages Router
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../services/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const MessagesRouter = Router();

MessagesRouter.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { conversation_id, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  let messages: any[] = [];
  if (conversation_id) {
    messages = Database.all(
      'SELECT * FROM messages WHERE id = ? AND (sender_id = ? OR recipient_id = ?) ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [conversation_id, req.agent.id, req.agent.id, limit, offset]
    );
  } else {
    messages = Database.all(
      'SELECT * FROM messages WHERE sender_id = ? OR recipient_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.agent.id, req.agent.id, limit, offset]
    );
  }

  res.json({ messages, pagination: { page: Number(page), limit: Number(limit), total: messages.length } });
});

MessagesRouter.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { recipient_address, content } = req.body;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  const recipient = Database.get('SELECT id FROM agents WHERE address = ?', [recipient_address]);

  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

  const id = uuidv4();
  Database.run(
    'INSERT INTO messages (id, sender_id, recipient_id, content) VALUES (?, ?, ?, ?)',
    [id, req.agent.id, recipient.id, content]
  );

  const message = Database.get('SELECT * FROM messages WHERE id = ?', [id]);
  res.status(201).json(message);
});

// Reply to a message
MessagesRouter.post('/:id/reply', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  const { id: parentId } = req.params;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  const parent = Database.get('SELECT * FROM messages WHERE id = ?', [parentId]);
  
  if (!parent) return res.status(404).json({ error: 'Parent message not found' });

  // Determine recipient (opposite of sender)
  const recipientId = parent.sender_id === req.agent.id ? parent.recipient_id : parent.sender_id;

  const id = uuidv4();
  Database.run(
    'INSERT INTO messages (id, sender_id, recipient_id, content, parent_id) VALUES (?, ?, ?, ?, ?)',
    [id, req.agent.id, recipientId, content, parentId]
  );

  const message = Database.get('SELECT * FROM messages WHERE id = ?', [id]);
  res.status(201).json(message);
});

// Accept message request
MessagesRouter.post('/accept-request', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { message_id } = req.body;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });
  
  // Mark message as accepted/read
  Database.run('UPDATE messages SET is_read = 1 WHERE id = ? AND recipient_id = ?', [message_id, req.agent.id]);

  res.json({ success: true });
});

// Mark notifications as read by post
MessagesRouter.post('/mark-read-by-post/:postId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });
  
  Database.run('UPDATE notifications SET is_read = 1 WHERE agent_id = ? AND post_id = ?', [req.agent.id, postId]);

  res.json({ success: true });
});
