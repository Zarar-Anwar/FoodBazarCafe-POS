import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  db,
  runMigrations,
  seedIfEmpty,
  getSettings,
  nextOrderNumber,
  withTransaction,
} from './db.js';
import {
  authMiddleware,
  loginWithPin,
  destroySession,
  publicUser,
  requireRoles,
  ROLE_ACCESS,
} from './auth.js';
import { hashPin } from './auth-hash.js';
import { pkNow, pkToday, daypart, DAYPARTS } from './time.js';
import { getAppRoot, getDbPath } from './paths.js';
import {
  seedStockIfEmpty,
  syncProductRecipes,
  listStock,
  adjustStock,
  applyOrderStock,
  previewOrderStock,
} from './stock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3847;

runMigrations();
seedIfEmpty();
seedStockIfEmpty();

const app = express();
app.use(cors());
app.use(express.json());
app.use(authMiddleware);

function enrichOrder(o) {
  if (!o) return null;
  o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  return o;
}

// ——— Auth ———
app.post('/api/auth/login', (req, res) => {
  const { username, pin } = req.body || {};
  if (!username || !pin) {
    return res.status(400).json({ error: 'Username and PIN required' });
  }
  const result = loginWithPin(username, pin);
  if (!result) return res.status(401).json({ error: 'Invalid username or PIN' });
  res.json({
    ...result,
    access: ROLE_ACCESS[result.user.role] || [],
  });
});

app.post('/api/auth/logout', (req, res) => {
  destroySession(req.token);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    user: publicUser(req.user),
    access: ROLE_ACCESS[req.user.role] || [],
  });
});

// ——— Settings ———
app.get('/api/settings', (_req, res) => {
  res.json(getSettings());
});

app.patch('/api/settings', requireRoles('admin', 'manager'), (req, res) => {
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  withTransaction(() => {
    for (const [key, value] of Object.entries(req.body || {})) {
      upsert.run(key, String(value));
    }
  });
  res.json(getSettings());
});

// ——— Users ———
app.get('/api/users', requireRoles('admin'), (_req, res) => {
  const rows = db
    .prepare(
      'SELECT id, username, display_name, role, is_active, last_login_at, created_at FROM users ORDER BY id'
    )
    .all();
  res.json(rows);
});

