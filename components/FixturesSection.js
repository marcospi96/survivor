'use client';
import { useState, useEffect, useRef } from 'react';
import { resolveTeam } from '@/lib/teamMap';

const TZ = 'America/Argentina/Buenos_Aires';

function fmtDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('es-AR', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long',
  });
}

function fmtTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('es-AR', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit',
  });
}

function dateKey(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
}

function groupByDate(fixtures) {
  const map = new Map();
  for (const f of fixtures) {
    const key = dateKey(f.date);
    if (!map.has(key)) map.set(key, { label: fmtDate(f.date), matches: [] });
    map.get(key).matches.push(f);
  }
  return [...map.values()];
}

function LiveBadge({ clock, period }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{
        color: '#EF4444',
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.25)',
        animation: 'livePulse 1.5s ease-in-out infinite',
      }}
    >
      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
      {clock || (period === 1 ? '1T' : '2T')}
    </span>
  );
}

function TeamCol({ team, isWinner, isCompleted }) {
  const { name, flag } = resolveTeam(team.name);
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0 px-1">
      <span className="text-3xl leading-none">{flag}</span>
      <span
        className="text-[11px] font-bold text-center leading-tight"
        style={{
          color: isCompleted && isWinner ? '#F59E0B' : '#F8FAFC',
          textShadow: isCompleted && isWinner ? '0 0 8px rgba(245,158,11,0.4)' : 'none',
        }}
      >
        {name}
      </span>
    </div>
  );
}

function MatchCard({ fixture }) {
  const isLive = fixture.state === 'in';
  const isPost = fixture.state === 'post';
  const isPre = fixture.state === 'pre';

  const isDraw = isPost && !fixture.home.winner && !fixture.away.winner;

  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: isLive
          ? 'rgba(239,68,68,0.05)'
          : 'rgba(255,255,255,0.03)',
        border: isLive
          ? '1px solid rgba(239,68,68,0.2)'
          : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Group label + time/status row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-muted uppercase tracking-wider truncate">
          {fixture.group.replace('FIFA World Cup, ', '')}
        </span>
        {isLive ? (
          <LiveBadge clock={fixture.clock} period={fixture.period} />
        ) : isPost ? (
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: '#64748B' }}
          >
            FT
          </span>
        ) : (
          <span className="text-[10px] text-slate-muted">{fmtTime(fixture.date)}</span>
        )}
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-2">
        <TeamCol team={fixture.home} isWinner={fixture.home.winner} isCompleted={isPost} />

        <div className="flex flex-col items-center flex-shrink-0">
          {(isPost || isLive) && fixture.home.score != null ? (
            <div className="flex items-center gap-1.5">
              <span
                className="font-bebas leading-none"
                style={{
                  fontSize: '2rem',
                  color: fixture.home.winner ? '#F8FAFC' : '#64748B',
                  letterSpacing: '0.02em',
                }}
              >
                {fixture.home.score}
              </span>
              <span className="font-bebas text-slate-muted" style={{ fontSize: '1.4rem' }}>-</span>
              <span
                className="font-bebas leading-none"
                style={{
                  fontSize: '2rem',
                  color: fixture.away.winner ? '#F8FAFC' : '#64748B',
                  letterSpacing: '0.02em',
                }}
              >
                {fixture.away.score}
              </span>
            </div>
          ) : (
            <span
              className="font-bebas text-slate-muted"
              style={{ fontSize: '1.4rem', letterSpacing: '0.1em' }}
            >
              VS
            </span>
          )}
          {isDraw && (
            <span className="text-[9px] text-slate-muted uppercase tracking-wider">empate</span>
          )}
        </div>

        <TeamCol team={fixture.away} isWinner={fixture.away.winner} isCompleted={isPost} />
      </div>
    </div>
  );
}

export default function FixturesSection({ startDate, endDate }) {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const timerRef = useRef(null);

  const start = String(startDate).slice(0, 10);
  const end = String(endDate || startDate).slice(0, 10);

  async function load() {
    try {
      const res = await fetch(`/api/fixtures?startDate=${start}&endDate=${end}`);
      const data = await res.json();
      if (res.ok) {
        setFixtures(data.fixtures || []);
        setStale(data.stale || false);
        setError('');
        // Auto-refresh if live matches are present
        const hasLive = (data.fixtures || []).some(f => f.state === 'in');
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(load, hasLive ? 60000 : 10 * 60000);
      } else {
        setError(data.error || 'Error');
      }
    } catch {
      setError('No se pudo cargar el fixture');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [start, end]);

  if (loading) {
    return (
      <section className="rounded-2xl p-4 card-gradient" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-slate-muted text-sm text-center py-4">Cargando partidos...</p>
      </section>
    );
  }

  if (error && fixtures.length === 0) {
    return (
      <section className="rounded-2xl p-4 card-gradient" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-slate-muted text-sm text-center py-4">⚠️ {error}</p>
      </section>
    );
  }

  const groups = groupByDate(fixtures);
  const hasLive = fixtures.some(f => f.state === 'in');

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
      <section className="rounded-2xl overflow-hidden card-gradient" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h2
            className="font-bebas tracking-wider"
            style={{ fontSize: '1.4rem', color: '#F8FAFC', letterSpacing: '0.06em' }}
          >
            PARTIDOS DE ESTA FECHA
          </h2>
          <div className="flex items-center gap-2">
            {hasLive && (
              <span
                className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  color: '#EF4444',
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  animation: 'livePulse 1.5s ease-in-out infinite',
                }}
              >
                EN VIVO
              </span>
            )}
            {stale && (
              <span className="text-[10px] text-slate-muted">⚠ datos desactualizados</span>
            )}
          </div>
        </div>

        {/* Match groups */}
        <div className="px-4 py-4 space-y-5">
          {groups.length === 0 ? (
            <p className="text-slate-muted text-sm text-center py-4">No hay partidos programados</p>
          ) : (
            groups.map(group => (
              <div key={group.label}>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
                  style={{ color: '#F59E0B' }}
                >
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.matches.map(f => (
                    <MatchCard key={f.id} fixture={f} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
