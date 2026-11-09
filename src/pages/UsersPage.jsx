import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatTime } from '../utils/format';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);

  const load = () => api.users().then(setUsers);

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (form.id) {
      await api.updateUser(form.id, form);
    } else {
      await api.createUser(form);
    }
    setForm(null);
    load();
  };

  return (
    <div className="p-4 sm:p-6 w-full overflow-y-auto h-full">
      <header className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Staff accounts</h1>
          <p className="text-sm text-cafe-500">PIN login · roles control access</p>
        </div>
        <button
          type="button"
          onClick={() =>
            setForm({ username: '', display_name: '', role: 'cashier', pin: '' })
          }
          className="px-4 py-2 rounded-xl bg-cafe-600 text-white font-semibold"
        >
          + Add staff
        </button>
      </header>

      <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {users.map((u) => (
          <li
            key={u.id}
            className="bg-white border border-cafe-100 rounded-xl p-4 flex justify-between gap-3"
          >
            <div>
              <p className="font-semibold">{u.display_name}</p>
              <p className="text-sm text-cafe-500">
                @{u.username} · <span className="capitalize">{u.role}</span>
                {!u.is_active && ' · Inactive'}
              </p>
              {u.last_login_at && (
                <p className="text-xs text-cafe-400 mt-1">Last login {formatTime(u.last_login_at)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({
                  id: u.id,
                  display_name: u.display_name,
                  role: u.role,
                  is_active: !!u.is_active,
                  pin: '',
                })
              }
              className="text-cafe-600 text-sm hover:underline"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cafe-950/50">
          <form onSubmit={save} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3 shadow-xl">
            <h3 className="font-bold text-lg">{form.id ? 'Edit staff' : 'New staff'}</h3>
            {!form.id && (
              <input
                required
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border"
              />
            )}
            <input
              required
              placeholder="Display name"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
              <option value="kitchen">Kitchen</option>
            </select>
            <input
              type="password"
              inputMode="numeric"
              placeholder={form.id ? 'New PIN (optional)' : 'PIN (4+ digits)'}
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
              className="w-full px-4 py-2 rounded-xl border"
              required={!form.id}
            />
            {form.id && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Active
              </label>
            )}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setForm(null)} className="flex-1 py-2 border rounded-xl">
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
