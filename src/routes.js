import { Router } from 'express';
import { all, get, run } from './db.js';
import { hashPassword, verifyPassword, signToken } from './auth.js';
import z from 'zod';

const router = Router();

// Health
router.get('/health', (req, res) => res.json({ ok: true }));

// Auth
const signupSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(6) });
router.post('/auth/signup', async (req, res) => {
	try {
		const { name, email, password } = signupSchema.parse(req.body);
		const existing = get('SELECT id FROM users WHERE email = ?', [email]);
		if (existing) return res.status(409).json({ error: 'Email already registered' });
		const password_hash = await hashPassword(password);
		run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, password_hash]);
		const user = get('SELECT id, name, email FROM users WHERE email = ?', [email]);
		const token = signToken({ userId: user.id, email: user.email, name: user.name });
		return res.json({ token, user });
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Invalid payload' });
	}
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
router.post('/auth/login', async (req, res) => {
	try {
		const { email, password } = loginSchema.parse(req.body);
		const user = get('SELECT * FROM users WHERE email = ?', [email]);
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });
		const ok = await verifyPassword(password, user.password_hash);
		if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
		const token = signToken({ userId: user.id, email: user.email, name: user.name });
		return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Invalid payload' });
	}
});

// Journals
router.get('/journals', (req, res) => {
	const items = all(`
		SELECT j.id, j.title, j.content, j.created_at, u.name AS author
		FROM journals j JOIN users u ON u.id = j.user_id
		ORDER BY j.created_at DESC
	`);
	res.json({ items });
});

const journalSchema = z.object({ userId: z.number().int(), title: z.string().min(1), content: z.string().min(1) });
router.post('/journals', (req, res) => {
	try {
		const { userId, title, content } = journalSchema.parse(req.body);
		run('INSERT INTO journals (user_id, title, content) VALUES (?, ?, ?)', [userId, title, content]);
		const item = get('SELECT * FROM journals WHERE id = last_insert_rowid()');
		res.json({ item });
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
});

// Comments
router.get('/journals/:id/comments', (req, res) => {
	const journalId = Number(req.params.id);
	const items = all(`
		SELECT c.id, c.content, c.created_at, u.name AS author
		FROM comments c JOIN users u ON u.id = c.user_id
		WHERE c.journal_id = ?
		ORDER BY c.created_at ASC
	`, [journalId]);
	res.json({ items });
});

const commentSchema = z.object({ userId: z.number().int(), content: z.string().min(1) });
router.post('/journals/:id/comments', (req, res) => {
	try {
		const journalId = Number(req.params.id);
		const { userId, content } = commentSchema.parse(req.body);
		run('INSERT INTO comments (journal_id, user_id, content) VALUES (?, ?, ?)', [journalId, userId, content]);
		const item = get('SELECT * FROM comments WHERE id = last_insert_rowid()');
		res.json({ item });
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
});

// Consultants
router.get('/consultants', (req, res) => {
	const items = all('SELECT * FROM consultants ORDER BY id ASC');
	res.json({ items });
});

// Bookings
const bookingSchema = z.object({ userId: z.number().int(), consultantId: z.number().int(), date: z.string().min(1), timeSlot: z.string().min(1) });
router.post('/bookings', (req, res) => {
	try {
		const { userId, consultantId, date, timeSlot } = bookingSchema.parse(req.body);
		run('INSERT INTO bookings (user_id, consultant_id, date, time_slot) VALUES (?, ?, ?, ?)', [userId, consultantId, date, timeSlot]);
		const item = get('SELECT * FROM bookings WHERE id = last_insert_rowid()');
		res.json({ item });
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
});

// Chat (simple echo/placeholder)
router.post('/chat', (req, res) => {
	const message = String(req.body?.message || '').trim();
	if (!message) return res.status(400).json({ error: 'Message required' });
	// For now, a very basic reflective response
	const reply = `I hear you saying: "${message}". Can you share more about that?`;
	res.json({ reply });
});

export default router;