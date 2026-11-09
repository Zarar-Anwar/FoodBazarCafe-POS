import { db, withTransaction } from './db.js';
import { pkNow } from './time.js';
import { STOCK_ITEMS, PRODUCT_RECIPES } from './stock-data.js';

export function seedStockIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM stock_items').get().c;
  if (count > 0) {
    syncProductRecipes();
    return;
  }

  const ins = db.prepare(
    `INSERT INTO stock_items (code, name, unit, quantity, low_alert, is_active, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`
  );
  withTransaction(() => {
    for (const [code, name, unit, qty, low] of STOCK_ITEMS) {
      ins.run(code, name, unit, qty, low, pkNow());
    }
  });
  syncProductRecipes();
  console.log('Stock seeded:', STOCK_ITEMS.length, 'items');
}

/** Link menu products → stock recipes (by product name) */
export function syncProductRecipes() {
  const products = db.prepare('SELECT id, name FROM products').all();
  const byCode = Object.fromEntries(
    db.prepare('SELECT id, code FROM stock_items').all().map((r) => [r.code, r.id])
  );
  const del = db.prepare('DELETE FROM product_recipes WHERE product_id = ?');
  const ins = db.prepare(
    `INSERT INTO product_recipes (product_id, stock_item_id, qty_per_sale)
     VALUES (?, ?, ?)`
  );

  withTransaction(() => {
    for (const p of products) {
      const recipe = PRODUCT_RECIPES[p.name];
      if (!recipe) continue;
      del.run(p.id);
      for (const line of recipe) {
        const stockId = byCode[line.code];
        if (!stockId) continue;
        ins.run(p.id, stockId, line.qty);
      }
    }
  });
}

export function listStock() {
  return db
    .prepare(
      `SELECT *,
        CASE WHEN quantity <= low_alert THEN 1 ELSE 0 END as is_low
       FROM stock_items
       WHERE is_active = 1
       ORDER BY is_low DESC, name`
    )
    .all();
}

function writeStockDelta({
  stock_item_id,
  delta,
  reason = 'adjust',
  order_id = null,
  user_id = null,
  note = '',
}) {
  const item = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(stock_item_id);
  if (!item) throw new Error('Stock item not found');
  const next = Math.round((item.quantity + Number(delta)) * 100) / 100;
  db.prepare(
    `UPDATE stock_items SET quantity = ?, updated_at = ? WHERE id = ?`
  ).run(next, pkNow(), stock_item_id);
  db.prepare(
    `INSERT INTO stock_movements (stock_item_id, delta, quantity_after, reason, order_id, user_id, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(stock_item_id, delta, next, reason, order_id, user_id, note, pkNow());
  return db.prepare('SELECT * FROM stock_items WHERE id = ?').get(stock_item_id);
}

export function adjustStock(args) {
  return withTransaction(() => writeStockDelta(args));
}

function recipesForProduct(productId, productName, recipeStmt, recipeByName) {
  let recipes = productId ? recipeStmt.all(productId) : [];
  if (!recipes.length && productName) recipes = recipeByName.all(productName);
  return recipes;
}

/** Deduct stock for order line items. direction: -1 sale, +1 void restore */
export function applyOrderStock(orderId, direction = -1) {
  const items = db
    .prepare(
      'SELECT product_id, deal_id, product_name, quantity FROM order_items WHERE order_id = ?'
    )
    .all(orderId);

  const recipeStmt = db.prepare(
    `SELECT pr.stock_item_id, pr.qty_per_sale
     FROM product_recipes pr
     WHERE pr.product_id = ?`
  );
  const recipeByName = db.prepare(
    `SELECT pr.stock_item_id, pr.qty_per_sale
     FROM product_recipes pr
     JOIN products p ON p.id = pr.product_id
     WHERE p.name = ?`
  );
  const dealParts = db.prepare(
    `SELECT di.product_id, di.quantity, p.name as product_name
     FROM deal_items di
     JOIN products p ON p.id = di.product_id
     WHERE di.deal_id = ?`
  );

  withTransaction(() => {
    for (const line of items) {
      const parts = line.deal_id
        ? dealParts.all(line.deal_id).map((p) => ({
            product_id: p.product_id,
            product_name: p.product_name,
            quantity: p.quantity * line.quantity,
          }))
        : [
            {
              product_id: line.product_id,
              product_name: line.product_name,
              quantity: line.quantity,
            },
          ];

      for (const part of parts) {
        const recipes = recipesForProduct(
          part.product_id,
          part.product_name,
          recipeStmt,
          recipeByName
        );
        for (const r of recipes) {
          const delta = direction * r.qty_per_sale * part.quantity;
          writeStockDelta({
            stock_item_id: r.stock_item_id,
            delta,
            reason: direction < 0 ? 'sale' : 'void_restore',
            order_id: orderId,
          });
        }
      }
    }
  });
}

export function previewOrderStock(cartItems) {
  /** cartItems: [{ product_id, deal_id, product_name, quantity }] */
  const needed = {};
  const recipeStmt = db.prepare(
    `SELECT pr.stock_item_id, pr.qty_per_sale, si.code, si.name, si.unit, si.quantity, si.low_alert
     FROM product_recipes pr
     JOIN stock_items si ON si.id = pr.stock_item_id
     WHERE pr.product_id = ?`
  );
  const byName = db.prepare(
    `SELECT pr.stock_item_id, pr.qty_per_sale, si.code, si.name, si.unit, si.quantity, si.low_alert
     FROM product_recipes pr
     JOIN products p ON p.id = pr.product_id
     JOIN stock_items si ON si.id = pr.stock_item_id
     WHERE p.name = ?`
  );
  const dealParts = db.prepare(
    `SELECT di.product_id, di.quantity, p.name as product_name
     FROM deal_items di
     JOIN products p ON p.id = di.product_id
     WHERE di.deal_id = ?`
  );

  for (const line of cartItems) {
    const parts = line.deal_id
      ? dealParts.all(Number(line.deal_id)).map((p) => ({
          product_id: p.product_id,
          product_name: p.product_name,
          quantity: p.quantity * line.quantity,
        }))
      : [
          {
            product_id: line.product_id,
            product_name: line.product_name,
            quantity: line.quantity,
          },
        ];

    for (const part of parts) {
      let recipes = part.product_id ? recipeStmt.all(part.product_id) : [];
      if (!recipes.length && part.product_name) recipes = byName.all(part.product_name);
      for (const r of recipes) {
        const key = r.stock_item_id;
        if (!needed[key]) {
          needed[key] = {
            stock_item_id: r.stock_item_id,
            code: r.code,
            name: r.name,
            unit: r.unit,
            on_hand: r.quantity,
            low_alert: r.low_alert,
            required: 0,
          };
        }
        needed[key].required += r.qty_per_sale * part.quantity;
      }
    }
  }

  return Object.values(needed).map((n) => ({
    ...n,
    required: Math.round(n.required * 100) / 100,
    after: Math.round((n.on_hand - n.required) * 100) / 100,
    shortfall: n.on_hand < n.required,
    will_be_low: n.on_hand - n.required <= n.low_alert,
  }));
}
