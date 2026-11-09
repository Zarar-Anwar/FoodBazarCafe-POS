const BASE = '/api';
const TOKEN_KEY = 'fbc_pos_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.includes('/auth/login')) {
    setToken(null);
    window.dispatchEvent(new Event('fbc-auth-lost'));
  }
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  login: (username, pin) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, pin }),
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  settings: () => request('/settings'),
  updateSettings: (body) =>
    request('/settings', { method: 'PATCH', body: JSON.stringify(body) }),

  users: () => request('/users'),
  createUser: (body) =>
    request('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) =>
    request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  categories: () => request('/categories'),
  createCategory: (body) =>
    request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id, body) =>
    request(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  products: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/products${q ? `?${q}` : ''}`);
  },
  createProduct: (body) =>
    request('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) =>
    request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  deals: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/deals${q ? `?${q}` : ''}`);
  },
  createDeal: (body) =>
    request('/deals', { method: 'POST', body: JSON.stringify(body) }),
  updateDeal: (id, body) =>
    request(`/deals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteDeal: (id) => request(`/deals/${id}`, { method: 'DELETE' }),

  orders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/orders${q ? `?${q}` : ''}`);
  },
  order: (id) => request(`/orders/${id}`),
  createOrder: (body) =>
    request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  payOrder: (id, body) =>
    request(`/orders/${id}/pay`, { method: 'POST', body: JSON.stringify(body) }),
  updateOrderStatus: (id, status) =>
    request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  voidOrder: (id) => request(`/orders/${id}/void`, { method: 'POST' }),

  dashboardToday: (date) =>
    request(`/dashboard/today${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  itemPerformance: (days = 30) =>
    request(`/insights/item-performance?days=${days}`),

  stock: () => request('/stock'),
  stockLow: () => request('/stock/low'),
  stockMovements: () => request('/stock/movements'),
  adjustStock: (body) =>
    request('/stock/adjust', { method: 'POST', body: JSON.stringify(body) }),
  previewStock: (items) =>
    request('/stock/preview', { method: 'POST', body: JSON.stringify({ items }) }),
  syncStockRecipes: () => request('/stock/sync-recipes', { method: 'POST' }),
};
