import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { money, PAYMENT_METHODS } from '../utils/format';
import Receipt from '../components/Receipt';
import { printReceipt } from '../utils/printReceipt';

export default function PosPage({ settings }) {
  const sym = settings?.currency_symbol || 'Rs';
  const taxRate = parseFloat(settings?.tax_rate || '0') / 100;

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dine-in');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, prods, dealList] = await Promise.all([
        api.categories(),
        api.products({ available_only: '1' }),
        api.deals({ available_only: '1' }),
      ]);
      setCategories(cats);
      setProducts(prods);
      setDeals(dealList);
      setActiveCat((prev) => {
        if (prev === 'deals' || prev != null) return prev;
        return cats[0]?.id ?? (dealList.length ? 'deals' : null);
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredDeals = useMemo(() => {
    if (activeCat !== 'deals' && search.trim() === '') return [];
    let list = deals;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.items || []).some((it) => it.product_name?.toLowerCase().includes(q))
      );
    } else if (activeCat !== 'deals') {
      return [];
    }
    return list;
  }, [deals, activeCat, search]);

  const filtered = useMemo(() => {
    if (activeCat === 'deals' && !search.trim()) return [];
    let list = products;
    if (activeCat && activeCat !== 'deals') {
      list = list.filter((p) => p.category_id === activeCat);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category_name?.toLowerCase().includes(q)
      );
    } else if (activeCat === 'deals') {
      return [];
    }
    return list;
  }, [products, activeCat, search]);

  const addToCart = (product) => {
    const key = `p-${product.id}`;
    setCart((prev) => {
      const i = prev.findIndex((c) => c.key === key);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          deal_id: null,
          product_name: product.name,
          unit_price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const addDealToCart = (deal) => {
    const key = `d-${deal.id}`;
    const bits = (deal.items || [])
      .map((it) => `${it.product_name}×${it.quantity}`)
      .join(', ');
    setCart((prev) => {
      const i = prev.findIndex((c) => c.key === key);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key,
          product_id: null,
          deal_id: deal.id,
          product_name: deal.name,
          deal_detail: bits,
          unit_price: deal.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (key, delta) => {
    setCart((prev) =>
      prev
        .map((c) => (c.key === key ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const subtotal = cart.reduce((s, c) => s + c.quantity * c.unit_price, 0);
  const discountAmt = Math.min(parseFloat(discount) || 0, subtotal);
  const taxable = subtotal - discountAmt;
  const taxAmount = Math.round(taxable * taxRate * 100) / 100;
  const total = Math.round((taxable + taxAmount) * 100) / 100;

  const clearCart = () => {
    setCart([]);
    setDiscount('');
    setNotes('');
    setTableNumber('');
    setOrderType('dine-in');
    setCustomerName('');
    setCustomerPhone('');
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-0px)] min-h-[600px]">
      <section className="flex-1 flex flex-col min-w-0 p-4 lg:p-6 gap-4">
        <header className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="search"
              placeholder="Search menu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-cafe-200 bg-white shadow-sm focus:ring-2 focus:ring-cafe-400 outline-none"
            />
          </div>
          <select
            value={orderType}
            onChange={(e) => {
              const v = e.target.value;
              setOrderType(v);
              if (v === 'takeaway' || v === 'delivery') setTableNumber('');
            }}
            className="px-4 py-3 rounded-xl border border-cafe-200 bg-white font-medium"
          >
            <option value="dine-in">Dine in</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>
        </header>

        {(orderType === 'takeaway' || orderType === 'delivery') && (
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-cafe-200"
            />
            <input
              placeholder="03XX-XXXXXXX"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d-]/g, '').slice(0, 12))}
              className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-cafe-200"
            />
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {deals.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveCat('deals')}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeCat === 'deals'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-amber-50 border border-amber-300 text-amber-900 hover:border-amber-500'
              }`}
            >
              Deals
            </button>
          )}
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCat(c.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeCat === c.id
                  ? 'bg-cafe-600 text-white shadow-md'
                  : 'bg-white border border-cafe-200 text-cafe-800 hover:border-cafe-400'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm">{error}</p>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-cafe-500">Loading menu…</div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
            {(activeCat === 'deals' || search.trim()) &&
              filteredDeals.map((d) => (
                <button
                  key={`deal-${d.id}`}
                  type="button"
                  onClick={() => addDealToCart(d)}
                  className="group text-left bg-amber-50 rounded-2xl border border-amber-200 p-4 shadow-sm hover:shadow-lg hover:border-amber-400 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 mb-1">
                    Deal
                  </p>
                  <h3 className="font-display font-semibold text-cafe-900 leading-snug">{d.name}</h3>
                  <p className="text-xs text-cafe-600 mt-1 line-clamp-3">
                    {(d.items || [])
                      .map((it) => `${it.product_name} ×${it.quantity}`)
                      .join(' · ')}
                  </p>
                  <p className="mt-3 text-lg font-bold text-amber-800">{money(d.price, sym)}</p>
                </button>
              ))}
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className="group text-left bg-white rounded-2xl border border-cafe-100 p-4 shadow-sm hover:shadow-lg hover:border-cafe-300 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
              >
                <div className="h-2 w-12 rounded-full bg-gradient-to-r from-cafe-400 to-cafe-600 mb-3" />
                <h3 className="font-display font-semibold text-cafe-900 leading-snug">{p.name}</h3>
                <p className="text-xs text-cafe-500 mt-1 line-clamp-2">{p.description}</p>
                <p className="mt-3 text-lg font-bold text-cafe-700">{money(p.price, sym)}</p>
              </button>
            ))}
            {!filtered.length && !filteredDeals.length && (
              <p className="col-span-full text-center text-cafe-500 py-12">No items found</p>
            )}
          </div>
        )}
      </section>

      <aside className="w-full lg:w-[380px] xl:w-[420px] shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-cafe-200 flex flex-col">
        <div className="p-5 border-b border-cafe-100">
          <h2 className="font-display font-bold text-xl text-cafe-900">Current order</h2>
          <p className="text-sm text-cafe-500">{cart.length} item(s) · {sym} / PKR</p>
        </div>
        <ul className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin min-h-[120px]">
          {cart.map((item) => (
            <li key={item.key} className="flex gap-3 items-start bg-cafe-50 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {item.deal_id ? `Deal: ${item.product_name}` : item.product_name}
                </p>
                {item.deal_detail ? (
                  <p className="text-[11px] text-cafe-500 line-clamp-2">{item.deal_detail}</p>
                ) : null}
                <p className="text-xs text-cafe-500">{money(item.unit_price, sym)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => updateQty(item.key, -1)} className="w-8 h-8 rounded-lg bg-white border font-bold">
                  −
                </button>
                <span className="w-6 text-center font-semibold">{item.quantity}</span>
                <button type="button" onClick={() => updateQty(item.key, 1)} className="w-8 h-8 rounded-lg bg-cafe-600 text-white font-bold">
                  +
                </button>
              </div>
            </li>
          ))}
          {!cart.length && (
            <li className="text-center text-cafe-400 py-8 text-sm">Tap items to add</li>
          )}
        </ul>
        <div className="p-4 space-y-2 border-t border-cafe-100 bg-cafe-50/80">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              placeholder="Table #"
              value={orderType === 'takeaway' ? '' : tableNumber}
              disabled={orderType === 'takeaway'}
              onChange={(e) => {
                setTableNumber(e.target.value);
                setOrderType('dine-in');
              }}
              onFocus={() => {
                if (orderType === 'takeaway') setOrderType('dine-in');
              }}
              className={`w-24 px-3 py-2.5 rounded-lg border text-sm text-center font-semibold ${
                orderType === 'takeaway'
                  ? 'border-cafe-100 bg-cafe-100/50 text-cafe-400'
                  : 'border-cafe-200 bg-white text-cafe-900'
              }`}
            />
            <button
              type="button"
              onClick={() => {
                setOrderType('takeaway');
                setTableNumber('');
              }}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold border transition-all ${
                orderType === 'takeaway'
                  ? 'bg-cafe-700 text-white border-cafe-700 shadow-md'
                  : 'bg-white text-cafe-800 border-cafe-200 hover:border-cafe-400'
              }`}
            >
              Take Away
            </button>
            <input
              type="number"
              min="0"
              placeholder="Discount Rs"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="flex-1 min-w-[100px] px-3 py-2 rounded-lg border border-cafe-200 text-sm"
            />
            <input
              placeholder="Kitchen notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex-1 min-w-[100px] px-3 py-2 rounded-lg border border-cafe-200 text-sm"
            />
          </div>
          <div className="space-y-1 text-sm pt-2">
            {discountAmt > 0 && (
              <>
                <div className="flex justify-between text-cafe-600">
                  <span>Food total</span>
                  <span>{money(subtotal, sym)}</span>
                </div>
                <div className="flex justify-between text-sage-600">
                  <span>Discount</span>
                  <span>-{money(discountAmt, sym)}</span>
                </div>
              </>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-cafe-600">
                <span>
                  {settings?.tax_label || 'Tax'} ({settings?.tax_rate || 0}%)
                </span>
                <span>{money(taxAmount, sym)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-cafe-900 pt-2">
              <span>Total</span>
              <span>{money(total, sym)}</span>
            </div>
          </div>
          <p className="text-[11px] text-cafe-500 leading-snug">
            Dine-in: <strong>Send to kitchen</strong> without pay → collect bill after meal. Or{' '}
            <strong>Pay now</strong> for takeaway / walk-in.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              disabled={!cart.length}
              onClick={async () => {
                if (orderType !== 'takeaway' && orderType !== 'delivery' && !tableNumber.trim()) {
                  alert('Enter table number, or tap Take Away');
                  return;
                }
                try {
                  const order = await api.createOrder({
                    items: cart,
                    order_type: orderType,
                    table_number: tableNumber,
                    discount: discountAmt,
                    notes,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    pay_now: false,
                  });
                  setLastOrder(order);
                  clearCart();
                } catch (e) {
                  alert(e.message);
                }
              }}
              className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md disabled:opacity-40"
            >
              Send to kitchen (no pay)
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearCart}
                disabled={!cart.length}
                className="flex-1 py-3 rounded-xl border border-cafe-300 text-cafe-700 font-semibold disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={!cart.length}
                onClick={() => setPayOpen(true)}
                className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-cafe-600 to-cafe-700 text-white font-bold shadow-lg disabled:opacity-40"
              >
                Pay now {money(total, sym)}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {payOpen && (
        <PaymentModal
          total={total}
          sym={sym}
          onClose={() => setPayOpen(false)}
          onConfirm={async (payment_method, amount_paid) => {
            try {
              const order = await api.createOrder({
                items: cart,
                order_type: orderType,
                table_number: tableNumber,
                payment_method,
                amount_paid,
                discount: discountAmt,
                notes,
                customer_name: customerName,
                customer_phone: customerPhone,
                pay_now: true,
              });
              setLastOrder(order);
              clearCart();
              setPayOpen(false);
            } catch (e) {
              alert(e.message);
            }
          }}
        />
      )}

      {lastOrder && (
        <SuccessModal
          order={lastOrder}
          settings={settings}
          onClose={() => setLastOrder(null)}
          onPrint={() => printReceipt(lastOrder, settings)}
        />
      )}
    </div>
  );
}

function PaymentModal({ total, sym, onClose, onConfirm }) {
  const [method, setMethod] = useState('cash');
  const [cash, setCash] = useState(String(Math.ceil(total)));

  const paid = method === 'cash' ? parseFloat(cash) || 0 : total;
  const change = method === 'cash' ? Math.max(0, paid - total) : 0;
  const canPay = method !== 'cash' || paid >= total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cafe-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="font-display text-xl font-bold mb-4">Payment (PKR)</h3>
        <p className="text-3xl font-bold text-cafe-700 mb-6">{money(total, sym)}</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`py-3 rounded-xl font-semibold text-sm ${
                method === m.id ? 'bg-cafe-600 text-white' : 'bg-cafe-100 text-cafe-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {method === 'cash' && (
          <div className="mb-4">
            <label className="text-sm text-cafe-600 block mb-1">Cash received (Rs)</label>
            <input
              type="number"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              className="w-full px-4 py-3 text-xl rounded-xl border border-cafe-200"
            />
            {change > 0 && (
              <p className="mt-2 text-sage-600 font-semibold">Change: {money(change, sym)}</p>
            )}
          </div>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canPay}
            onClick={() => onConfirm(method, paid)}
            className="flex-1 py-3 rounded-xl bg-cafe-600 text-white font-bold disabled:opacity-40"
          >
            Complete sale
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ order, settings, onClose, onPrint }) {
  const unpaid = order.payment_status === 'unpaid';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cafe-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 my-8">
        <div className="no-print text-center mb-4">
          <div
            className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl mb-2 ${
              unpaid ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-600'
            }`}
          >
            {unpaid ? '🍳' : '✓'}
          </div>
          <h3 className="font-display text-xl font-bold">
            {unpaid ? 'Sent to kitchen' : 'Paid & sent'}
          </h3>
          <p className="text-cafe-500 text-sm">{order.order_number}</p>
          <p className="text-xs text-cafe-400 mt-1">
            {unpaid
              ? `Table ${order.table_number || '—'} · Unpaid bill — collect after meal from Orders`
              : 'Payment received · Kitchen ticket created'}
          </p>
        </div>
        <div className="border rounded-xl overflow-hidden mb-4 max-h-64 overflow-y-auto print:border-0 print:max-h-none print:overflow-visible">
          <Receipt order={order} settings={settings} />
        </div>
        <div className="no-print flex gap-3">
          <button type="button" onClick={onPrint} className="flex-1 py-3 rounded-xl border font-semibold">
            Print receipt
          </button>
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-cafe-600 text-white font-bold">
            New order
          </button>
        </div>
      </div>
    </div>
  );
}
