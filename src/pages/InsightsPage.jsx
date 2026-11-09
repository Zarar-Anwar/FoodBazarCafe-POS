import { useEffect, useState } from 'react';
import { api } from '../api';
import { money } from '../utils/format';

export default function InsightsPage({ settings }) {
  const sym = settings?.currency_symbol || 'Rs';
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.itemPerformance(days).then(setData).catch(console.error);
  }, [days]);

  if (!data) {
    return <div className="p-8 text-cafe-500">Loading performance insights…</div>;
  }

  const maxHeat = Math.max(...data.hourlyHeat.map((h) => h.qty), 1);

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full overflow-y-auto h-full scrollbar-thin">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Item timing insights</h1>
          <p className="text-sm text-cafe-500">
            Which items sell at which hours (Pakistan time) — for staffing & prep
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 rounded-xl border border-cafe-200 bg-white"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </header>

      <section className="mb-6 grid sm:grid-cols-2 xl:grid-cols-3 gap-3 w-full">
        {data.recommendations?.map((r, i) => (
          <div
            key={i}
            className="rounded-2xl bg-gradient-to-br from-cafe-600 to-cafe-800 text-white p-4 text-sm shadow-md"
          >
            {r.text}
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-cafe-100 p-4 sm:p-5 mb-6 shadow-sm w-full">
        <h2 className="font-display font-semibold mb-1">Sales by time of day</h2>
        <p className="text-xs text-cafe-400 mb-4">Breakfast · Lunch · Evening · Dinner · Late Night</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {data.daypartTotals.map((d) => (
            <div key={d.daypart} className="rounded-xl bg-cafe-50 p-4 text-center">
              <p className="text-xs text-cafe-500 font-medium">{d.daypart}</p>
              <p className="text-lg font-bold text-cafe-800 mt-1">{money(d.sales, sym)}</p>
              <p className="text-xs text-cafe-400">{d.qty} items sold</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-cafe-100 p-4 sm:p-5 mb-6 shadow-sm w-full">
        <h2 className="font-display font-semibold mb-4">Hourly demand (PKT)</h2>
        <div className="flex items-end gap-0.5 sm:gap-1 h-28 sm:h-36 w-full">
          {data.hourlyHeat.map((h) => (
            <div
              key={h.hour}
              className="flex-1 flex flex-col items-center gap-1 group min-w-0"
              title={`${h.label}: ${h.qty} items`}
            >
              <div
                className="w-full rounded-t bg-cafe-500/80 group-hover:bg-cafe-600 transition-all min-h-[2px]"
                style={{ height: `${Math.max(4, (h.qty / maxHeat) * 100)}%` }}
              />
              {h.hour % 3 === 0 && (
                <span className="text-[8px] sm:text-[9px] text-cafe-400">{h.hour}</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-cafe-400 mt-2">Hours 0–23 · Pakistan Standard Time</p>
      </section>

      <section className="bg-white rounded-2xl border border-cafe-100 shadow-sm overflow-hidden w-full">
        <div className="px-5 py-4 border-b border-cafe-100">
          <h2 className="font-display font-semibold">Item performance by peak time</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-cafe-500 border-b bg-cafe-50/50">
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Sold</th>
                <th className="px-5 py-3 font-medium">Sales</th>
                <th className="px-5 py-3 font-medium">Peak hour</th>
                <th className="px-5 py-3 font-medium">Peak period</th>
                <th className="px-5 py-3 font-medium">Tip</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.product_name} className="border-b border-cafe-50 hover:bg-cafe-50/40">
                  <td className="px-5 py-3 font-medium">{item.product_name}</td>
                  <td className="px-5 py-3">{item.total_qty}</td>
                  <td className="px-5 py-3">{money(item.total_sales, sym)}</td>
                  <td className="px-5 py-3 text-cafe-700 font-semibold">
                    {item.peak_hour_label || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-1 rounded-full bg-cafe-100 text-cafe-800 text-xs">
                      {item.peak_daypart || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-cafe-500 max-w-xs">{item.tip}</td>
                </tr>
              ))}
              {!data.items.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-cafe-400">
                    No sales yet — complete orders on POS to see which items peak when.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
