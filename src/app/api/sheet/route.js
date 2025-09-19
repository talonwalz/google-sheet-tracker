import { NextResponse } from 'next/server';

export const runtime = 'edge';

function looksLikeHtml(s) {
  return /^\s*<!doctype html|^\s*<html/i.test(s);
}

// Small CSV parser with quotes support
function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', i = 0, inQuotes = false;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      cur += c; i++; continue;
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { row.push(cur); cur = ''; i++; continue; }
      if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      cur += c; i++;
    }
  }
  row.push(cur); rows.push(row);
  if (rows.length && rows.at(-1).length === 1 && rows.at(-1)[0] === '') rows.pop();
  return rows;
}

export async function GET(request) {
  try {
    const url = process.env.NEXT_GOOGLE_SHEET_CSV_URL;
    if (!url) {
      return NextResponse.json({ error: 'Missing GOOGLE_SHEET_CSV_URL env' }, { status: 500 });
    }

    // Optional cache-buster while debugging sheet updates
    const u = new URL(url);
    u.searchParams.set('_', Date.now().toString());

    const resp = await fetch(u.toString(), { cache: 'no-store' });
    const text = await resp.text();

    // Debug mode: return raw content head + status
    const debug = request.nextUrl.searchParams.get('debug');
    if (debug) {
      return NextResponse.json({
        fetchStatus: resp.status,
        contentType: resp.headers.get('content-type') || null,
        rawHead: text.slice(0, 400),
        length: text.length,
      });
    }

    if (!resp.ok) {
      return NextResponse.json(
        { error: `CSV fetch failed`, status: resp.status, head: text.slice(0, 200) },
        { status: 502 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'CSV response is empty. Check Publish-to-web and tab selection.' },
        { status: 502 }
      );
    }

    if (looksLikeHtml(text)) {
      return NextResponse.json(
        {
          error: 'Got HTML instead of CSV (likely permissions). Open your CSV URL in an incognito window.',
          head: text.slice(0, 200)
        },
        { status: 502 }
      );
    }

    const rows = parseCsv(text);
    if (!rows.length) return NextResponse.json({ items: [] });

    const [header, ...body] = rows;
    // If header row is blank, synthesize keys so Column A/B still work
    const headers = header.map((h, i) => (String(h || '').trim() || `Column_${i+1}`));
    const items = body.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? null])));

    return NextResponse.json(
      { items, headers },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch CSV' }, { status: 500 });
  }
}