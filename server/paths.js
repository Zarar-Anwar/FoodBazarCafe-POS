import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * App root = folder that contains the launcher / portable package.
 * - POS_ROOT env (set by .cmd / .exe) wins
 * - else project root (parent of /server)
 */
export function getAppRoot() {
  if (process.env.POS_ROOT) {
    return path.resolve(process.env.POS_ROOT);
  }
  return path.resolve(__dirname, '..');
}

/**
 * Database folder lives NEXT TO the app (same directory as the launcher):
 *   <app>/data/foodbazarcafe.db
 * Created automatically on first run; reused if it already exists.
 */
export function getDataDir() {
  if (process.env.POS_DATA_DIR) {
    return path.resolve(process.env.POS_DATA_DIR);
  }
  const dir = path.join(getAppRoot(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getDbPath() {
  return path.join(getDataDir(), 'foodbazarcafe.db');
}
