import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const ART_OFFSET_MS = -3 * 60 * 60 * 1000; // Argentina = UTC-3, no DST

function artDateOf(utcStr) {
  const ms = new Date(utcStr).getTime() + ART_OFFSET_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

function artLabel(artDateStr) {
  // Parse as noon local to avoid DST issues in label formatting
  const d = new Date(artDateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function phaseLabel(artDateStr) {
  if (artDateStr <= '2026-06-27') return 'Grupos';
  if (artDateStr <= '2026-07-04') return 'Octavos';
  if (artDateStr <= '2026-07-07') return '16avos';
  if (artDateStr <= '2026-07-12') return 'Cuartos';
  if (artDateStr <= '2026-07-15') return 'Semis';
  if (artDateStr === '2026-07-18') return '3er Puesto';
  return 'Final';
}

async function fetchScheduleFromESPN() {
  const url = `${ESPN_BASE}?dates=20260611-20260719&limit=200`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  const data = await res.json();

  const dayMap = new Map();
  for (const event of (data.events || [])) {
    const artDate = artDateOf(event.date);
    if (!dayMap.has(artDate)) {
      dayMap.set(artDate, { artDate, firstKickoffUtc: event.date, homeTeams: [] });
    }
    const day = dayMap.get(artDate);
    if (event.date < day.firstKickoffUtc) day.firstKickoffUtc = event.date;
    const teams = event.competitions?.[0]?.competitors || [];
    const home = teams.find(t => t.homeAway === 'home') || teams[0] || {};
    const away = teams.find(t => t.homeAway === 'away') || teams[1] || {};
    day.homeTeams.push({ home: home.team?.displayName || '', away: away.team?.displayName || '' });
  }

  let i = 1;
  return [...dayMap.values()]
    .sort((a, b) => a.artDate.localeCompare(b.artDate))
    .map(day => ({
      artDate: day.artDate,
      label: artLabel(day.artDate),
      phase: phaseLabel(day.artDate),
      firstKickoffUtc: day.firstKickoffUtc,
      matchCount: day.homeTeams.length,
      suggestedName: `Fecha ${i++} — ${artLabel(day.artDate)}`,
    }));
}

export async function GET() {
  const cacheKey = 'schedule:wc2026';
  let cachedRows = [];

  try {
    const result = await query('SELECT data, fetched_at FROM api_cache WHERE key = $1', [cacheKey]);
    cachedRows = result.rows;

    if (cachedRows.length > 0) {
      const { data, fetched_at } = cachedRows[0];
      const ageMin = (Date.now() - new Date(fetched_at).getTime()) / 60000;
      if (ageMin < 60) {
        return NextResponse.json({ schedule: data, cached: true });
      }
    }

    const schedule = await fetchScheduleFromESPN();
    await query(
      `INSERT INTO api_cache (key, data, fetched_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, fetched_at = NOW()`,
      [cacheKey, JSON.stringify(schedule)]
    );
    return NextResponse.json({ schedule, cached: false });
  } catch (err) {
    console.error('Schedule error:', err);
    if (cachedRows.length > 0) {
      return NextResponse.json({ schedule: cachedRows[0].data, cached: true, stale: true });
    }
    return NextResponse.json({ error: 'No se pudo cargar el calendario', schedule: [] }, { status: 500 });
  }
}
