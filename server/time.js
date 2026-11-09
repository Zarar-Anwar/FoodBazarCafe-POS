/** Pakistan Standard Time helpers (Asia/Karachi, UTC+5) */

export function pkNow() {
  return new Date()
    .toLocaleString('sv-SE', { timeZone: 'Asia/Karachi' })
    .replace('T', ' ');
}

export function pkToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
}

export function daypart(hour) {
  const h = Number(hour);
  if (h >= 7 && h < 11) return 'Breakfast';
  if (h >= 11 && h < 15) return 'Lunch';
  if (h >= 15 && h < 18) return 'Evening';
  if (h >= 18 && h < 22) return 'Dinner';
  return 'Late Night';
}

export const DAYPARTS = ['Breakfast', 'Lunch', 'Evening', 'Dinner', 'Late Night'];
