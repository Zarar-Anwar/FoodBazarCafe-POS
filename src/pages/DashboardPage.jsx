import { useEffect, useState } from 'react';
import { api } from '../api';
import { money, pkToday } from '../utils/format';

export default function DashboardPage({ settings }) {
  const sym = settings?.currency_symbol || 'Rs';
  const [date, setDate] = useState(() => pkToday());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .dashboardToday(date)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Auto-refresh only when viewing today
    const isToday = date === pkToday();
    if (!isToday) return () => {
      cancelled = true;
    };

    const t = setInterval(() => {
      api.dashboardToday(date).then((d) => {
        if (!cancelled) setData(d);
      });
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [date]);

  if (loading && !data) {
    return <div className="p-8 text-cafe-500">Loading stats…</div>;
  }

  if (!data) {
    return <div className="p-8 text-cafe-500">Could not load dashboard</div>;
  }

  const maxHour = Math.max(...(data.hourly?.map((h) => h.revenue) || [1]), 1);
  const isToday = data.is_today ?? date === pkToday();

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full overflow-y-auto h-full scrollbar-thin">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cafe-900">
            {isToday ? "Today's dashboard" : 'Daily dashboard'}
          </h1>
          <p className="text-cafe-500 text-sm">
            {data.date} · Asia/Karachi · PKR
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-cafe-600 font-medium" htmlFor="dash-date">
            Date
          </label>
          <input
            id="dash-date"
            type="date"
            value={date}
            max={pkToday()}
            onChange={(e) => setDate(e.target.value || pkToday())}
            className="px-3 py-2 rounded-xl border border-cafe-200 bg-white text-sm font-medium shadow-sm"
          />
          {!isToday && (
            <button
              type="button"
              onClick={() => setDate(pkToday())}
              className="px-3 py-2 rounded-xl bg-cafe-700 text-white text-sm font-semibold"
            >
              Today
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <StatCard label="Paid revenue" value={money(data.revenue, sym)} accent />
        <StatCard label="Unpaid bills" value={money(data.unpaid_total || 0, sym)} warn />
        <StatCard label="Orders" value={String(data.order_count - (data.void_count || 0))} />
        <StatCard label="In kitchen" value={String(data.active_kitchen || 0)} />
        <StatCard label="Voided" value={String(data.void_count || 0)} />
      </div>

      <section className="bg-white rounded-2xl border border-cafe-100 p-4 sm:p-6 shadow-sm mb-6 w-full">
        <h2 className="font-display font-semibold mb-4">Hourly paid sales (PKT)</h2>
        {data.hourly?.length ? (
          <div className="flex items-end gap-1 sm:gap-2 h-32 sm:h-40 w-full">
            {data.hourly.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-cafe-500 truncate max-w-full">
                  {money(h.revenue, sym)}
                </span>
                <div
                  className="w-full rounded-t bg-cafe-500 min-h-[4px]"
                  style={{ height: `${(h.revenue / maxHour) * 100}%` }}
                />
                <span className="text-[9px] sm:text-[10px] text-cafe-400">{h.hour}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-cafe-400 text-sm">No paid sales for this date</p>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 w-full">
        <section className="bg-white rounded-2xl border border-cafe-100 p-6 shadow-sm">
          <h2 className="font-display font-semibold mb-4">Payment breakdown</h2>
          {data.byPayment?.length ? (
            <ul className="space-y-3">
              {data.byPayment.map((row) => (
                <li key={row.payment_method} className="flex justify-between items-center">
                  <span className="capitalize font-medium text-cafe-800">
                    {row.payment_method}
                  </span>
                  <span className="text-cafe-600">
                    {row.count} · {money(row.total, sym)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-cafe-400 text-sm">No paid sales for this date</p>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-cafe-100 p-6 shadow-sm">
          <h2 className="font-display font-semibold mb-4">Top items</h2>
          {data.topItems?.length ? (
            <ul className="space-y-3">
              {data.topItems.map((row) => (
                <li key={row.product_name} className="flex justify-between gap-2">
                  <span className="truncate font-medium">{row.product_name}</span>
                  <span className="text-cafe-600 shrink-0">
                    ×{row.qty} · {money(row.sales, sym)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-cafe-400 text-sm">No items sold for this date</p>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, warn }) {
  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 ${
        accent
          ? 'bg-gradient-to-br from-cafe-600 to-cafe-800 text-white shadow-lg'
          : warn
            ? 'bg-amber-50 border border-amber-200 shadow-sm'
            : 'bg-white border border-cafe-100 shadow-sm'
      }`}
    >
      <p
        className={`text-xs sm:text-sm ${
          accent ? 'text-cafe-200' : warn ? 'text-amber-700' : 'text-cafe-500'
        }`}
      >
        {label}
      </p>
      <p
        className={`text-xl sm:text-2xl font-display font-bold mt-1 truncate ${
          accent ? '' : warn ? 'text-amber-900' : 'text-cafe-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
