import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import { hashPin } from './auth-hash.js';
import { pkNow } from './time.js';
import { getDataDir, getDbPath } from './paths.js';
import { MENU_CATEGORIES } from './menu-data.js';

const dataDir = getDataDir();
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = getDbPath();
const isNewDb = !fs.existsSync(dbPath);
export const db = new DatabaseSync(dbPath);

if (isNewDb) {
  console.log('New database created:', dbPath);
} else {
  console.log('Using existing database:', dbPath);
}

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

export function withTransaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

function addColumn(table, column, type) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL CHECK(price >= 0),
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      order_type TEXT NOT NULL DEFAULT 'dine-in',
      table_number TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'queued',
      subtotal REAL NOT NULL,
      tax_rate REAL NOT NULL,
      tax_amount REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      amount_paid REAL,
      change_due REAL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','manager','cashier','kitchen')),
      pin_salt TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'pcs',
      quantity REAL NOT NULL DEFAULT 0,
      low_alert REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      stock_item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
      qty_per_sale REAL NOT NULL CHECK(qty_per_sale > 0),
      UNIQUE(product_id, stock_item_id)
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
      delta REAL NOT NULL,
      quantity_after REAL NOT NULL,
      reason TEXT NOT NULL,
      order_id INTEGER,
      user_id INTEGER,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL CHECK(price >= 0),
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deal_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
      UNIQUE(deal_id, product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(stock_item_id);
    CREATE INDEX IF NOT EXISTS idx_deal_items_deal ON deal_items(deal_id);
  `);

  // Upgrade existing DBs (additive only — never drops data)
  addColumn('orders', 'customer_name', "TEXT DEFAULT ''");
  addColumn('orders', 'customer_phone', "TEXT DEFAULT ''");
  addColumn('orders', 'cashier_id', 'INTEGER');
  addColumn('orders', 'city', "TEXT DEFAULT 'Pakistan'");
  addColumn('orders', 'payment_status', "TEXT DEFAULT 'paid'");
  addColumn('orders', 'stock_applied', 'INTEGER DEFAULT 0');
  addColumn('order_items', 'deal_id', 'INTEGER');

  // Ensure deals tables exist on older DBs
  db.exec(`
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL CHECK(price >= 0),
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS deal_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
      UNIQUE(deal_id, product_id)
    );
    CREATE INDEX IF NOT EXISTS idx_deal_items_deal ON deal_items(deal_id);
  `);
  db.prepare(
    `UPDATE orders SET payment_status = 'paid'
     WHERE payment_status IS NULL OR payment_status = ''`
  ).run();

  // Replace legacy stock schema (item_key / reorder_level) if present
  const stockCols = db.prepare('PRAGMA table_info(stock_items)').all();
  if (stockCols.length && !stockCols.some((c) => c.name === 'code')) {
    db.exec(`
      DROP TABLE IF EXISTS stock_movements;
      DROP TABLE IF EXISTS product_recipes;
      DROP TABLE IF EXISTS stock_items;
    `);
    db.exec(`
      CREATE TABLE stock_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'pcs',
        quantity REAL NOT NULL DEFAULT 0,
        low_alert REAL NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE product_recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        stock_item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
        qty_per_sale REAL NOT NULL CHECK(qty_per_sale > 0),
        UNIQUE(product_id, stock_item_id)
      );
      CREATE TABLE stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stock_item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
        delta REAL NOT NULL,
        quantity_after REAL NOT NULL,
        reason TEXT NOT NULL,
        order_id INTEGER,
        user_id INTEGER,
        note TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    console.log('Migrated stock tables to new schema');
  }
}

export function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (count === 0) {
    const insertCat = db.prepare(
      'INSERT INTO categories (name, sort_order) VALUES (?, ?)'
    );
    const insertProd = db.prepare(
      'INSERT INTO products (category_id, name, description, price) VALUES (?, ?, ?, ?)'
    );

    withTransaction(() => {
      for (const cat of MENU_CATEGORIES) {
        const { lastInsertRowid: catId } = insertCat.run(cat.name, cat.order);
        for (const [name, desc, price] of cat.items) {
          insertProd.run(catId, name, desc || '', price);
        }
      }
    });
  }

  const setIfMissing = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO NOTHING`
  );
  const defaults = {
    restaurant_name: 'Food Bazar Cafe',
    tagline: 'Good Food Great Vibes',
    currency_symbol: 'Rs',
    currency_code: 'PKR',
    tax_rate: '0',
    tax_label: 'Tax',
    address: 'Dargai Phattak MKD',
    city: 'Dargai',
    phone: '03173451369',
    order_prefix: 'FBC',
    country: 'Pakistan',
    timezone: 'Asia/Karachi',
  };
  for (const [k, v] of Object.entries(defaults)) {
    setIfMissing.run(k, v);
  }
  // Migrate older defaults → Food Bazar Cafe (Dargai)
  const force = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
  const cur = db.prepare("SELECT value FROM settings WHERE key = 'currency_symbol'").get();
  if (cur?.value === '₹' || !cur) force.run('Rs', 'currency_symbol');
  const phone = db.prepare("SELECT value FROM settings WHERE key = 'phone'").get();
  if (
    !phone?.value ||
    phone.value.includes('+91') ||
    phone.value === '03XX-XXXXXXX'
  ) {
    force.run('03173451369', 'phone');
  }
  const addr = db.prepare("SELECT value FROM settings WHERE key = 'address'").get();
  if (
    !addr?.value ||
    addr.value === 'Your cafe address here' ||
    addr.value === 'Karachi, Pakistan'
  ) {
    force.run('Dargai Phattak MKD', 'address');
  }
  force.run('PKR', 'currency_code');
  force.run('0', 'tax_rate');
  force.run('Tax', 'tax_label');
  force.run('Asia/Karachi', 'timezone');
  force.run('Pakistan', 'country');
  force.run('Dargai', 'city');

  // Default staff (PIN login)
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const ins = db.prepare(
      `INSERT INTO users (username, display_name, role, pin_salt, pin_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const staff = [
      ['admin', 'Owner Admin', 'admin', '1234'],
      ['manager', 'Floor Manager', 'manager', '2222'],
      ['cashier', 'Cashier', 'cashier', '1111'],
      ['kitchen', 'Kitchen Staff', 'kitchen', '3333'],
    ];
    withTransaction(() => {
      for (const [username, display_name, role, pin] of staff) {
        const { salt, hash } = hashPin(pin);
        ins.run(username, display_name, role, salt, hash, pkNow());
      }
    });
  }
}

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function nextOrderNumber() {
  const prefix =
    db.prepare("SELECT value FROM settings WHERE key = 'order_prefix'").get()
      ?.value || 'FBC';
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Karachi',
  }).replace(/-/g, '');
  const pattern = `${prefix}-${today}-%`;
  const last = db
    .prepare(
      `SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1`
    )
    .get(pattern);
  let seq = 1;
  if (last) {
    const parts = last.order_number.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}-${today}-${String(seq).padStart(4, '0')}`;
}
