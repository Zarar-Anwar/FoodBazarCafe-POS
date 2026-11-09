/** Pakistan locale helpers */

export function money(amount, symbol = 'Rs') {
  const n = Number(amount) || 0;
  return `${symbol} ${n.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatTime(iso) {
  if (!iso) return '';
  // SQLite stores "YYYY-MM-DD HH:mm:ss" in PKT
  const d = new Date(String(iso).replace(' ', 'T') + '+05:00');
  return d.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatClock() {
  return new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function pkToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
}

export function formatPhone(phone) {
  if (!phone) return '';
  const d = String(phone).replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('03')) {
    return `${d.slice(0, 4)}-${d.slice(4)}`;
  }
  return phone;
}

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'jazzcash', label: 'JazzCash' },
  { id: 'easypaisa', label: 'EasyPaisa' },
  { id: 'card', label: 'Card' },
  { id: 'bank', label: 'Bank Transfer' },
];

export const ORDER_STATUSES = {
  queued: { label: 'New', color: 'bg-amber-100 text-amber-800' },
  preparing: { label: 'Preparing', color: 'bg-blue-100 text-blue-800' },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Served', color: 'bg-cafe-100 text-cafe-800' },
  void: { label: 'Void', color: 'bg-red-100 text-red-700' },
};

export const PAYMENT_STATUSES = {
  unpaid: { label: 'Unpaid bill', color: 'bg-orange-100 text-orange-800' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
};
