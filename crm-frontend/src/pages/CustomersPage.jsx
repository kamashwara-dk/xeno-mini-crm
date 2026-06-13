import { useEffect, useState, useRef, useCallback } from 'react';
import { getCustomers, seedData } from '../api/client';

const CHANNEL_ICONS = { whatsapp: '💬', sms: '📱', email: '✉️', rcs: '🔷' };

function TagPill({ tag }) {
  return (
    <span className="inline-block bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">
      {tag}
    </span>
  );
}

export default function CustomersPage() {
  const [customers,   setCustomers]   = useState([]);
  const [pagination,  setPagination]  = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [debouncedQ,  setDebouncedQ]  = useState('');
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState(null);
  const debounceRef = useRef(null);

  // Debounce search input 400ms
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(val);
      setPage(1);
    }, 400);
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCustomers(page, debouncedQ);
      setCustomers(res.data || []);
      setPagination(res.pagination || {});
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleSeed = async () => {
    try {
      const res = await seedData();
      setToast(`✓ Seeded ${res.total} customers (${res.atRiskCount} at-risk)`);
      setTimeout(() => setToast(null), 5000);
      setPage(1);
      setDebouncedQ('');
      setSearch('');
      await fetchCustomers();
    } catch (err) {
      setToast('Seed failed: ' + (err.response?.data?.error || err.message));
      setTimeout(() => setToast(null), 5000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Customers</h2>
          <p className="text-sm text-slate-500 mt-0.5">{pagination.total} total</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by name…"
            className="max-w-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2
                       text-sm text-slate-100 placeholder-slate-600
                       focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button onClick={handleSeed} className="btn-secondary text-sm">
            🌱 Seed Demo Data
          </button>
        </div>
      </div>

      {toast && (
        <div className="mb-4 bg-emerald-900/40 border border-emerald-700 text-emerald-300
                        text-sm rounded-lg px-4 py-2">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <span className="w-6 h-6 border-2 border-slate-600 border-t-violet-500 rounded-full animate-spin mr-3" />
          Loading…
        </div>
      ) : customers.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-slate-500 mb-3">No customers found.</p>
          <button onClick={handleSeed} className="text-violet-400 hover:underline text-sm">
            Seed demo data?
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-3 text-xs uppercase tracking-widest text-slate-500 font-medium">Name</th>
                <th className="px-4 py-3 text-xs uppercase tracking-widest text-slate-500 font-medium">Channel</th>
                <th className="px-4 py-3 text-xs uppercase tracking-widest text-slate-500 font-medium">Total Spend</th>
                <th className="px-4 py-3 text-xs uppercase tracking-widest text-slate-500 font-medium">Orders</th>
                <th className="px-4 py-3 text-xs uppercase tracking-widest text-slate-500 font-medium">Days Inactive</th>
                <th className="px-4 py-3 text-xs uppercase tracking-widest text-slate-500 font-medium">Tags</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => {
                const atRisk = c.days_since_last_order > 60;
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors
                      ${i % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/30'}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {CHANNEL_ICONS[c.preferred_channel]} {c.preferred_channel}
                    </td>
                    <td className="px-4 py-3 text-slate-300 tabular-nums">
                      ₹{Number(c.total_spend).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-slate-400 tabular-nums">{c.order_count}</td>
                    <td className={`px-4 py-3 tabular-nums font-medium ${atRisk ? 'text-amber-400' : 'text-slate-400'}`}>
                      {c.days_since_last_order}d
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).slice(0, 3).map((t) => (
                          <TagPill key={t} tag={t} />
                        ))}
                        {(c.tags || []).length > 3 && (
                          <span className="text-xs text-slate-600">+{c.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6 text-sm text-slate-400">
          <span>Page {pagination.page} of {pagination.pages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary !px-4 !py-2 text-xs disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="btn-secondary !px-4 !py-2 text-xs disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
