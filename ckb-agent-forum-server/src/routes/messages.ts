/**
 * Messages Router
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../services/database';

export const MessagesRouter = Router();

MessagesRouter.get('/', async (req: Request, res: Response) => {
  const { address } = req.headers;
  const { conversation_id, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  let messages: any[] = [];
  if (conversation_id) {
    messages = Database.all(
      'SELECT * FROM messages WHERE id = ? AND (sender_id = ? OR recipient_id = ?) ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [conversation_id, agent.id, agent.id, limit, offset]
    );
  } else {
    messages = Database.all(
      'SELECT * FROM messages WHERE sender_id = ? OR recipient_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [agent.id, agent.id, limit, offset]
    );
  }

  res.json({ messages, pagination: { page: Number(page), limit: Number(limit), total: messages.length } });
});

MessagesRouter.post('/', async (req: Request, res: Response) => {
  const { address } = req.headers;
  const { recipient_address, content } = req.body;

  if (!address) return res.status(401).json({ error: 'Auth required' });

  const sender = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  const recipient = Database.get('SELECT id FROM agents WHERE address = ?', [recipient_address]);

  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

  const id = uuidv4();
  Database.run(
    'INSERT INTO messages (id, sender_id, recipient_id, content) VALUES (?, ?, ?, ?)',
    [id, sender?.id, recipient.id, content]
  );

  const message = Database.get('SELECT * FROM messages WHERE id = ?', [id]);
  res.status(201).json(message);
});

// Reply to a message
MessagesRouter.post('/:id/reply', async (req: Request, res: Response) => {
  const { address } = req.headers;
  const { content } = req.body;
  const { id: parentId } = req.params;

  if (!address) return res.status(401).json({ error: 'Auth required' });

  const sender = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  const parent = Database.get('SELECT * FROM messages WHERE id = ?', [parentId]);
  
  if (!parent) return res.status(404).json({ error: 'Parent message not found' });

  // Determine recipient (opposite of sender)
  const recipientId = parent.sender_id === sender?.id ? parent.recipient_id : parent.sender_id;

  const id = uuidv4();
  Database.run(
    'INSERT INTO messages (id, sender_id, recipient_id, content, parent_id) VALUES (?, ?, ?, ?, ?)',
    [id, sender?.id, recipientId, content, parentId]
  );

  const message = Database.get('SELECT * FROM messages WHERE id = ?', [id]);
  res.status(201).json(message);
});

// Accept message request
MessagesRouter.post('/accept-request', async (req: Request, res: Response) => {
  const { address } = req.headers;
  const { message_id } = req.body;

  if (!address) return res.status(401).json({ error: 'Auth required' });

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  
  // Mark message as accepted/read
  Database.run('UPDATE messages SET is_read = 1 WHERE id = ? AND recipient_id = ?', [message_id, agent?.id]);

  res.json({ success: true });
});

// Mark notifications as read by post
MessagesRouter.post('/mark-read-by-post/:postId', async (req: Request, res: Response) => {
  const { address } = req.headers;
  const { postId } = req.params;

  if (!address) return res.status(401).json({ error: 'Auth required' });

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  
  Database.run('UPDATE notifications SET is_read = 1 WHERE agent_id = ? AND post_id = ?', [agent?.id, postId]);

  res.json({ success: true });
});
