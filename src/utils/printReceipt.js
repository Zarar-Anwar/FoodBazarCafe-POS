import { money, formatTime, formatPhone } from './format';

/** Characters that fit one line on the café roll. */
const COLS = 32;
/** Extra spaces so the block sits in the middle of the roll, not the left edge. */
const NUDGE = 6;

/**
 * Plain centered text. The thermal driver ignores CSS columns,
 * so every line is padded and sent as its own row.
 */
export function printReceipt(order, settings = {}) {
  if (!order) return;

  const sym = settings.currency_symbol || 'Rs';
  const name = (settings.restaurant_name || 'Food Bazar Cafe').toUpperCase();
  const tagline = settings.tagline || '';
  const address = settings.address || 'Dargai Phattak MKD';
  const phone = settings.phone ? formatPhone(settings.phone) : '0317-3451369';
  const taxAmount = Number(order.tax_amount) || 0;
  const showTax = taxAmount > 0 && Number(order.tax_rate) > 0;

  const lines = [];
  const add = (text) => {
    for (const part of wrapCenter(text)) lines.push(part);
  };

  add(order.payment_status === 'unpaid' ? 'Bill pending' : 'Thank You For Order');
  add(name);
  if (tagline) add(tagline);
  add(address);
  add(phone);
  lines.push(dash());
  add(`Order: ${order.order_number || ''}`);
  add(formatTime(order.created_at));
  add(
    titleCase(order.order_type) +
      (order.table_number ? `  Table ${order.table_number}` : '')
  );
  if (order.customer_name || order.customer_phone) {
    add(
      [order.customer_name, order.customer_phone ? formatPhone(order.customer_phone) : '']
        .filter(Boolean)
        .join('  ')
    );
  }
  lines.push(dash());

  for (const item of order.items || []) {
    add(item.product_name);
    add(`x${item.quantity}`);
    add(money(item.line_total, sym));
    lines.push('');
  }

  lines.push(dash());

  if (order.discount > 0) {
    add('Subtotal');
    add(money(order.subtotal, sym));
    add('Discount');
    add(`-${money(order.discount, sym)}`);
  }
  if (showTax) {
    add(settings.tax_label || 'Tax');
    add(money(order.tax_amount, sym));
  }

  add('TOTAL');
  add(money(order.total, sym));

  if (order.payment_status === 'unpaid') {
    add('UNPAID');
  } else {
    add(`Paid (${titleCase(order.payment_method)})`);
    add(money(order.amount_paid ?? order.total, sym));
    if (order.change_due > 0) {
      add('Change');
      add(money(order.change_due, sym));
    }
  }

  lines.push('');
  lines.push('');

  const body = escapeHtml(lines.join('\n'));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      text-align: center;
    }
    pre {
      display: inline-block;
      margin: 2mm auto 10mm;
      padding: 0;
      text-align: left;
      font-family: "Courier New", Courier, monospace;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.35;
      white-space: pre;
      color: #000;
    }
  </style>
</head>
<body>
<pre>${body}</pre>
<script>
  window.onload = function () {
    setTimeout(function () { window.focus(); window.print(); }, 250);
  };
  window.onafterprint = function () { window.close(); };
</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=420,height=720');
  if (!w) {
    alert('Please allow pop-ups to print the receipt.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function dash() {
  return ' '.repeat(NUDGE) + '-'.repeat(COLS);
}

function center(text) {
  const t = String(text ?? '').trim();
  if (!t) return '';
  if (t.length >= COLS) return ' '.repeat(NUDGE) + t.slice(0, COLS);
  const pad = Math.floor((COLS - t.length) / 2);
  return ' '.repeat(NUDGE + pad) + t;
}

function wrapCenter(text) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const rows = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= COLS) {
      current = next;
    } else {
      if (current) rows.push(center(current));
      current = word.length > COLS ? word.slice(0, COLS) : word;
    }
  }
  if (current) rows.push(center(current));
  return rows;
}

function titleCase(value) {
  return String(value || '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('-');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
