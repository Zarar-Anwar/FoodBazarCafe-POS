import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import {
  money,
  formatTime,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
} from '../utils/format';
import Receipt from '../components/Receipt';
import { printReceipt } from '../utils/printReceipt';

export default function OrdersPage({ settings }) {
  const sym = settings?.currency_symbol || 'Rs';
  const { can } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all'); // all | unpaid
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
  );
  const [payOrder, setPayOrder] = useState(null);

  const load = () => {
    const params = { date, limit: 200 };
    if (filter === 'unpaid') params.unpaid = '1';
    return api.orders(params).then(setOrders).catch(console.error);
  };

  useEffect(() => {
    load();
  }, [date, filter]);

  const canVoid = can('insights') || can('users') || can('menu');

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 w-full">
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-thin min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Orders & bills</h1>
            <p className="text-sm text-cafe-500">
              Unpaid = kitchen ticket · Pay here after customer finishes
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex rounded-xl border border-cafe-200 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium ${
                  filter === 'all' ? 'bg-cafe-600 text-white' : 'text-cafe-700'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter('unpaid')}
                className={`px-4 py-2 text-sm font-medium ${
                  filter === 'unpaid' ? 'bg-amber-600 text-white' : 'text-cafe-700'
                }`}
              >
                Unpaid bills
              </button>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-4 py-2 rounded-xl border border-cafe-200 bg-white"
            />
          </div>
        </header>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {orders.map((o) => {
            const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.completed;
            const pay = PAYMENT_STATUSES[o.payment_status] || PAYMENT_STATUSES.paid;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelected(o)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selected?.id === o.id
                    ? 'border-cafe-500 bg-cafe-50 shadow-md'
                    : o.payment_status === 'unpaid'
                      ? 'border-amber-200 bg-amber-50/50 hover:border-amber-400'
                      : 'border-cafe-100 bg-white hover:border-cafe-300'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-semibold">{o.order_number}</p>
                    <p className="text-xs text-cafe-500">{formatTime(o.created_at)}</p>
                    {o.table_number && (
                      <p className="text-sm font-bold text-cafe-800 mt-1">Table {o.table_number}</p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold text-cafe-700">{money(o.total, sym)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pay.color}`}>
                      {pay.label}
                    </span>
                    <br />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-cafe-500 mt-2 capitalize">
                  {o.order_type} · {o.payment_method} · {o.items?.length || 0} items
                </p>
              </button>
            );
          })}
          {!orders.length && (
            <p className="col-span-full text-center text-cafe-400 py-16">
              {filter === 'unpaid' ? 'No unpaid bills' : 'No orders for this date'}
            </p>
          )}
        </div>
      </div>

      {selected && (
        <aside className="lg:w-[420px] xl:w-[460px] shrink-0 border-t lg:border-t-0 lg:border-l border-cafe-200 bg-white p-5 flex flex-col max-h-[50vh] lg:max-h-none">
          <div className="no-print flex justify-between items-start mb-4">
            <h2 className="font-display font-bold">Order detail</h2>
            <button type="button" onClick={() => setSelected(null)} className="text-cafe-500">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 print:overflow-visible">
            <Receipt order={selected} settings={settings} />
          </div>
          <div className="no-print flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {selected.payment_status === 'unpaid' && selected.status !== 'void' && (
              <button
                type="button"
                onClick={() => setPayOrder(selected)}
                className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold"
              >
                Collect payment {money(selected.total, sym)}
              </button>
            )}
            <button
              type="button"
              onClick={() => printReceipt(selected, settings)}
              className="flex-1 py-2 rounded-xl border font-medium"
            >
              Print
            </button>
            {selected.status !== 'completed' && selected.status !== 'void' && (
              <button
                type="button"
                onClick={async () => {
                  await api.updateOrderStatus(selected.id, 'completed');
                  load();
                  setSelected(null);
                }}
                className="flex-1 py-2 rounded-xl bg-cafe-600 text-white font-medium"
              >
                Mark served
              </button>
            )}
            {canVoid && selected.status !== 'void' && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Void this order?')) {
                    await api.voidOrder(selected.id);
                    load();
                    setSelected(null);
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-red-50 text-red-700 font-medium"
              >
                Void
              </button>
            )}
          </div>
        </aside>
      )}

      {payOrder && (
        <CollectPaymentModal
          order={payOrder}
          sym={sym}
          onClose={() => setPayOrder(null)}
          onPaid={async (payment_method, amount_paid) => {
            try {
              const updated = await api.payOrder(payOrder.id, {
                payment_method,
                amount_paid,
              });
              setPayOrder(null);
              setSelected(updated);
              load();
            } catch (e) {
              alert(e.message);
            }
          }}
        />
      )}
    </div>
  );
}

function CollectPaymentModal({ order, sym, onClose, onPaid }) {
  const [method, setMethod] = useState('cash');
  const [cash, setCash] = useState(String(Math.ceil(order.total)));
  const paid = method === 'cash' ? parseFloat(cash) || 0 : order.total;
  const change = method === 'cash' ? Math.max(0, paid - order.total) : 0;
  const canPay = method !== 'cash' || paid >= order.total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cafe-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="font-display text-xl font-bold mb-1">Collect bill</h3>
        <p className="text-sm text-cafe-500 mb-4">
          {order.order_number}
          {order.table_number ? ` · Table ${order.table_number}` : ''}
        </p>
        <p className="text-3xl font-bold text-cafe-700 mb-6">{money(order.total, sym)}</p>
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
              className="w-full px-4 py-3 text-xl rounded-xl border"
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
            onClick={() => onPaid(method, paid)}
            className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold disabled:opacity-40"
          >
            Confirm paid
          </button>
        </div>
      </div>
    </div>
  );
}
