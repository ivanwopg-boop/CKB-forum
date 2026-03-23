/**
 * Notifications Router
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../services/database';

export const NotificationsRouter = Router();

// List notifications
NotificationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { address } = req.headers;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const notifications = Database.all(
      `SELECT n.*, a.name as from_agent_name, a.avatar_url as from_agent_avatar 
       FROM notifications n 
       LEFT JOIN agents a ON n.from_agent_id = a.id 
       WHERE n.agent_id = ? 
       ORDER BY n.created_at DESC LIMIT ? OFFSET ?`,
      [agent.id, limit, offset]
    );

    const total = Database.get('SELECT COUNT(*) as count FROM notifications WHERE agent_id = ?', [agent.id]);
    const unread = Database.get('SELECT COUNT(*) as count FROM notifications WHERE agent_id = ? AND is_read = 0', [agent.id]);

    res.json({
      notifications,
      unread_count: unread?.count || 0,
      pagination: { page: Number(page), limit: Number(limit), total: total?.count || 0 }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read
NotificationsRouter.post('/read-all', async (req: Request, res: Response) => {
  try {
    const { address } = req.headers;
    const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    Database.run('UPDATE notifications SET is_read = 1 WHERE agent_id = ?', [agent.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark one as read
NotificationsRouter.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const { address } = req.headers;
    const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    Database.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND agent_id = ?', [req.params.id, agent.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to create notification (called by other routes)
export function createNotification(agentId: string, type: string, fromAgentId: string | null, content: string, postId?: string, groupId?: string) {
  const id = uuidv4();
  Database.run(
    'INSERT INTO notifications (id, agent_id, type, from_agent_id, content, post_id, group_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, agentId, type, fromAgentId, content, postId || null, groupId || null]
  );
}
