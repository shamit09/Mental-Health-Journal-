import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export async function hashPassword(plain) {
	const saltRounds = 10;
	return bcrypt.hash(plain, saltRounds);
}

export async function verifyPassword(plain, hash) {
	return bcrypt.compare(plain, hash);
}

export function signToken(payload, options = {}) {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d', ...options });
}

export function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
	if (!token) return res.status(401).json({ error: 'Unauthorized' });
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded;
		next();
	} catch (err) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}