app.post('/api/users', requireRoles('admin'), (req, res) => {
  const { username, display_name, role, pin } = req.body || {};
  if (!username?.trim() || !display_name?.trim() || !role || !pin) {
    return res.status(400).json({ error: 'All fields required' });
  }
  if (!['admin', 'manager', 'cashier', 'kitchen'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (String(pin).length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 digits' });
  }
  try {
    const { salt, hash } = hashPin(pin);
    const r = db
      .prepare(
        `INSERT INTO users (username, display_name, role, pin_salt, pin_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        username.trim().toLowerCase(),
        display_name.trim(),
        role,
        salt,
        hash,
        pkNow()
      );
    const user = db
      .prepare(
        'SELECT id, username, display_name, role, is_active, last_login_at, created_at FROM users WHERE id = ?'
      )
      .get(r.lastInsertRowid);
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ error: e.message.includes('UNIQUE') ? 'Username already exists' : e.message });
  }
});

app.patch('/api/users/:id', requireRoles('admin'), (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const {
    display_name = user.display_name,
    role = user.role,
    is_active = user.is_active,
    pin,
  } = req.body || {};
  if (pin) {
    const { salt, hash } = hashPin(pin);
    db.prepare(
      'UPDATE users SET display_name=?, role=?, is_active=?, pin_salt=?, pin_hash=? WHERE id=?'
    ).run(display_name, role, is_active ? 1 : 0, salt, hash, id);
  } else {
    db.prepare(
      'UPDATE users SET display_name=?, role=?, is_active=? WHERE id=?'
    ).run(display_name, role, is_active ? 1 : 0, id);
  }
  res.json(
    db
      .prepare(
        'SELECT id, username, display_name, role, is_active, last_login_at, created_at FROM users WHERE id = ?'
      )
      .get(id)
  );
});

// ——— Categories ———
app.get('/api/categories', (_req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all());
});

app.post('/api/categories', requireRoles('admin', 'manager'), (req, res) => {
  const { name, sort_order = 0 } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  try {
    const r = db
      .prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)')
      .run(name.trim(), sort_order);
    res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(r.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/categories/:id', requireRoles('admin', 'manager'), (req, res) => {
  const id = Number(req.params.id);
  const { name, sort_order } = req.body;
  db.prepare(
    'UPDATE categories SET name = COALESCE(?, name), sort_order = COALESCE(?, sort_order) WHERE id = ?'
  ).run(name?.trim() ?? null, sort_order ?? null, id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
});

app.delete('/api/categories/:id', requireRoles('admin', 'manager'), (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
});

// ——— Products ———
app.get('/api/products', (req, res) => {
  const { category_id, available_only } = req.query;
  let sql = `
    SELECT p.*, c.name as category_name
    FROM products p JOIN categories c ON c.id = p.category_id WHERE 1=1`;
  const params = [];
  if (category_id) {
    sql += ' AND p.category_id = ?';
    params.push(Number(category_id));
  }
  if (available_only === '1') sql += ' AND p.is_available = 1';
  sql += ' ORDER BY c.sort_order, p.name';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/products', requireRoles('admin', 'manager'), (req, res) => {
  const { category_id, name, description = '', price, is_available = 1 } = req.body;
  if (!category_id || !name?.trim() || price == null)
    return res.status(400).json({ error: 'Invalid product data' });
  const r = db
    .prepare(
      `INSERT INTO products (category_id, name, description, price, is_available)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(category_id, name.trim(), description, Number(price), is_available ? 1 : 0);
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid));
});

app.patch('/api/products/:id', requireRoles('admin', 'manager'), (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const {
    category_id = p.category_id,
    name = p.name,
    description = p.description,
    price = p.price,
    is_available = p.is_available,
  } = req.body;
  db.prepare(
    `UPDATE products SET category_id=?, name=?, description=?, price=?, is_available=? WHERE id=?`
  ).run(category_id, name.trim(), description, Number(price), is_available ? 1 : 0, id);
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
});

app.delete('/api/products/:id', requireRoles('admin', 'manager'), (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
});

// ——— Deals (combo packages) ———
function enrichDeal(deal) {
  if (!deal) return null;
  const items = db
    .prepare(
      `SELECT di.product_id, di.quantity, p.name as product_name, p.price as product_price
       FROM deal_items di
       JOIN products p ON p.id = di.product_id
       WHERE di.deal_id = ?
       ORDER BY p.name`
    )
    .all(deal.id);
  return { ...deal, items };
}

app.get('/api/deals', (req, res) => {
  let sql = 'SELECT * FROM deals WHERE 1=1';
  if (req.query.available_only === '1') sql += ' AND is_available = 1';
  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all().map(enrichDeal));
});

app.get('/api/deals/:id', (req, res) => {
  const deal = enrichDeal(
    db.prepare('SELECT * FROM deals WHERE id = ?').get(Number(req.params.id))
  );
  if (!deal) return res.status(404).json({ error: 'Not found' });
  res.json(deal);
});

app.post('/api/deals', requireRoles('admin', 'manager'), (req, res) => {
  const { name, description = '', price, is_available = 1, items = [] } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Deal name required' });
  if (price == null || Number(price) < 0) {
    return res.status(400).json({ error: 'Valid price required' });
  }
  if (!Array.isArray(items) || items.length < 1) {
    return res.status(400).json({ error: 'Select at least one menu item for the deal' });
  }

  try {
    const id = withTransaction(() => {
      const r = db
        .prepare(
          `INSERT INTO deals (name, description, price, is_available, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          name.trim(),
          description,
          Number(price),
          is_available ? 1 : 0,
          pkNow()
        );
      const dealId = r.lastInsertRowid;
      const ins = db.prepare(
        `INSERT INTO deal_items (deal_id, product_id, quantity) VALUES (?, ?, ?)`
      );
      for (const it of items) {
        const pid = Number(it.product_id);
        const qty = Math.max(1, Number(it.quantity) || 1);
        if (!pid) continue;
        const prod = db.prepare('SELECT id FROM products WHERE id = ?').get(pid);
        if (!prod) continue;
        ins.run(dealId, pid, qty);
      }
      const count = db
        .prepare('SELECT COUNT(*) as c FROM deal_items WHERE deal_id = ?')
        .get(dealId).c;
      if (!count) throw new Error('Select at least one valid menu item');
      return dealId;
    });
    res.status(201).json(enrichDeal(db.prepare('SELECT * FROM deals WHERE id = ?').get(id)));
  } catch (e) {
    res.status(400).json({ error: e.message || 'Could not create deal' });
  }
});

app.patch('/api/deals/:id', requireRoles('admin', 'manager'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const {
    name = existing.name,
    description = existing.description,
    price = existing.price,
    is_available = existing.is_available,
    items,
  } = req.body || {};

  try {
    withTransaction(() => {
      db.prepare(
        `UPDATE deals SET name=?, description=?, price=?, is_available=? WHERE id=?`
      ).run(String(name).trim(), description ?? '', Number(price), is_available ? 1 : 0, id);

      if (Array.isArray(items)) {
        if (items.length < 1) throw new Error('Select at least one menu item for the deal');
        db.prepare('DELETE FROM deal_items WHERE deal_id = ?').run(id);
        const ins = db.prepare(
          `INSERT INTO deal_items (deal_id, product_id, quantity) VALUES (?, ?, ?)`
        );
        for (const it of items) {
          const pid = Number(it.product_id);
          const qty = Math.max(1, Number(it.quantity) || 1);
          if (!pid) continue;
          const prod = db.prepare('SELECT id FROM products WHERE id = ?').get(pid);
          if (!prod) continue;
          ins.run(id, pid, qty);
        }
        const count = db
          .prepare('SELECT COUNT(*) as c FROM deal_items WHERE deal_id = ?')
          .get(id).c;
        if (!count) throw new Error('Select at least one valid menu item');
      }
    });
    res.json(enrichDeal(db.prepare('SELECT * FROM deals WHERE id = ?').get(id)));
  } catch (e) {
    res.status(400).json({ error: e.message || 'Could not update deal' });
  }
});

app.delete('/api/deals/:id', requireRoles('admin', 'manager'), (req, res) => {
  db.prepare('DELETE FROM deals WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
});

// ——— Orders ———
app.get('/api/orders', (req, res) => {
  const { date, limit = 100, status, kitchen } = req.query;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (date) {
    sql += ' AND date(created_at) = date(?)';
    params.push(date);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (kitchen === '1') {
    sql += " AND status IN ('queued','preparing','ready')";
  }
  if (req.query.payment_status) {
    sql += ' AND payment_status = ?';
    params.push(req.query.payment_status);
  }
  if (req.query.unpaid === '1') {
    sql += " AND payment_status = 'unpaid' AND status != 'void'";
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit));
  res.json(db.prepare(sql).all(...params).map(enrichOrder));
});

app.get('/api/orders/:id', (req, res) => {
  const order = enrichOrder(
    db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id))
  );
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

app.post('/api/orders', requireRoles('admin', 'manager', 'cashier'), (req, res) => {
  const {
    items,
    order_type = 'dine-in',
    table_number = '',
    payment_method,
    amount_paid,
    discount = 0,
    notes = '',
    customer_name = '',
    customer_phone = '',
    pay_now = true,
  } = req.body;

  if (!items?.length) {
    return res.status(400).json({ error: 'Add at least one item' });
  }

  const sendOnly = pay_now === false || pay_now === 'false';
  if (!sendOnly && !payment_method) {
    return res.status(400).json({ error: 'Payment method required' });
  }
  if (order_type === 'dine-in' && sendOnly && !String(table_number).trim()) {
    return res.status(400).json({ error: 'Table number required for kitchen order' });
  }

  const settings = getSettings();
  const taxRate = parseFloat(settings.tax_rate || '0') / 100;
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const discountAmt = Math.min(Number(discount) || 0, subtotal);
  const taxable = subtotal - discountAmt;
  const tax_amount = Math.round(taxable * taxRate * 100) / 100;
  const total = Math.round((taxable + tax_amount) * 100) / 100;

  const paymentStatus = sendOnly ? 'unpaid' : 'paid';
  const method = sendOnly ? 'pending' : payment_method;
  const paid = sendOnly ? 0 : amount_paid != null ? Number(amount_paid) : total;
  const change_due =
    !sendOnly && method === 'cash'
      ? Math.max(0, Math.round((paid - total) * 100) / 100)
      : 0;

  const order_number = nextOrderNumber();
  const created = pkNow();

  const orderId = withTransaction(() => {
    const r = db
      .prepare(
        `INSERT INTO orders (
          order_number, order_type, table_number, status, payment_status,
          subtotal, tax_rate, tax_amount, discount, total,
          payment_method, amount_paid, change_due, notes,
          customer_name, customer_phone, cashier_id, city, created_at
        ) VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        order_number,
        order_type,
        table_number,
        paymentStatus,
        subtotal,
        taxRate * 100,
        tax_amount,
        discountAmt,
        total,
        method,
        paid,
        change_due,
        notes,
        customer_name,
        customer_phone,
        req.user.id,
        settings.city || 'Pakistan',
        created
      );
    const id = r.lastInsertRowid;
    const ins = db.prepare(
      `INSERT INTO order_items (order_id, product_id, deal_id, product_name, quantity, unit_price, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const item of items) {
      const dealId = item.deal_id ? Number(item.deal_id) : null;
      let name = item.product_name;
      if (dealId) {
        const deal = enrichDeal(db.prepare('SELECT * FROM deals WHERE id = ?').get(dealId));
        if (deal) {
          const bits = (deal.items || [])
            .map((x) => `${x.product_name}×${x.quantity}`)
            .join(', ');
          name = bits ? `Deal: ${deal.name} (${bits})` : `Deal: ${deal.name}`;
        }
      }
      ins.run(
        id,
        dealId ? null : item.product_id ?? null,
        dealId,
        name,
        item.quantity,
        item.unit_price,
        item.quantity * item.unit_price
      );
    }
    return id;
  });

  // Deduct kitchen stock (roti, chicken, fries, etc.) when order is placed
  try {
    applyOrderStock(orderId, -1);
    db.prepare('UPDATE orders SET stock_applied = 1 WHERE id = ?').run(orderId);
  } catch (e) {
    console.error('Stock deduct failed:', e.message);
  }

  const order = enrichOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId));
  order.stock_preview = previewOrderStock(items);
  res.status(201).json(order);
});

/** Collect payment after meal (waiter → kitchen first, pay later) */
app.post('/api/orders/:id/pay', requireRoles('admin', 'manager', 'cashier'), (req, res) => {
  const id = Number(req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (order.status === 'void') return res.status(400).json({ error: 'Order is void' });
  if (order.payment_status === 'paid') {
    return res.status(400).json({ error: 'Already paid' });
  }

  const { payment_method, amount_paid, discount } = req.body || {};
  if (!payment_method) {
    return res.status(400).json({ error: 'Payment method required' });
  }

  let subtotal = order.subtotal;
  let tax_amount = order.tax_amount;
  let tax_rate = order.tax_rate;
  let discountAmt = order.discount;
  let total = order.total;

  if (discount != null && discount !== '') {
    discountAmt = Math.min(Number(discount) || 0, subtotal);
    const taxable = subtotal - discountAmt;
    tax_amount = Math.round(taxable * (tax_rate / 100) * 100) / 100;
    total = Math.round((taxable + tax_amount) * 100) / 100;
  }

  const paid = amount_paid != null ? Number(amount_paid) : total;
  if (payment_method === 'cash' && paid < total) {
    return res.status(400).json({ error: 'Cash received is less than total' });
  }
  const change_due =
    payment_method === 'cash'
      ? Math.max(0, Math.round((paid - total) * 100) / 100)
      : 0;

  db.prepare(
    `UPDATE orders SET
      payment_status = 'paid',
      payment_method = ?,
      amount_paid = ?,
      change_due = ?,
      discount = ?,
      tax_amount = ?,
      total = ?
     WHERE id = ?`
  ).run(payment_method, paid, change_due, discountAmt, tax_amount, total, id);

  res.json(enrichOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)));
});

app.patch('/api/orders/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const allowed = ['queued', 'preparing', 'ready', 'completed', 'void'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (status === 'void' && !['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only manager/admin can void' });
  }
  if (status === 'void' && order.status !== 'void' && order.stock_applied) {
    try {
      applyOrderStock(id, 1);
      db.prepare('UPDATE orders SET stock_applied = 0 WHERE id = ?').run(id);
    } catch (e) {
      console.error('Stock restore failed:', e.message);
    }
  }
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  res.json(enrichOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)));
});

app.post('/api/orders/:id/void', requireRoles('admin', 'manager'), (req, res) => {
  const id = Number(req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (order.status !== 'void' && order.stock_applied) {
    try {
      applyOrderStock(id, 1);
      db.prepare('UPDATE orders SET stock_applied = 0 WHERE id = ?').run(id);
    } catch (e) {
      console.error('Stock restore failed:', e.message);
    }
  }
  db.prepare("UPDATE orders SET status = 'void' WHERE id = ?").run(id);
  res.json(enrichOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)));
});

// ——— Stock ———
app.get('/api/stock', requireRoles('admin', 'manager', 'cashier'), (_req, res) => {
  res.json(listStock());
});

app.get('/api/stock/low', requireRoles('admin', 'manager', 'cashier'), (_req, res) => {
  res.json(listStock().filter((s) => s.is_low));
});

app.get('/api/stock/movements', requireRoles('admin', 'manager'), (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 300);
  res.json(
    db
      .prepare(
        `SELECT m.*, s.name as stock_name, s.unit
         FROM stock_movements m
         JOIN stock_items s ON s.id = m.stock_item_id
         ORDER BY m.id DESC LIMIT ?`
      )
      .all(limit)
  );
});

app.post('/api/stock/adjust', requireRoles('admin', 'manager'), (req, res) => {
  const { stock_item_id, delta, note, set_quantity } = req.body || {};
  if (!stock_item_id) return res.status(400).json({ error: 'stock_item_id required' });
  try {
    let d = Number(delta);
    if (set_quantity != null && set_quantity !== '') {
      const item = db.prepare('SELECT quantity FROM stock_items WHERE id = ?').get(stock_item_id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      d = Number(set_quantity) - item.quantity;
    }
    if (Number.isNaN(d) || d === 0) {
      return res.status(400).json({ error: 'Enter a quantity change' });
    }
    const updated = adjustStock({
      stock_item_id: Number(stock_item_id),
      delta: d,
      reason: d > 0 ? 'restock' : 'adjust',
      user_id: req.user.id,
      note: note || '',
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/stock/preview', requireRoles('admin', 'manager', 'cashier'), (req, res) => {
  res.json(previewOrderStock(req.body?.items || []));
});

app.post('/api/stock/sync-recipes', requireRoles('admin', 'manager'), (_req, res) => {
  syncProductRecipes();
  res.json({ ok: true, message: 'Menu recipes synced to stock' });
});

app.patch('/api/stock/:id', requireRoles('admin', 'manager'), (req, res) => {
  const id = Number(req.params.id);
  const item = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const {
    name = item.name,
    unit = item.unit,
    low_alert = item.low_alert,
    is_active = item.is_active,
  } = req.body || {};
  db.prepare(
    `UPDATE stock_items SET name=?, unit=?, low_alert=?, is_active=?, updated_at=? WHERE id=?`
  ).run(name, unit, Number(low_alert), is_active ? 1 : 0, pkNow(), id);
  res.json(db.prepare('SELECT * FROM stock_items WHERE id = ?').get(id));
});

// ——— Dashboard ———
app.get('/api/dashboard/today', (req, res) => {
  const today = pkToday();
  const raw = String(req.query.date || '').trim();
  const day = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const isToday = day === today;

  const stats = db
    .prepare(
      `SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(CASE WHEN status != 'void' AND payment_status = 'paid' THEN total ELSE 0 END), 0) as revenue,
        COALESCE(SUM(CASE WHEN status != 'void' AND payment_status = 'unpaid' THEN total ELSE 0 END), 0) as unpaid_total,
        COALESCE(SUM(CASE WHEN status != 'void' AND payment_status = 'unpaid' THEN 1 ELSE 0 END), 0) as unpaid_count,
        COALESCE(SUM(CASE WHEN status = 'void' THEN 1 ELSE 0 END), 0) as void_count,
        COALESCE(SUM(CASE WHEN status IN ('queued','preparing','ready') THEN 1 ELSE 0 END), 0) as active_kitchen
       FROM orders WHERE date(created_at) = date(?)`
    )
    .get(day);

  const byPayment = db
    .prepare(
      `SELECT payment_method, COUNT(*) as count, SUM(total) as total
       FROM orders WHERE date(created_at) = date(?) AND status != 'void' AND payment_status = 'paid'
       GROUP BY payment_method`
    )
    .all(day);

  const topItems = db
    .prepare(
      `SELECT oi.product_name, SUM(oi.quantity) as qty, SUM(oi.line_total) as sales
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE date(o.created_at) = date(?) AND o.status != 'void'
       GROUP BY oi.product_name ORDER BY qty DESC LIMIT 8`
    )
    .all(day);

  const hourly = db
    .prepare(
      `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
              COUNT(*) as orders, COALESCE(SUM(total),0) as revenue
       FROM orders WHERE date(created_at) = date(?) AND status != 'void' AND payment_status = 'paid'
       GROUP BY hour ORDER BY hour`
    )
    .all(day);

  res.json({
    date: day,
    is_today: isToday,
    timezone: 'Asia/Karachi',
    ...stats,
    byPayment,
    topItems,
    hourly,
  });
});

// Insights should count all non-void orders (kitchen volume), revenue tips still useful


// ——— Insights: item performance by time ———
app.get('/api/insights/item-performance', (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 90);
  const rows = db
    .prepare(
      `SELECT oi.product_name,
              CAST(strftime('%H', o.created_at) AS INTEGER) as hour,
              SUM(oi.quantity) as qty,
              SUM(oi.line_total) as sales,
              COUNT(DISTINCT o.id) as order_count
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'void'
         AND date(o.created_at) >= date('now', ?)
       GROUP BY oi.product_name, hour
       ORDER BY qty DESC`
    )
    .all(`-${days} days`);

  const byItem = {};
  for (const r of rows) {
    if (!byItem[r.product_name]) {
      byItem[r.product_name] = {
        product_name: r.product_name,
        total_qty: 0,
        total_sales: 0,
        by_hour: {},
        by_daypart: Object.fromEntries(DAYPARTS.map((d) => [d, { qty: 0, sales: 0 }])),
        peak_hour: null,
        peak_daypart: null,
      };
    }
    const item = byItem[r.product_name];
    item.total_qty += r.qty;
    item.total_sales += r.sales;
    item.by_hour[r.hour] = { qty: r.qty, sales: r.sales, order_count: r.order_count };
    const part = daypart(r.hour);
    item.by_daypart[part].qty += r.qty;
    item.by_daypart[part].sales += r.sales;
  }

  const items = Object.values(byItem).map((item) => {
    let peakHour = null;
    let peakHourQty = 0;
    for (const [h, v] of Object.entries(item.by_hour)) {
      if (v.qty > peakHourQty) {
        peakHourQty = v.qty;
        peakHour = Number(h);
      }
    }
    let peakPart = null;
    let peakPartQty = 0;
    for (const [p, v] of Object.entries(item.by_daypart)) {
      if (v.qty > peakPartQty) {
        peakPartQty = v.qty;
        peakPart = p;
      }
    }
    return {
      ...item,
      peak_hour: peakHour,
      peak_hour_label: peakHour != null ? formatHourPk(peakHour) : null,
      peak_daypart: peakPart,
      tip:
        peakPart && peakHour != null
          ? `${item.product_name} sells most at ${formatHourPk(peakHour)} (${peakPart}). Keep stock ready.`
          : 'Not enough sales data yet.',
    };
  });

  items.sort((a, b) => b.total_qty - a.total_qty);

  const daypartTotals = DAYPARTS.map((p) => {
    let qty = 0;
    let sales = 0;
    for (const item of items) {
      qty += item.by_daypart[p]?.qty || 0;
      sales += item.by_daypart[p]?.sales || 0;
    }
    return { daypart: p, qty, sales };
  });

  const hourlyHeat = Array.from({ length: 24 }, (_, hour) => {
    let qty = 0;
    let sales = 0;
    for (const r of rows) {
      if (r.hour === hour) {
        qty += r.qty;
        sales += r.sales;
      }
    }
    return { hour, label: formatHourPk(hour), qty, sales, daypart: daypart(hour) };
  });

  res.json({
    days,
    timezone: 'Asia/Karachi',
    currency: 'PKR',
    items,
    daypartTotals,
    hourlyHeat,
    recommendations: buildRecommendations(items, daypartTotals),
  });
});

function formatHourPk(hour) {
  const h = Number(hour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:00 ${ampm}`;
}

function buildRecommendations(items, daypartTotals) {
  const tips = [];
  const top = items.slice(0, 5);
  for (const item of top) {
    if (item.peak_daypart) {
      tips.push({
        type: 'peak',
        text: `${item.product_name}: peak in ${item.peak_daypart} (~${item.peak_hour_label}). Prep extra before that rush.`,
      });
    }
  }
  const busiest = [...daypartTotals].sort((a, b) => b.sales - a.sales)[0];
  if (busiest?.sales > 0) {
    tips.push({
      type: 'rush',
      text: `Busiest period: ${busiest.daypart} (Rs ${Math.round(busiest.sales).toLocaleString('en-PK')} sales). Roster more staff then.`,
    });
  }
  if (!tips.length) {
    tips.push({
      type: 'info',
      text: 'Place more orders to unlock item timing insights for Food Bazar Cafe.',
    });
  }
  return tips;
}

// Serve built frontend
const distPath = path.join(getAppRoot(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Food Bazar Cafe POS — http://127.0.0.1:${PORT}`);
  console.log(`Database: ${getDbPath()}`);
  console.log('Login: admin / 1234  |  cashier / 1111  |  manager / 2222  |  kitchen / 3333');
});
