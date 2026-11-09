import { useEffect, useState } from 'react';
import { api } from '../api';
import { money } from '../utils/format';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [form, setForm] = useState(null);
  const [dealForm, setDealForm] = useState(null);
  const [catName, setCatName] = useState('');

  const load = async () => {
    const [categories, products, deals] = await Promise.all([
      api.categories(),
      api.products(),
      api.deals(),
    ]);
    setCategories(categories);
    setProducts(products);
    setDeals(deals);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const saveProduct = async (e) => {
    e.preventDefault();
    const body = {
      category_id: Number(form.category_id),
      name: form.name,
      description: form.description,
      price: Number(form.price),
      is_available: form.is_available ? 1 : 0,
    };
    if (form.id) await api.updateProduct(form.id, body);
    else await api.createProduct(body);
    setForm(null);
    load();
  };

  const saveDeal = async (e) => {
    e.preventDefault();
    const items = (dealForm.items || []).filter((it) => it.selected);
    if (!items.length) {
      alert('Select at least one menu item for this deal');
      return;
    }
    const body = {
      name: dealForm.name,
      description: dealForm.description || '',
      price: Number(dealForm.price),
      is_available: dealForm.is_available ? 1 : 0,
      items: items.map((it) => ({
        product_id: it.product_id,
        quantity: Math.max(1, Number(it.quantity) || 1),
      })),
    };
    try {
      if (dealForm.id) await api.updateDeal(dealForm.id, body);
      else await api.createDeal(body);
      setDealForm(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const openNewDeal = () => {
    setDealForm({
      name: '',
      description: '',
      price: '',
      is_available: true,
      items: products.map((p) => ({
        product_id: p.id,
        product_name: p.name,
        selected: false,
        quantity: 1,
      })),
    });
  };

  const openEditDeal = (deal) => {
    const selected = new Map(
      (deal.items || []).map((it) => [it.product_id, it.quantity])
    );
    setDealForm({
      id: deal.id,
      name: deal.name,
      description: deal.description || '',
      price: deal.price,
      is_available: !!deal.is_available,
      items: products.map((p) => ({
        product_id: p.id,
        product_name: p.name,
        selected: selected.has(p.id),
        quantity: selected.get(p.id) || 1,
      })),
    });
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    await api.createCategory({ name: catName, sort_order: categories.length });
    setCatName('');
    load();
  };

  return (
    <div className="p-4 sm:p-6 w-full overflow-y-auto h-full scrollbar-thin">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-cafe-900">Menu management</h1>
          <p className="text-cafe-500 text-sm">Categories, items, and deals</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openNewDeal}
            className="px-5 py-2.5 rounded-xl border-2 border-cafe-600 text-cafe-800 font-semibold"
          >
            + Add deal
          </button>
          <button
            type="button"
            onClick={() =>
              setForm({
                category_id: categories[0]?.id || '',
                name: '',
                description: '',
                price: '',
                is_available: true,
              })
            }
            className="px-5 py-2.5 rounded-xl bg-cafe-600 text-white font-semibold shadow-md"
          >
            + Add item
          </button>
        </div>
      </header>

      <form onSubmit={addCategory} className="flex gap-2 mb-8">
        <input
          value={catName}
          onChange={(e) => setCatName(e.target.value)}
          placeholder="New category name"
          className="flex-1 max-w-xs px-4 py-2 rounded-xl border border-cafe-200"
        />
        <button type="submit" className="px-4 py-2 rounded-xl border border-cafe-300 font-medium">
          Add category
        </button>
      </form>

      {/* Deals */}
      <section className="bg-white rounded-2xl border border-cafe-100 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-cafe-900">Deals</h2>
          <span className="text-xs text-cafe-500">{deals.length} deal(s)</span>
        </div>
        <div className="divide-y divide-cafe-50">
          {deals.map((d) => (
            <div key={d.id} className="px-5 py-4 flex flex-wrap gap-3 items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-cafe-900">{d.name}</p>
                <p className="text-sm text-cafe-600 mt-0.5">
                  {(d.items || []).map((it) => `${it.product_name} ×${it.quantity}`).join(' · ') ||
                    'No items'}
                </p>
                {d.description ? (
                  <p className="text-xs text-cafe-400 mt-1">{d.description}</p>
                ) : null}
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="font-bold text-cafe-800">{money(d.price)}</p>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    d.is_available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {d.is_available ? 'On POS' : 'Hidden'}
                </span>
                <div className="space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openEditDeal(d)}
                    className="text-cafe-600 hover:underline text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Delete this deal?')) {
                        await api.deleteDeal(d.id);
                        load();
                      }
                    }}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!deals.length && (
            <p className="px-5 py-8 text-center text-cafe-400 text-sm">
              No deals yet. Click “+ Add deal” and pick menu items.
            </p>
          )}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4 xl:gap-6">
        {categories.map((cat) => {
          const items = products.filter((p) => p.category_id === cat.id);
          return (
            <section
              key={cat.id}
              className="bg-white rounded-2xl border border-cafe-100 shadow-sm overflow-hidden min-w-0"
            >
              <div className="flex items-center justify-between px-5 py-4 bg-cafe-50 border-b border-cafe-100">
                <h2 className="font-display font-semibold text-lg">{cat.name}</h2>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Delete category and all its items?')) {
                      await api.deleteCategory(cat.id);
                      load();
                    }
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete category
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-cafe-500 border-b border-cafe-50">
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium">Price</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 w-32" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b border-cafe-50 hover:bg-cafe-50/50">
                      <td className="px-5 py-3">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-cafe-400">{p.description}</p>
                      </td>
                      <td className="px-5 py-3 font-semibold">{money(p.price)}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            p.is_available
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {p.is_available ? 'Available' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              id: p.id,
                              category_id: p.category_id,
                              name: p.name,
                              description: p.description,
                              price: p.price,
                              is_available: !!p.is_available,
                            })
                          }
                          className="text-cafe-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm('Delete this item?')) {
                              await api.deleteProduct(p.id);
                              load();
                            }
                          }}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-cafe-400">
                        No items in this category
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cafe-950/50">
          <form
            onSubmit={saveProduct}
            className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl"
          >
            <h3 className="font-display font-bold text-lg">
              {form.id ? 'Edit item' : 'New item'}
            </h3>
            <select
              required
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border"
            />
            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border"
            />
            <input
              required
              type="number"
              step="0.01"
              min="0"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
              />
              Available on POS
            </label>
            <div className="flex gap-3 pt-2">
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

      {dealForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cafe-950/50">
          <form
            onSubmit={saveDeal}
            className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 shadow-xl"
          >
            <h3 className="font-display font-bold text-lg">
              {dealForm.id ? 'Edit deal' : 'New deal'}
            </h3>
            <input
              required
              placeholder="Deal name (e.g. Family Combo)"
              value={dealForm.name}
              onChange={(e) => setDealForm({ ...dealForm, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border"
            />
            <input
              placeholder="Short description (optional)"
              value={dealForm.description}
              onChange={(e) => setDealForm({ ...dealForm, description: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border"
            />
            <input
              required
              type="number"
              step="1"
              min="0"
              placeholder="Deal price (Rs)"
              value={dealForm.price}
              onChange={(e) => setDealForm({ ...dealForm, price: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border"
            />
            <div>
              <p className="text-sm font-semibold text-cafe-800 mb-2">
                What’s in this deal? (tick items)
              </p>
              <div className="max-h-56 overflow-y-auto border rounded-xl divide-y">
                {dealForm.items.map((it, idx) => (
                  <label
                    key={it.product_id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-cafe-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={it.selected}
                      onChange={(e) => {
                        const items = [...dealForm.items];
                        items[idx] = { ...items[idx], selected: e.target.checked };
                        setDealForm({ ...dealForm, items });
                      }}
                    />
                    <span className="flex-1 text-sm truncate">{it.product_name}</span>
                    <input
                      type="number"
                      min="1"
                      disabled={!it.selected}
                      value={it.quantity}
                      onChange={(e) => {
                        const items = [...dealForm.items];
                        items[idx] = {
                          ...items[idx],
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        };
                        setDealForm({ ...dealForm, items });
                      }}
                      className="w-16 px-2 py-1 rounded border text-sm text-center disabled:opacity-40"
                      title="Quantity in deal"
                    />
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dealForm.is_available}
                onChange={(e) =>
                  setDealForm({ ...dealForm, is_available: e.target.checked })
                }
              />
              Show on POS
            </label>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDealForm(null)}
                className="flex-1 py-2 border rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-cafe-600 text-white rounded-xl font-semibold"
              >
                Save deal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
