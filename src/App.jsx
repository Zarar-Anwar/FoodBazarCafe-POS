import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from './api';
import { useAuth } from './auth';
import { formatClock } from './utils/format';
import LoginPage from './pages/LoginPage';
import PosPage from './pages/PosPage';
import MenuPage from './pages/MenuPage';
import OrdersPage from './pages/OrdersPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import KitchenPage from './pages/KitchenPage';
import InsightsPage from './pages/InsightsPage';
import StockPage from './pages/StockPage';
import UsersPage from './pages/UsersPage';

const nav = [
  { to: '/', label: 'POS', icon: PosIcon, feature: 'pos' },
  { to: '/kitchen', label: 'Kitchen', icon: KitchenIcon, feature: 'kitchen' },
  { to: '/orders', label: 'Orders', icon: OrdersIcon, feature: 'orders' },
  { to: '/menu', label: 'Menu', icon: MenuIcon, feature: 'menu' },
  { to: '/stock', label: 'Stock', icon: StockIcon, feature: 'stock' },
  { to: '/dashboard', label: 'Dashboard', icon: ChartIcon, feature: 'dashboard' },
  { to: '/insights', label: 'Insights', icon: InsightIcon, feature: 'insights' },
  { to: '/users', label: 'Staff', icon: UsersIcon, feature: 'users' },
  { to: '/settings', label: 'Settings', icon: GearIcon, feature: 'settings' },
];

export default function App() {
  const { user, loading, logout, can } = useAuth();
  const [settings, setSettings] = useState(null);
  const [clock, setClock] = useState(formatClock());
  const location = useLocation();

  useEffect(() => {
    const t = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    api.settings().then(setSettings).catch(console.error);
  }, [user, location.pathname]);

  const refreshSettings = () => api.settings().then(setSettings);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-50 text-cafe-600">
        Loading Food Bazar Cafe…
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const links = nav.filter((n) => can(n.feature));
  const home = links[0]?.to || '/';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="lg:w-64 shrink-0 bg-cafe-950 text-cafe-100 flex lg:flex-col">
        <div className="px-5 py-5 border-b border-cafe-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cafe-400 to-cafe-600 flex items-center justify-center shadow-lg">
              <CupIcon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-lg leading-tight text-white truncate">
                {settings?.restaurant_name || 'Food Bazar Cafe'}
              </h1>
              <p className="text-xs text-cafe-400">PKR · Karachi time</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-cafe-500 font-mono leading-snug">{clock}</p>
        </div>
        <nav className="flex-1 flex lg:flex-col overflow-x-auto p-2 lg:p-4 gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-cafe-600 text-white shadow-md'
                    : 'text-cafe-300 hover:bg-cafe-900 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-cafe-800 space-y-2">
          <p className="text-sm text-white font-medium truncate">{user.display_name}</p>
          <p className="text-xs text-cafe-400 capitalize">{user.role}</p>
          <button
            type="button"
            onClick={logout}
            className="w-full mt-1 py-2 rounded-lg bg-cafe-900 text-cafe-200 text-sm hover:bg-cafe-800"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden w-full">
        <Routes>
          <Route path="/" element={can('pos') ? <PosPage settings={settings} /> : <Navigate to={home} />} />
          <Route path="/kitchen" element={can('kitchen') ? <KitchenPage settings={settings} /> : <Navigate to={home} />} />
          <Route path="/orders" element={can('orders') ? <OrdersPage settings={settings} /> : <Navigate to={home} />} />
          <Route path="/menu" element={can('menu') ? <MenuPage /> : <Navigate to={home} />} />
          <Route path="/stock" element={can('stock') ? <StockPage /> : <Navigate to={home} />} />
          <Route path="/dashboard" element={can('dashboard') ? <DashboardPage settings={settings} /> : <Navigate to={home} />} />
          <Route path="/insights" element={can('insights') ? <InsightsPage settings={settings} /> : <Navigate to={home} />} />
          <Route path="/users" element={can('users') ? <UsersPage /> : <Navigate to={home} />} />
          <Route
            path="/settings"
            element={
              can('settings') ? (
                <SettingsPage settings={settings} onSaved={refreshSettings} />
              ) : (
                <Navigate to={home} />
              )
            }
          />
          <Route path="*" element={<Navigate to={home} />} />
        </Routes>
      </main>
    </div>
  );
}

function CupIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 3v2m-5 4h10l-1 10a2 2 0 01-2 2H10a2 2 0 01-2-2L7 9z" />
    </svg>
  );
}
function PosIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}
function OrdersIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
function MenuIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function ChartIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function GearIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function KitchenIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.5 0-4 2-4 4v8h8v-8c0-2-1.5-4-4-4zM6 20h12M9 4h6" />
    </svg>
  );
}
function InsightIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
function StockIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
function UsersIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M13 7a4 4 0 11-8 0 4 4 0 018 0zm10 13v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
