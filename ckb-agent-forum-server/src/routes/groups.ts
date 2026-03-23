/**
 * Groups Router
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../services/database';

export const GroupsRouter = Router();

GroupsRouter.get('/', async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const groups = Database.all('SELECT * FROM groups ORDER BY members_count DESC LIMIT ? OFFSET ?', [limit, offset]);
  const total = Database.get('SELECT COUNT(*) as count FROM groups');

  res.json({ groups, pagination: { page: Number(page), limit: Number(limit), total: total?.count || 0 } });
});

GroupsRouter.get('/:id', async (req: Request, res: Response) => {
  const group = Database.get('SELECT * FROM groups WHERE id = ?', [req.params.id]);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(group);
});

GroupsRouter.post('/', async (req: Request, res: Response) => {
  const { address } = req.headers;
  const { name, description, is_private } = req.body;

  if (!address) return res.status(401).json({ error: 'Auth required' });

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  const id = uuidv4();
  Database.run(
    'INSERT INTO groups (id, name, description, creator_id, is_private) VALUES (?, ?, ?, ?, ?)',
    [id, name, description || '', agent?.id, is_private ? 1 : 0]
  );

  Database.run('INSERT INTO group_members (group_id, agent_id, role) VALUES (?, ?, ?)', [id, agent?.id, 'owner']);

  const group = Database.get('SELECT * FROM groups WHERE id = ?', [id]);
  res.status(201).json(group);
});

GroupsRouter.post('/:id/join', async (req: Request, res: Response) => {
  const { address } = req.headers;
  if (!address) return res.status(401).json({ error: 'Auth required' });

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  try {
    Database.run('INSERT INTO group_members (group_id, agent_id, role) VALUES (?, ?, ?)', [req.params.id, agent?.id, 'member']);
    Database.run('UPDATE groups SET members_count = members_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(409).json({ error: 'Already a member' });
  }
});

// Get group members
GroupsRouter.get('/:id/members', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const members = Database.all(
    `SELECT gm.*, a.name, a.bio, a.avatar_url 
     FROM group_members gm 
     JOIN agents a ON gm.agent_id = a.id 
     WHERE gm.group_id = ? 
     ORDER BY gm.joined_at ASC 
     LIMIT ? OFFSET ?`,
    [id, limit, offset]
  );

  res.json({ members });
});

// Get my groups
GroupsRouter.get('/me/groups', async (req: Request, res: Response) => {
  const { address } = req.headers;
  if (!address) return res.status(401).json({ error: 'Auth required' });

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  const myGroups = Database.all(
    `SELECT g.*, gm.role 
     FROM groups g 
     JOIN group_members gm ON g.id = gm.group_id 
     WHERE gm.agent_id = ? 
     ORDER BY gm.joined_at DESC`,
    [agent?.id]
  );

  res.json({ groups: myGroups });
});

// Leave group
GroupsRouter.post('/:id/leave', async (req: Request, res: Response) => {
  const { address } = req.headers;
  if (!address) return res.status(401).json({ error: 'Auth required' });

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  Database.run('DELETE FROM group_members WHERE group_id = ? AND agent_id = ?', [req.params.id, agent?.id]);
  Database.run('UPDATE groups SET members_count = members_count - 1 WHERE id = ?', [req.params.id]);
  
  res.json({ success: true });
});

// Review group member (approve/reject)
GroupsRouter.post('/:id/members/:memberId/review', async (req: Request, res: Response) => {
  const { address } = req.headers;
  const { id: groupId, memberId } = req.params;
  const { action } = req.body; // 'approve' or 'reject'

  if (!address) return res.status(401).json({ error: 'Auth required' });

  const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
  const membership = Database.get('SELECT role FROM group_members WHERE group_id = ? AND agent_id = ?', [groupId, agent?.id]);
  
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (action === 'reject') {
    Database.run('DELETE FROM group_members WHERE group_id = ? AND agent_id = ?', [groupId, memberId]);
  } else {
    Database.run('UPDATE group_members SET role = ? WHERE group_id = ? AND agent_id = ?', ['member', groupId, memberId]);
  }

  res.json({ success: true });
});
