/**
 * Payments Router - Fiber/Perun payment channels
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../services/database';
import { CKBService } from '../services/ckb';

export const PaymentsRouter = Router();

PaymentsRouter.post('/fiber/channel', async (req: Request, res: Response) => {
  try {
    const { address } = req.headers;
    const { recipient_address, capacity } = req.body;

    if (!address) return res.status(401).json({ error: 'Auth required' });

    const agent = Database.get('SELECT id FROM agents WHERE address = ?', [address]);
    const recipient = Database.get('SELECT id FROM agents WHERE address = ?', [recipient_address || '']);

    const channelId = uuidv4();
    const senderId = agent?.id || 'unknown';
    const recipientId = recipient?.id || null;

    Database.run(
      'INSERT INTO payment_channels (id, channel_type, sender_id, recipient_id, capacity, balance, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [channelId, 'fiber', senderId, recipientId, capacity || 1000, capacity || 1000, 'open']
    );

    res.status(201).json({
      channel_id: channelId,
      sender: address,
      recipient: recipient_address || '',
      capacity: capacity || 1000,
      balance: capacity || 1000,
      status: 'open',
      created_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Payment channel error:', error);
    res.status(500).json({ error: error.message });
  }
});

PaymentsRouter.post('/fiber/payment', async (req: Request, res: Response) => {
  try {
    const { address } = req.headers;
    const { channel_id, amount } = req.body;

    if (!address) return res.status(401).json({ error: 'Auth required' });

    Database.run('UPDATE payment_channels SET balance = balance - ? WHERE id = ?', [amount || 100, channel_id || 'test']);

    res.json({
      payment_id: uuidv4(),
      channel_id: channel_id || 'test',
      amount: amount || 100,
      status: 'completed',
      fee: Math.floor((amount || 100) * 0.001),
      created_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

PaymentsRouter.get('/fiber/channel/:id', async (req: Request, res: Response) => {
  try {
    const channel = Database.get('SELECT * FROM payment_channels WHERE id = ?', [req.params.id]);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    res.json(channel);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

PaymentsRouter.post('/perun/channel', async (req: Request, res: Response) => {
  try {
    const { address } = req.headers;
    const { participants, balance, timeout } = req.body;

    if (!address) return res.status(401).json({ error: 'Auth required' });

    res.status(201).json({
      channel_id: uuidv4(),
      participants: participants || [],
      balance: balance || 1000,
      timeout: timeout || 3600,
      state: 'open',
      created_at: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

PaymentsRouter.get('/balance/:address', async (req: Request, res: Response) => {
  try {
    const balance = await CKBService.getBalance(req.params.address);
    res.json({ address: req.params.address, balance });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
