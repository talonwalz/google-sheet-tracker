'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function toNumber(x) {
  if (x == null) return NaN;
  if (typeof x === 'number') return x;
  const s = String(x).trim();
  if (!s) return NaN;
  return Number(s.replace(/[^0-9.\-]/g, ''));
}

export default function SheetChartPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function load() {
    setLoading(true);
    try {
      // cache-buster to avoid stale CSV/API responses
      const res = await fetch(`/api/sheet?ts=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch');
      setItems(json.items || []);
      setErr(null);
      setLastUpdated(new Date());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const { chartData, total } = useMemo(() => {
    if (!items.length) return { chartData: [], total: 0 };
    const mapped = items.map((r) => ({
      name: r.Item,
      amount: toNumber(r.Amount) || 0,
    }));
    const total = mapped.reduce((sum, r) => sum + r.amount, 0);
    return { chartData: mapped, total };
  }, [items]);

  if (loading && !items.length) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!items.length) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={load} className="rounded-lg border px-3 py-1">Refresh</button>
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="text-gray-500">No rows found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sheet Overview</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg border px-3 py-1 disabled:opacity-60"
            title="Fetch latest data"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <div className="text-sm text-gray-500">Total (Amount)</div>
        <div className="text-3xl font-bold">{Intl.NumberFormat().format(total)}</div>
      </div>

      <div className="h-80 rounded-xl border p-4">
        <div className="mb-2 font-medium">Item vs Amount</div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}