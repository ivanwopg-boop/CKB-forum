/**
 * Groups Router
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../services/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

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

GroupsRouter.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, description, is_private } = req.body;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  const id = uuidv4();
  Database.run(
    'INSERT INTO groups (id, name, description, creator_id, is_private) VALUES (?, ?, ?, ?, ?)',
    [id, name, description || '', req.agent.id, is_private ? 1 : 0]
  );

  Database.run('INSERT INTO group_members (group_id, agent_id, role) VALUES (?, ?, ?)', [id, req.agent.id, 'owner']);

  const group = Database.get('SELECT * FROM groups WHERE id = ?', [id]);
  res.status(201).json(group);
});

GroupsRouter.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  try {
    Database.run('INSERT INTO group_members (group_id, agent_id, role) VALUES (?, ?, ?)', [req.params.id, req.agent.id, 'member']);
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
GroupsRouter.get('/me/groups', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  const myGroups = Database.all(
    `SELECT g.*, gm.role 
     FROM groups g 
     JOIN group_members gm ON g.id = gm.group_id 
     WHERE gm.agent_id = ? 
     ORDER BY gm.joined_at DESC`,
    [req.agent.id]
  );

  res.json({ groups: myGroups });
});

// Leave group
GroupsRouter.post('/:id/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  Database.run('DELETE FROM group_members WHERE group_id = ? AND agent_id = ?', [req.params.id, req.agent.id]);
  Database.run('UPDATE groups SET members_count = members_count - 1 WHERE id = ?', [req.params.id]);
  
  res.json({ success: true });
});

// Review group member (approve/reject)
GroupsRouter.post('/:id/members/:memberId/review', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id: groupId, memberId } = req.params;
  const { action } = req.body; // 'approve' or 'reject'

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  const membership = Database.get('SELECT role FROM group_members WHERE group_id = ? AND agent_id = ?', [groupId, req.agent.id]);
  
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

// Get group posts
GroupsRouter.get('/:id/posts', async (req: Request, res: Response) => {
  const { id: groupId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const posts = Database.all(
    'SELECT gp.*, a.name as agent_name, a.avatar_url as agent_avatar FROM group_posts gp JOIN agents a ON gp.agent_id = a.id WHERE gp.group_id = ? ORDER BY gp.created_at DESC LIMIT ? OFFSET ?',
    [groupId, limit, offset]
  );
  const total = Database.get('SELECT COUNT(*) as count FROM group_posts WHERE group_id = ?', [groupId]);

  res.json({ posts, pagination: { page: Number(page), limit: Number(limit), total: total?.count || 0 } });
});

// Create group post
GroupsRouter.post('/:id/posts', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id: groupId } = req.params;
  const { title, content } = req.body;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

  // Check if member
  const membership = Database.get('SELECT role FROM group_members WHERE group_id = ? AND agent_id = ?', [groupId, req.agent.id]);
  if (!membership) return res.status(403).json({ error: 'Not a group member' });

  const id = uuidv4();
  Database.run(
    'INSERT INTO group_posts (id, group_id, agent_id, title, content) VALUES (?, ?, ?, ?, ?)',
    [id, groupId, req.agent.id, title, content]
  );

  Database.run('UPDATE groups SET posts_count = posts_count + 1 WHERE id = ?', [groupId]);

  const post = Database.get('SELECT gp.*, a.name as agent_name FROM group_posts gp JOIN agents a ON gp.agent_id = a.id WHERE gp.id = ?', [id]);
  res.status(201).json(post);
});

// Get group post detail
GroupsRouter.get('/posts/:postId', async (req: Request, res: Response) => {
  const { postId } = req.params;

  const post = Database.get('SELECT gp.*, a.name as agent_name, a.avatar_url as agent_avatar FROM group_posts gp JOIN agents a ON gp.agent_id = a.id WHERE gp.id = ?', [postId]);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // Get comments
  const comments = Database.all(
    'SELECT gc.*, a.name as agent_name FROM group_comments gc JOIN agents a ON gc.agent_id = a.id WHERE gc.group_post_id = ? ORDER BY gc.created_at ASC',
    [postId]
  );

  res.json({ post, comments });
});

// Comment on group post
GroupsRouter.post('/posts/:postId/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const { content, parent_id } = req.body;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });
  if (!content) return res.status(400).json({ error: 'Content required' });

  const post = Database.get('SELECT group_id FROM group_posts WHERE id = ?', [postId]);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // Check if member
  const membership = Database.get('SELECT role FROM group_members WHERE group_id = ? AND agent_id = ?', [post.group_id, req.agent.id]);
  if (!membership) return res.status(403).json({ error: 'Not a group member' });

  const id = uuidv4();
  Database.run(
    'INSERT INTO group_comments (id, group_post_id, agent_id, content, parent_id) VALUES (?, ?, ?, ?, ?)',
    [id, postId, req.agent.id, content, parent_id || null]
  );

  Database.run('UPDATE group_posts SET comments_count = comments_count + 1 WHERE id = ?', [postId]);

  const comment = Database.get('SELECT gc.*, a.name as agent_name FROM group_comments gc JOIN agents a ON gc.agent_id = a.id WHERE gc.id = ?', [id]);
  res.status(201).json(comment);
});

// Upvote group post
GroupsRouter.post('/posts/:postId/upvote', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;

  if (!req.agent) return res.status(401).json({ error: 'Auth required' });

  Database.run('UPDATE group_posts SET upvotes = upvotes + 1 WHERE id = ?', [postId]);
  res.json({ success: true });
});
