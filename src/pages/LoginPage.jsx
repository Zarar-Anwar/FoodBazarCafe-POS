import { useState } from 'react';
import { useAuth } from '../auth';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('cashier');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), pin);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const quick = (u, p) => {
    setUsername(u);
    setPin(p);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cafe-950 via-cafe-900 to-cafe-800 p-4">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cafe-400 via-transparent to-transparent" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-cafe-600 to-cafe-700 px-8 py-8 text-white text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/15 flex items-center justify-center text-3xl">
            ☕
          </div>
          <h1 className="font-display text-2xl font-bold">Food Bazar Cafe</h1>
          <p className="text-cafe-100 text-sm mt-1">Staff login · Pakistan POS</p>
        </div>
        <form onSubmit={submit} className="p-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-cafe-700">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-cafe-200 focus:ring-2 focus:ring-cafe-400 outline-none"
              autoComplete="username"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-cafe-700">PIN</span>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-cafe-200 text-2xl tracking-[0.4em] text-center focus:ring-2 focus:ring-cafe-400 outline-none"
              placeholder="••••"
              required
            />
          </label>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-cafe-600 text-white font-bold text-lg hover:bg-cafe-500 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Enter POS'}
          </button>
          <div className="pt-2 border-t border-cafe-100">
            <p className="text-xs text-cafe-400 mb-2 text-center">Demo staff (tap to fill)</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['admin', '1234', 'Admin'],
                ['manager', '2222', 'Manager'],
                ['cashier', '1111', 'Cashier'],
                ['kitchen', '3333', 'Kitchen'],
              ].map(([u, p, label]) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => quick(u, p)}
                  className="py-2 rounded-lg bg-cafe-50 text-cafe-700 hover:bg-cafe-100"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
