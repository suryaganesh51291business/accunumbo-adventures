const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-before-production';
const db = new Database(path.join(__dirname, 'accunumbo.db'));

db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  adventure INTEGER NOT NULL DEFAULT 1,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  badges INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, adventure),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  adventure INTEGER NOT NULL,
  task INTEGER NOT NULL,
  attempt_no INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  seconds_used INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT,
  email TEXT,
  rating TEXT,
  enjoyed TEXT,
  improve TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

app.use(express.json({ limit: '100kb' }));
app.use(express.static(__dirname));

const safeUser = row => ({ id: row.id, name: row.name, email: row.email, role: row.role });
const tokenFor = user => jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required.' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

app.get('/api/health', (req, res) => res.json({ ok: true, site: 'AccuNumbo Adventures' }));

app.post('/api/auth/signup', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!name || !email || password.length < 8) {
    return res.status(400).json({ error: 'Name, email and a password of at least 8 characters are required.' });
  }
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const hash = bcrypt.hashSync(password, 12);
  const info = db.prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)').run(name, email, hash);
  db.prepare('INSERT INTO progress(user_id) VALUES(?)').run(info.lastInsertRowid);
  const user = db.prepare('SELECT id,name,email,role FROM users WHERE id=?').get(info.lastInsertRowid);
  res.json({ user: safeUser(user), token: tokenFor(user) });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  res.json({ user: safeUser(user), token: tokenFor(user) });
});

app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT id,name,email,role FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const progress = db.prepare('SELECT adventure,completed_tasks,xp,coins,badges,updated_at FROM progress WHERE user_id=? ORDER BY adventure').all(req.user.id);
  res.json({ user: safeUser(user), progress });
});

app.post('/api/progress', auth, (req, res) => {
  const adventure = Number(req.body?.adventure || 1);
  const completed = Number(req.body?.completed_tasks || 0);
  const xp = Number(req.body?.xp || 0);
  const coins = Number(req.body?.coins || 0);
  const badges = Number(req.body?.badges || 0);
  db.prepare(`INSERT INTO progress(user_id,adventure,completed_tasks,xp,coins,badges)
    VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,adventure) DO UPDATE SET
    completed_tasks=excluded.completed_tasks,xp=excluded.xp,coins=excluded.coins,badges=excluded.badges,updated_at=CURRENT_TIMESTAMP`)
    .run(req.user.id, adventure, completed, xp, coins, badges);
  res.json({ ok: true });
});

app.post('/api/attempts', auth, (req, res) => {
  const adventure = Number(req.body?.adventure || 1);
  const task = Number(req.body?.task || 0);
  const attemptNo = Number(req.body?.attempt_no || 1);
  const correct = req.body?.correct ? 1 : 0;
  const points = Number(req.body?.points || 0);
  const seconds = req.body?.seconds_used == null ? null : Number(req.body.seconds_used);
  if (!task) return res.status(400).json({ error: 'Task is required.' });
  db.prepare('INSERT INTO attempts(user_id,adventure,task,attempt_no,correct,points,seconds_used) VALUES(?,?,?,?,?,?,?)')
    .run(req.user.id, adventure, task, attemptNo, correct, points, seconds);
  res.json({ ok: true });
});

app.post('/api/feedback', (req, res) => {
  const { name = '', email = '', rating = '', enjoyed = '', improve = '' } = req.body || {};
  if (!rating) return res.status(400).json({ error: 'Please provide a rating.' });
  let userId = null;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try { userId = jwt.verify(header.slice(7), JWT_SECRET).id; } catch {}
  }
  db.prepare('INSERT INTO feedback(user_id,name,email,rating,enjoyed,improve) VALUES(?,?,?,?,?,?)')
    .run(userId, String(name), String(email), String(rating), String(enjoyed), String(improve));
  res.json({ ok: true });
});

// Static HTML files are served directly from the repository root.
// No src/ directory is required.
app.listen(PORT, () => console.log(`AccuNumbo running on port ${PORT}`));
