'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/** Coerce strings like "$1,234.50" → 1234.5 */
function toNumber(x) {
  if (x == null) return NaN;
  if (typeof x === 'number') return x;
  const s = String(x).trim();
  if (!s) return NaN;
  const cleaned = s.replace(/[^0-9.\-]/g, ''); // keep digits, dot, minus
  return Number(cleaned);
}

export default function SheetChartPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);

  async function load() {
    try {
        console.log('Refreshing');
      // cache-buster avoids CDN/browser caches
      const res = await fetch(`/api/sheet?ts=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch /api/sheet');
        console.log('Data:', JSON.stringify(json));
      const rows = json.items || [];
      setItems(rows);
      setErr(null);
      setLastUpdated(new Date());

    } catch (e) {
      setErr(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load
    load();

    // auto-refresh every 60s while tab is visible
    function startTimer() {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') load();
      }, 60_000);
    }
    function stopTimer() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    startTimer();

    // refresh when tab gains focus
    const onVis = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const { headers, rows, chartData, total } = useMemo(() => {
    if (!items || items.length === 0) {
      return { headers: [], rows: [], chartData: [], total: 0 };
    }
  
    // Force Column A & B by index so "Column B" really is B
    const keys = Object.keys(items[0] || {});
    const colAKey = keys[0]; // Column A
    const colBKey = keys[1]; // Column B
  
    const rows = items.map((r) => {
      const label = r?.[colAKey];
      const rawVal = r?.[colBKey];
  
      // treat em dashes or plain dashes as blank
      const isDash = (v) => typeof v === 'string' && /^[-–—]+$/.test(v.trim());
  
      const hasLabel = String(label ?? '').trim().length > 0;
      const hasAnyB = rawVal !== null && rawVal !== undefined && String(rawVal).trim().length > 0 && !isDash(rawVal);
  
      const value = toNumber(rawVal);           // parse numeric if possible
      const safeValue = Number.isNaN(value) ? 0 : value; // use 0 for non-numeric
  
      return {
        label,
        rawVal,
        value: safeValue,      // numeric for chart/total
        _include: hasLabel || hasAnyB, // include row if either col has data
      };
    })
    .filter((r) => r._include);
  
    const chartData = rows.map((r) => ({
      name: String(r.label ?? ''),  // X axis from Column A
      amount: r.value,              // Y axis from Column B (0 if non-numeric)
    }));
  
    const total = rows.reduce((acc, r) => acc + (typeof r.value === 'number' ? r.value : 0), 0);
  
    return {
      headers: [colAKey, colBKey],
      rows,
      chartData,
      total,
    };
  }, [items]);

  useEffect(() => {
    if (!items?.length) return;
    const keys = Object.keys(items[0] || {});
    const colAKey = keys[0], colBKey = keys[1];
    items.forEach((r, i) => {
      const label = r?.[colAKey];
      const b = r?.[colBKey];
      console.log(`[row ${i+1}] A=`, label, ' | B=', b);
    });
  }, [items]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;
  if (!rows.length) return <div className="p-6 text-gray-500">No rows found.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sheet Overview</h1>
        <div className="flex items-center gap-3">
          <button onClick={load} className="rounded-lg border px-3 py-1">
            Refresh
          </button>
          <span className="text-sm text-gray-500">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : null}
          </span>
        </div>
      </div>

      {/* Total of Column B */}
      <div className="rounded-xl border p-4">
        <div className="text-sm text-gray-500">Total ({headers[1] || 'Column B'})</div>
        <div className="text-3xl font-bold">{Intl.NumberFormat().format(total)}</div>
      </div>

      {/* Bar Chart: Column A vs Column B */}
      <div className="h-80 rounded-xl border p-4">
        <div className="mb-2 font-medium">
          {headers[0] || 'Column A'} vs {headers[1] || 'Column B'}
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide={chartData.length > 20} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Optional: data table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{headers[0] || 'Column A'}</th>
              <th className="px-3 py-2 text-left font-medium">{headers[1] || 'Column B'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2 whitespace-pre-wrap break-words">
                  {String(r.label ?? '')}
                </td>
                <td className="px-3 py-2">
                  {Intl.NumberFormat().format(Number.isNaN(r.value) ? 0 : r.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}