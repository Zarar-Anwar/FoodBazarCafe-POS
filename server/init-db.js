import { db, runMigrations, seedIfEmpty } from './db.js';

runMigrations();
seedIfEmpty();
console.log('Database ready:', db.prepare('SELECT COUNT(*) as c FROM products').get().c, 'products');
db.close();
