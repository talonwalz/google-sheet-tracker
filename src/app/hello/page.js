// app/hello/page.jsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getHello() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${base}/api/hello`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch /api/hello');
  return res.json();
}

export default async function HelloPage() {
  const data = await getHello();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Hello API Demo</h1>
      <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}