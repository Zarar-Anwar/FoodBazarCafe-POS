/**
 * Replace all categories/products with the official Food Bazar Café menu.
 * Order history is kept (order_items store product names already).
 *
 * Usage: node server/import-menu.js
 */
import { db, runMigrations, withTransaction } from './db.js';
import { MENU_CATEGORIES } from './menu-data.js';
import { seedStockIfEmpty, syncProductRecipes } from './stock.js';

runMigrations();

const insertCat = db.prepare(
  'INSERT INTO categories (name, sort_order) VALUES (?, ?)'
);
const insertProd = db.prepare(
  'INSERT INTO products (category_id, name, description, price, is_available) VALUES (?, ?, ?, ?, 1)'
);

withTransaction(() => {
  db.prepare('DELETE FROM products').run();
  db.prepare('DELETE FROM categories').run();

  for (const cat of MENU_CATEGORIES) {
    const { lastInsertRowid: catId } = insertCat.run(cat.name, cat.order);
    for (const [name, desc, price] of cat.items) {
      insertProd.run(catId, name, desc || '', price);
    }
  }

  db.prepare(
    `INSERT INTO settings (key, value) VALUES ('tagline', 'Good Food Great Vibes')
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run();
  db.prepare(
    `INSERT INTO settings (key, value) VALUES ('restaurant_name', 'Food Bazar Cafe')
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run();
});

seedStockIfEmpty();
syncProductRecipes();

const cats = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
const prods = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
console.log(`Menu imported: ${cats} categories, ${prods} items`);
console.log('Stock recipes synced.');
console.log('Restart POS / refresh browser to see the new menu.');
