import crypto from 'crypto';
import { db } from './db.js';
import { pkNow } from './time.js';
import { verifyPin } from './auth-hash.js';

const sessions = new Map();

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: row.role,
    is_active: row.is_active,
  };
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 12 * 60 * 60 * 1000;
  sessions.set(token, { userId, expires });
  db.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`).run(pkNow(), userId);
  return token;
}

export function destroySession(token) {
  sessions.delete(token);
}

export function getUserFromToken(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expires) {
    sessions.delete(token);
    return null;
  }
  return (
    db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(s.userId) ||
    null
  );
}

export function loginWithPin(username, pin) {
  const user = db
    .prepare('SELECT * FROM users WHERE username = ? AND is_active = 1')
    .get(String(username).trim().toLowerCase());
  if (!user) return null;
  if (!verifyPin(pin, user.pin_salt, user.pin_hash)) return null;
  const token = createSession(user.id);
  return { token, user: publicUser(user) };
}

export function authMiddleware(req, res, next) {
  if (req.path === '/api/auth/login') return next();
  if (!req.path.startsWith('/api')) return next();

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Please login' });
  req.user = user;
  req.token = token;
  next();
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not allowed for your role' });
    }
    next();
  };
}

export const ROLE_ACCESS = {
  admin: ['pos', 'orders', 'kitchen', 'menu', 'stock', 'dashboard', 'insights', 'users', 'settings'],
  manager: ['pos', 'orders', 'kitchen', 'menu', 'stock', 'dashboard', 'insights', 'settings'],
  cashier: ['pos', 'orders', 'dashboard', 'stock'],
  kitchen: ['kitchen', 'orders'],
};
