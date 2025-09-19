'use client';

import { useState, useEffect } from 'react';

export default function HelloClientPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/hello'); // relative works in browser
      const json = await res.json();
      setData(json);
    }
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Hello API (Client)</h1>
      {data ? (
        <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Loading…</p>
      )}
    </div>
  );
}