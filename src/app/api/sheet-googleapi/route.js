// app/api/sheet/route.js
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const apiKey = process.env.GOOGLE_API_KEY;
    const range = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A1:Z1000';

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

    const resp = await fetch(url, { cache: 'no-store' });
    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json({ error: data.error?.message || 'Sheets API error' }, { status: resp.status });
    }

    const rows = data.values || [];
    if (rows.length === 0) return NextResponse.json({ items: [] });

    const [header, ...body] = rows;
    const items = body.map((r) =>
      Object.fromEntries(header.map((h, i) => [String(h), r[i] ?? null]))
    );

    return NextResponse.json({ items, headers: header });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}