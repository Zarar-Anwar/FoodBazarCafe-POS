import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { formatTime, ORDER_STATUSES } from '../utils/format';

const COLUMNS = ['queued', 'preparing', 'ready'];

export default function KitchenPage({ settings }) {
  const [orders, setOrders] = useState([]);

  const load = useCallback(() => {
    api.orders({ kitchen: '1', limit: 80 }).then(setOrders).catch(console.error);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const move = async (id, status) => {
    await api.updateOrderStatus(id, status);
    load();
  };

  return (
    <div className="p-4 lg:p-6 h-full overflow-hidden flex flex-col">
      <header className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Kitchen display</h1>
          <p className="text-sm text-cafe-500">
            {settings?.restaurant_name} · Auto-refreshes every 5s
          </p>
        </div>
        <button type="button" onClick={load} className="px-4 py-2 rounded-xl border border-cafe-200 bg-white">
          Refresh
        </button>
      </header>
      <div className="flex-1 grid md:grid-cols-3 gap-4 min-h-0">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col);
          return (
            <section key={col} className="bg-cafe-100/60 rounded-2xl p-3 flex flex-col min-h-0">
              <h2 className="font-semibold px-2 py-2 flex justify-between">
                <span className={`px-2 py-1 rounded-full text-sm ${ORDER_STATUSES[col].color}`}>
                  {ORDER_STATUSES[col].label}
                </span>
                <span className="text-cafe-500">{list.length}</span>
              </h2>
              <ul className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
                {list.map((o) => (
                  <li key={o.id} className="bg-white rounded-xl p-4 shadow-sm border border-cafe-100">
                    <div className="flex justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold">{o.order_number.split('-').pop()}</p>
                        {o.payment_status === 'unpaid' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                            Unpaid
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-cafe-500 capitalize text-right">
                        {o.order_type}
                        {o.table_number ? ` · T${o.table_number}` : ''}
                      </p>
                    </div>
                    <p className="text-xs text-cafe-400 mb-2">{formatTime(o.created_at)}</p>
                    <ul className="text-sm space-y-1 mb-3">
                      {o.items?.map((i) => (
                        <li key={i.id} className="flex justify-between">
                          <span>{i.product_name}</span>
                          <span className="font-bold">×{i.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    {o.notes && <p className="text-xs text-amber-700 mb-2">Note: {o.notes}</p>}
                    <div className="flex gap-2">
                      {col === 'queued' && (
                        <button
                          type="button"
                          onClick={() => move(o.id, 'preparing')}
                          className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
                        >
                          Start
                        </button>
                      )}
                      {col === 'preparing' && (
                        <button
                          type="button"
                          onClick={() => move(o.id, 'ready')}
                          className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold"
                        >
                          Ready
                        </button>
                      )}
                      {col === 'ready' && (
                        <button
                          type="button"
                          onClick={() => move(o.id, 'completed')}
                          className="flex-1 py-2 rounded-lg bg-cafe-700 text-white text-sm font-semibold"
                        >
                          Served
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                {!list.length && (
                  <li className="text-center text-cafe-400 py-10 text-sm">No tickets</li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
