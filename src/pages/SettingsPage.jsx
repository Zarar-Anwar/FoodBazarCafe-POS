import { useEffect, useState } from 'react';
import { api } from '../api';

export default function SettingsPage({ settings, onSaved }) {
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm({ ...settings });
  }, [settings]);

  const submit = async (e) => {
    e.preventDefault();
    await api.updateSettings(form);
    onSaved?.();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fields = [
    { key: 'restaurant_name', label: 'Restaurant name' },
    { key: 'tagline', label: 'Tagline' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'phone', label: 'Phone' },
    { key: 'currency_symbol', label: 'Currency symbol (Rs)' },
    { key: 'currency_code', label: 'Currency code' },
    { key: 'tax_label', label: 'Tax label (leave Tax; rate 0 = no tax)' },
    { key: 'tax_rate', label: 'Tax rate % (0 = food price only)', type: 'number' },
    { key: 'order_prefix', label: 'Order number prefix' },
    { key: 'country', label: 'Country' },
    { key: 'timezone', label: 'Timezone' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full overflow-y-auto h-full">
      <h1 className="font-display text-2xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-cafe-500 mb-6">
        Pakistan defaults: Rs / PKR, Asia/Karachi. Tax rate 0 = food price only (no GST).
      </p>
      <form
        onSubmit={submit}
        className="grid sm:grid-cols-2 gap-4 bg-white rounded-2xl border border-cafe-100 p-4 sm:p-6 shadow-sm w-full"
      >
        {fields.map(({ key, label, type = 'text' }) => (
          <label key={key} className="block">
            <span className="text-sm font-medium text-cafe-700">{label}</span>
            <input
              type={type}
              value={form[key] ?? ''}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="mt-1 w-full px-4 py-2.5 rounded-xl border border-cafe-200 focus:ring-2 focus:ring-cafe-400 outline-none"
            />
          </label>
        ))}
        <button
          type="submit"
          className="sm:col-span-2 w-full py-3 rounded-xl bg-cafe-600 text-white font-bold mt-2"
        >
          {saved ? 'Saved ✓' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
