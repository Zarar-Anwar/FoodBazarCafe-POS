import { money, formatTime, formatPhone } from './format';

/** 58mm roll ≈ 24–28 chars at readable size; keep short to avoid wrap. */
const W = 24;

/**
 * Fixed-width thermal receipt. No trailing spaces (they wrap on 58mm).
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

  // Header — all centered
  for (const part of wrapCenter(name)) lines.push(part);
  if (tagline) for (const part of wrapCenter(tagline)) lines.push(part);
  for (const part of wrapCenter(address)) lines.push(part);
  lines.push(center(phone));
  lines.push(dash());

  // Meta — centered for a clean look
  lines.push(center(`Order: ${order.order_number || ''}`));
  lines.push(center(formatTime(order.created_at)));
  lines.push(
    center(
      titleCase(order.order_type) +
        (order.table_number ? ` T${order.table_number}` : '')
    )
  );
  if (order.customer_name || order.customer_phone) {
    const cust = [order.customer_name, order.customer_phone ? formatPhone(order.customer_phone) : '']
      .filter(Boolean)
      .join(' ');
    for (const part of wrapCenter(cust)) lines.push(part);
  }
  lines.push(dash());

  // Items
  for (const item of order.items || []) {
    const label = `${item.product_name} x${item.quantity}`;
    const price = money(item.line_total, sym);
    if (label.length + price.length + 1 <= W) {
      lines.push(pair(label, price));
    } else {
      for (const part of wrapLeft(label)) lines.push(part);
      lines.push(center(price));
    }
  }

  lines.push(dash());

  if (order.discount > 0) {
    lines.push(pair('Subtotal', money(order.subtotal, sym)));
    lines.push(pair('Discount', `-${money(order.discount, sym)}`));
  }
  if (showTax) {
    lines.push(pair('Tax', money(order.tax_amount, sym)));
  }
  lines.push(pair('TOTAL', money(order.total, sym)));

  if (order.payment_status === 'unpaid') {
    lines.push(center('UNPAID'));
  } else {
    lines.push(pair(`Paid (${titleCase(order.payment_method)})`, money(order.amount_paid ?? order.total, sym)));
    if (order.change_due > 0) {
      lines.push(pair('Change', money(order.change_due, sym)));
    }
  }

  lines.push(dash());
  lines.push(center('Thank You For Order'));
  lines.push('');

  const body = escapeHtml(lines.map((l) => rtrim(l)).join('\n'));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(order.order_number || '')}</title>
  <style>
    @page { margin: 0; size: 58mm auto; }
    * { margin: 0; padding: 0; }
    html, body {
      background: #fff;
      color: #000;
      width: 58mm;
      max-width: 58mm;
    }
    body {
      padding: 2mm 1.5mm 8mm;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    pre {
      display: inline-block;
      text-align: left;
      margin: 0 auto;
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.4;
      white-space: pre;
      color: #000;
    }
    @media print {
      html, body { width: 58mm; margin: 0; }
    }
  </style>
</head>
<body>
  <pre>${body}</pre>
  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 300);
    };
    window.onafterprint = function () { window.close(); };
  </script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=360,height=640');
  if (!w) {
    alert('Please allow pop-ups to print the receipt.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function rtrim(s) {
  return String(s ?? '').replace(/\s+$/g, '');
}

function dash() {
  return '-'.repeat(W);
}

function center(text) {
  const t = String(text ?? '').trim();
  if (t.length >= W) return t.slice(0, W);
  const pad = Math.floor((W - t.length) / 2);
  return ' '.repeat(pad) + t;
}

function wrapCenter(text) {
  const t = String(text ?? '').trim();
  if (!t) return [];
  if (t.length <= W) return [center(t)];
  const out = [];
  let rest = t;
  while (rest.length > W) {
    out.push(center(rest.slice(0, W)));
    rest = rest.slice(W).trim();
  }
  if (rest) out.push(center(rest));
  return out;
}

function wrapLeft(text) {
  const t = String(text ?? '').trim();
  if (!t) return [];
  if (t.length <= W) return [t];
  const out = [];
  let rest = t;
  while (rest.length > W) {
    let cut = rest.lastIndexOf(' ', W);
    if (cut < 8) cut = W;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

function pair(left, right) {
  const L = String(left ?? '').trim();
  const R = String(right ?? '').trim();
  const gap = W - L.length - R.length;
  if (gap >= 1) return L + ' '.repeat(gap) + R;
  if (L.length + 1 + R.length <= W) return `${L} ${R}`;
  return R;
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
