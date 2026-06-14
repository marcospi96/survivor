import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const CACHE_TTL_MIN = 30;
const LIVE_CACHE_TTL_MIN = 1;

// Argentina = UTC-3, no DST
const ART_OFFSET_MS = -3 * 60 * 60 * 1000;

function artDateOf(utcStr) {
  const ms = new Date(utcStr).getTime() + ART_OFFSET_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

function toDateParam(dateStr) {
  return String(dateStr).slice(0, 10).replace(/-/g, '');
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function fetchFromESPN(startDate, endDate) {
  // Expand endDate by 1 to capture ART matches whose UTC date spills into next calendar day
  const utcEnd = addDays(endDate, 1);
  const start = toDateParam(startDate);
  const end = toDateParam(utcEnd);
  const dateParam = start === end ? start : `${start}-${end}`;
  const url = `${ESPN_BASE}?dates=${dateParam}&limit=100`;

  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  const data = await res.json();

  const allFixtures = (data.events || []).map(e => {
    const c = e.competitions?.[0] || {};
    const st = c.status || {};
    const stt = st.type || {};
    const teams = c.competitors || [];
    const home = teams.find(t => t.homeAway === 'home') || teams[0] || {};
    const away = teams.find(t => t.homeAway === 'away') || teams[1] || {};

    return {
      id: e.id,
      date: e.date,
      artDate: artDateOf(e.date),
      name: e.name,
      group: c.altGameNote || '',
      venue: c.venue?.fullName || '',
      city: c.venue?.address?.city || '',
      statusName: stt.name || 'STATUS_SCHEDULED',
      statusShort: stt.shortDetail || stt.detail || '',
      state: stt.state || 'pre',
      clock: st.displayClock || '',
      period: st.period || 0,
      completed: stt.completed || false,
      home: {
        name: home.team?.displayName || '',
        abbr: home.team?.abbreviation || '',
        score: home.score != null ? home.score : null,
        winner: home.winner || false,
      },
      away: {
        name: away.team?.displayName || '',
        abbr: away.team?.abbreviation || '',
        score: away.score != null ? away.score : null,
        winner: away.winner || false,
      },
    };
  });

  // Filter to only ART dates within requested range
  return allFixtures.filter(f => f.artDate >= startDate && f.artDate <= endDate);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate') || startDate;

    if (!startDate) {
      return NextResponse.json({ error: 'startDate required' }, { status: 400 });
    }

    const start = String(startDate).slice(0, 10);
    const end = String(endDate).slice(0, 10);
    const cacheKey = `fixtures:${start}:${end}`;

    const cached = await query(
      'SELECT data, fetched_at FROM api_cache WHERE key = $1',
      [cacheKey]
    );

    if (cached.rows.length > 0) {
      const { data, fetched_at } = cached.rows[0];
      const ageMin = (Date.now() - new Date(fetched_at).getTime()) / 60000;
      const hasLive = Array.isArray(data) && data.some(m => m.state === 'in');
      const ttl = hasLive ? LIVE_CACHE_TTL_MIN : CACHE_TTL_MIN;

      if (ageMin < ttl) {
        return NextResponse.json({ fixtures: data, cached: true, ageMinutes: Math.round(ageMin) });
      }
    }

    let fixtures;
    try {
      fixtures = await fetchFromESPN(start, end);
    } catch (err) {
      if (cached.rows.length > 0) {
        return NextResponse.json({
          fixtures: cached.rows[0].data,
          cached: true,
          stale: true,
          notice: 'No se pudo actualizar el fixture',
        });
      }
      throw err;
    }

    await query(
      `INSERT INTO api_cache (key, data, fetched_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, fetched_at = NOW()`,
      [cacheKey, JSON.stringify(fixtures)]
    );

    return NextResponse.json({ fixtures, cached: false });
  } catch (err) {
    console.error('Fixtures error:', err);
    return NextResponse.json({ error: 'No se pudo cargar el fixture', fixtures: [] }, { status: 500 });
  }
}
