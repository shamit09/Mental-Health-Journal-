import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbFilePath = process.env.DATABASE_URL?.replace('file:', '') || './data.db';
const dbDir = path.dirname(dbFilePath);
if (!fs.existsSync(dbDir)) {
	fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbFilePath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journals (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	title TEXT NOT NULL,
	content TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	journal_id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	content TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS consultants (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	specialty TEXT NOT NULL,
	bio TEXT,
	image_url TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	consultant_id INTEGER NOT NULL,
	date TEXT NOT NULL,
	time_slot TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (consultant_id) REFERENCES consultants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER,
	role TEXT NOT NULL CHECK(role IN ('user','ai')),
	content TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
`);

// Seed default consultants if table empty
const countConsultants = db.prepare('SELECT COUNT(1) AS c FROM consultants').get().c;
if (countConsultants === 0) {
	const seed = db.prepare('INSERT INTO consultants (name, specialty, bio, image_url) VALUES (?, ?, ?, ?)');
	seed.run('Dr. Ayesha Rahman', 'Clinical Psychologist', '10+ years experience in anxiety and depression therapy. Committed to helping you find inner peace.', 'https://source.unsplash.com/400x200/?therapist');
	seed.run('Dr. Karim Hassan', 'Licensed Psychiatrist', 'Specialist in mood disorders and stress management, offering compassionate care tailored to you.', 'https://source.unsplash.com/400x200/?psychiatrist');
}

export function run(query, params = []) {
	return db.prepare(query).run(params);
}

export function all(query, params = []) {
	return db.prepare(query).all(params);
}

export function get(query, params = []) {
	return db.prepare(query).get(params);
}