import { useEffect, useState } from 'react';
import { api } from '../api';

export default function StockPage() {
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [tab, setTab] = useState('stock');
  const [adjust, setAdjust] = useState(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [stock, moves] = await Promise.all([
      api.stock(),
      api.stockMovements().catch(() => []),
    ]);
    setItems(stock);
    setMovements(moves);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const saveAdjust = async (e) => {
    e.preventDefault();
    try {
      await api.adjustStock({
        stock_item_id: adjust.id,
        set_quantity: adjust.set_quantity,
        note: adjust.note || '',
      });
      setAdjust(null);
      setMsg('Stock updated');
      load();
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      alert(err.message);
    }
  };

  const lowCount = items.filter((i) => i.is_low).length;

  return (
    <div className="p-4 sm:p-6 w-full overflow-y-auto h-full scrollbar-thin">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Stock management</h1>
          <p className="text-sm text-cafe-500 max-w-2xl">
            Tracks kitchen portions used by your menu: roti/paratha, buns, chicken, beef,
            wings, fries, pizza dough, rice, steam chicken, etc. Stock drops automatically
            when an order is placed; void restores it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              await api.syncStockRecipes();
              setMsg('Recipes synced with menu');
              load();
            }}
            className="px-4 py-2 rounded-xl border border-cafe-200 bg-white text-sm font-medium"
          >
            Sync menu recipes
          </button>
        </div>
      </header>

      {msg && (
        <p className="mb-4 text-sm bg-green-50 text-green-800 border border-green-200 rounded-xl px-4 py-2">
          {msg}
        </p>
      )}

      {lowCount > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-sm">
          <strong>{lowCount}</strong> item(s) at or below low-stock alert — restock soon.
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab('stock')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold ${
            tab === 'stock' ? 'bg-cafe-600 text-white' : 'bg-white border border-cafe-200'
          }`}
        >
          Current stock
        </button>
        <button
          type="button"
          onClick={() => setTab('moves')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold ${
            tab === 'moves' ? 'bg-cafe-600 text-white' : 'bg-white border border-cafe-200'
          }`}
        >
          Movements
        </button>
      </div>

      {tab === 'stock' && (
        <div className="bg-white rounded-2xl border border-cafe-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-cafe-500 border-b bg-cafe-50/60">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">On hand</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Low alert</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-cafe-50 ${
                    item.is_low ? 'bg-amber-50/70' : 'hover:bg-cafe-50/40'
                  }`}
                >
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-lg font-bold text-cafe-800">{item.quantity}</td>
                  <td className="px-4 py-3 text-cafe-500">{item.unit}</td>
                  <td className="px-4 py-3">{item.low_alert}</td>
                  <td className="px-4 py-3">
                    {item.is_low ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-200 text-amber-900">
                        Low
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setAdjust({
                          id: item.id,
                          name: item.name,
                          set_quantity: String(item.quantity),
                          note: '',
                        })
                      }
                      className="text-cafe-600 hover:underline font-medium"
                    >
                      Restock / edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'moves' && (
        <div className="bg-white rounded-2xl border border-cafe-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-cafe-500 border-b bg-cafe-50/60">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Change</th>
                <th className="px-4 py-3 font-medium">After</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-cafe-50">
                  <td className="px-4 py-2 text-cafe-500 whitespace-nowrap">{m.created_at}</td>
                  <td className="px-4 py-2 font-medium">{m.stock_name}</td>
                  <td
                    className={`px-4 py-2 font-semibold ${
                      m.delta >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {m.delta > 0 ? '+' : ''}
                    {m.delta} {m.unit}
                  </td>
                  <td className="px-4 py-2">{m.quantity_after}</td>
                  <td className="px-4 py-2 capitalize">{m.reason.replace('_', ' ')}</td>
                  <td className="px-4 py-2 text-cafe-500">{m.note || '—'}</td>
                </tr>
              ))}
              {!movements.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-cafe-400">
                    No movements yet — place an order to see auto deductions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <section className="mt-8 bg-cafe-50 rounded-2xl border border-cafe-100 p-5 text-sm text-cafe-700 space-y-2">
        <h2 className="font-display font-semibold text-cafe-900">What we track (from your menu)</h2>
        <ul className="grid sm:grid-cols-2 gap-1 list-disc list-inside">
          <li>Paratha / Roti — rolls (set qty 2 for double roti via restock logic / recipe)</li>
          <li>Burger buns, wraps, panini bread</li>
          <li>Chicken &amp; beef portions, wings, nuggets</li>
          <li>Fries portions, cheese, eggs</li>
          <li>Soup bowls, pasta, rice</li>
          <li>Pizza dough S / M / L</li>
          <li>Steam chicken half &amp; full</li>
        </ul>
        <p className="text-cafe-500 pt-1">
          Tip: For <strong>double roti</strong> on a roll, either sell qty 2 of that roll, or ask
          admin to raise the paratha recipe qty to 2 for that product under menu sync after
          customizing recipes in code.
        </p>
      </section>

      {adjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cafe-950/50">
          <form
            onSubmit={saveAdjust}
            className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3 shadow-xl"
          >
            <h3 className="font-bold text-lg">Update stock</h3>
            <p className="text-sm text-cafe-600">{adjust.name}</p>
            <label className="block text-sm">
              New quantity on hand
              <input
                type="number"
                step="0.5"
                required
                value={adjust.set_quantity}
                onChange={(e) => setAdjust({ ...adjust, set_quantity: e.target.value })}
                className="mt-1 w-full px-4 py-2 rounded-xl border"
              />
            </label>
            <input
              placeholder="Note (optional) e.g. morning delivery"
              value={adjust.note}
              onChange={(e) => setAdjust({ ...adjust, note: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border"
            />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setAdjust(null)} className="flex-1 py-2 border rounded-xl">
                Cancel
              </button>
              <button type="submit" className="flex-1 py-2 bg-cafe-600 text-white rounded-xl font-semibold">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
