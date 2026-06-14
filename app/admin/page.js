'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Toast, useToast } from '@/components/Toast';
import { TEAM_MAP } from '@/lib/teamMap';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState('rounds');
  const [rounds, setRounds] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const [newRoundName, setNewRoundName] = useState('');
  const [newRoundDeadline, setNewRoundDeadline] = useState('');
  const [newRoundMatchStart, setNewRoundMatchStart] = useState('');
  const [newRoundMatchEnd, setNewRoundMatchEnd] = useState('');
  const [creatingRound, setCreatingRound] = useState(false);

  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [importingDays, setImportingDays] = useState(new Set());
  const [importingAll, setImportingAll] = useState(false);

  const [resultsRoundId, setResultsRoundId] = useState('');
  const [roundPicksForResults, setRoundPicksForResults] = useState([]);
  const [resultOutcomes, setResultOutcomes] = useState({});

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated') {
      if (!session.user.isAdmin) { router.push('/'); return; }
      loadAll();
    }
  }, [status]);

  async function loadAll() {
    setLoading(true);
    const [roundsRes, playersRes, teamsRes] = await Promise.all([
      fetch('/api/rounds'),
      fetch('/api/users'),
      fetch('/api/teams'),
    ]);
    setRounds(await roundsRes.json());
    setPlayers((await playersRes.json()).filter(u => !u.is_admin));
    setTeams(await teamsRes.json());
    setLoading(false);
  }

  async function createRound(e) {
    e.preventDefault();
    setCreatingRound(true);
    const res = await fetch('/api/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newRoundName,
        deadline: newRoundDeadline,
        matchStartDate: newRoundMatchStart || undefined,
        matchEndDate: newRoundMatchEnd || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast('¡Fecha creada!');
      setNewRoundName(''); setNewRoundDeadline(''); setNewRoundMatchStart(''); setNewRoundMatchEnd('');
      await loadAll();
    } else {
      showToast(data.error || 'Error', 'error');
    }
    setCreatingRound(false);
  }

  async function openSchedule() {
    setShowSchedule(s => !s);
    if (schedule.length === 0) {
      setLoadingSchedule(true);
      try {
        const res = await fetch('/api/fixtures/schedule');
        const data = await res.json();
        setSchedule(data.schedule || []);
      } finally {
        setLoadingSchedule(false);
      }
    }
  }

  function importedArtDates() {
    return new Set(rounds.map(r => r.match_start_date ? String(r.match_start_date).slice(0, 10) : null).filter(Boolean));
  }

  async function importDay(day, roundNumber) {
    setImportingDays(prev => new Set([...prev, day.artDate]));
    try {
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Fecha ${roundNumber} — ${day.label}`,
          deadline: day.firstKickoffUtc,
          matchStartDate: day.artDate,
          matchEndDate: day.artDate,
        }),
      });
      if (res.ok) await loadAll();
      else showToast('Error al crear fecha', 'error');
    } finally {
      setImportingDays(prev => { const s = new Set(prev); s.delete(day.artDate); return s; });
    }
  }

  async function importAllPending() {
    const imported = importedArtDates();
    const pending = schedule.filter(d => !imported.has(d.artDate));
    if (pending.length === 0) { showToast('Todas las fechas ya están importadas'); return; }
    setImportingAll(true);
    let n = rounds.length + 1;
    for (const day of pending) {
      await importDay(day, n++);
    }
    showToast(`✓ ${pending.length} fechas importadas`);
    setImportingAll(false);
  }

  async function updateRoundStatus(id, newStatus) {
    const res = await fetch(`/api/rounds/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      showToast(newStatus === 'open' ? 'Fecha abierta' : newStatus === 'closed' ? 'Picks cerrados' : 'Fecha resuelta');
      await loadAll();
    } else {
      const d = await res.json();
      showToast(d.error || 'Error', 'error');
    }
  }

  async function resolveRound(id) {
    if (!confirm('¿Resolver esta fecha? Se eliminarán los jugadores que no ganaron.')) return;
    const res = await fetch(`/api/rounds/${id}/resolve`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showToast(`Resuelta · ${data.eliminated} eliminados`);
      await loadAll();
    } else {
      showToast(data.error || 'Error', 'error');
    }
  }

  async function loadPicksForResults(roundId) {
    setResultsRoundId(roundId);
    const res = await fetch(`/api/rounds/${roundId}/picks`);
    const picks = await res.json();
    const seen = new Set();
    setRoundPicksForResults(picks.filter(p => {
      if (seen.has(p.team_id)) return false;
      seen.add(p.team_id); return true;
    }));
    setResultOutcomes({});
  }

  async function saveResults() {
    const entries = Object.entries(resultOutcomes);
    if (entries.length === 0) { showToast('No hay resultados para guardar', 'error'); return; }
    await Promise.all(entries.map(([teamId, outcome]) =>
      fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId: resultsRoundId, teamId: parseInt(teamId), outcome }),
      })
    ));
    showToast('¡Resultados guardados!');
  }

  async function togglePlayer(id, isAlive) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAlive: !isAlive }),
    });
    if (res.ok) {
      showToast(!isAlive ? 'Jugador reactivado' : 'Jugador eliminado');
      await loadAll();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-slate-muted">Cargando...</span>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-10">

        {/* Page header */}
        <div className="mb-6">
          <h1
            className="font-bebas text-gradient-gold leading-tight"
            style={{ fontSize: '2.8rem', letterSpacing: '0.05em' }}
          >
            Panel Admin
          </h1>
          <p className="text-slate-muted text-sm">Gestión de fechas y jugadores</p>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            { id: 'rounds', label: '📅 Fechas' },
            { id: 'players', label: '👥 Jugadores' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200"
              style={
                tab === t.id
                  ? {
                      background: 'linear-gradient(135deg, #F59E0B, #F97316)',
                      color: '#0A0F1E',
                      boxShadow: '0 0 16px rgba(245,158,11,0.25)',
                    }
                  : { color: '#64748B' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'rounds' && (
          <div className="space-y-5">

            {/* ── ESPN Schedule Import ────────────────────────── */}
            <div
              className="rounded-2xl overflow-hidden card-gradient"
              style={{ border: '1px solid rgba(96,165,250,0.2)' }}
            >
              <button
                onClick={openSchedule}
                className="w-full flex items-center justify-between px-5 py-4"
                style={{ borderBottom: showSchedule ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)' }}
                  >
                    ESPN
                  </span>
                  <span className="font-bebas tracking-wider" style={{ fontSize: '1.2rem', color: '#F8FAFC' }}>
                    Importar Calendario del Mundial
                  </span>
                </div>
                <span className="text-slate-muted text-lg">{showSchedule ? '▲' : '▼'}</span>
              </button>

              {showSchedule && (
                <div className="px-5 py-4">
                  {loadingSchedule ? (
                    <p className="text-slate-muted text-sm text-center py-4">Cargando calendario...</p>
                  ) : schedule.length === 0 ? (
                    <p className="text-slate-muted text-sm text-center py-4">No se pudo cargar el calendario</p>
                  ) : (() => {
                    const imported = importedArtDates();
                    const pending = schedule.filter(d => !imported.has(d.artDate));
                    const phases = [...new Set(schedule.map(d => d.phase))];

                    return (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-slate-muted text-xs">
                            {imported.size} importadas · {pending.length} pendientes
                          </p>
                          {pending.length > 0 && (
                            <button
                              onClick={importAllPending}
                              disabled={importingAll}
                              className="text-xs font-bold px-3 py-2 rounded-lg"
                              style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)' }}
                            >
                              {importingAll ? '⏳ Importando...' : `⚡ Crear ${pending.length} pendientes`}
                            </button>
                          )}
                        </div>

                        <div className="space-y-4">
                          {phases.map(phase => {
                            const days = schedule.filter(d => d.phase === phase);
                            return (
                              <div key={phase}>
                                <p
                                  className="text-[10px] font-bold uppercase tracking-widest mb-2"
                                  style={{ color: '#F59E0B' }}
                                >
                                  {phase}
                                </p>
                                <div className="space-y-1.5">
                                  {days.map((day, i) => {
                                    const isImported = imported.has(day.artDate);
                                    const isImporting = importingDays.has(day.artDate);
                                    const roundNum = rounds.length + pending.filter(d => d.artDate < day.artDate).length + 1;
                                    return (
                                      <div
                                        key={day.artDate}
                                        className="flex items-center gap-3 py-2 px-3 rounded-xl"
                                        style={{
                                          background: isImported
                                            ? 'rgba(34,197,94,0.04)'
                                            : 'rgba(255,255,255,0.03)',
                                          border: isImported
                                            ? '1px solid rgba(34,197,94,0.12)'
                                            : '1px solid rgba(255,255,255,0.05)',
                                        }}
                                      >
                                        <span
                                          className="text-sm flex-1 font-medium"
                                          style={{ color: isImported ? '#64748B' : '#F8FAFC' }}
                                        >
                                          {day.label}
                                        </span>
                                        <span className="text-xs text-slate-muted">
                                          {day.matchCount} {day.matchCount === 1 ? 'partido' : 'partidos'}
                                        </span>
                                        {isImported ? (
                                          <span className="text-[10px] font-bold" style={{ color: '#22C55E' }}>✓ Importada</span>
                                        ) : (
                                          <button
                                            onClick={() => importDay(day, roundNum)}
                                            disabled={isImporting || importingAll}
                                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                                            style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}
                                          >
                                            {isImporting ? '···' : 'Crear'}
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Create round (manual) */}
            <div
              className="rounded-2xl p-5 card-gold card-gradient"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h2 className="font-bebas text-xl text-slate-bright tracking-wider mb-4">Nueva Fecha Manual</h2>
              <form onSubmit={createRound} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nombre (ej: Fecha 1 — Grupo A)"
                  value={newRoundName}
                  onChange={e => setNewRoundName(e.target.value)}
                  className="input-field"
                  required
                />
                <div>
                  <p className="text-slate-muted text-xs mb-1.5">Plazo de picks</p>
                  <input
                    type="datetime-local"
                    value={newRoundDeadline}
                    onChange={e => setNewRoundDeadline(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <p className="text-slate-muted text-xs mb-1.5">Rango de partidos (para mostrar fixture)</p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newRoundMatchStart}
                      onChange={e => setNewRoundMatchStart(e.target.value)}
                      className="input-field flex-1"
                      placeholder="Desde"
                    />
                    <input
                      type="date"
                      value={newRoundMatchEnd}
                      onChange={e => setNewRoundMatchEnd(e.target.value)}
                      className="input-field flex-1"
                      placeholder="Hasta"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={creatingRound}
                  className="btn-primary rounded-xl px-6 py-3 text-sm font-bold min-h-[48px]"
                >
                  {creatingRound ? '···' : '+ CREAR FECHA'}
                </button>
              </form>
            </div>

            {/* Rounds list */}
            {rounds.map(round => (
              <RoundCard
                key={round.id}
                round={round}
                onStatusChange={updateRoundStatus}
                onResolve={resolveRound}
                onLoadPicks={loadPicksForResults}
                resultsRoundId={resultsRoundId}
                roundPicksForResults={roundPicksForResults}
                resultOutcomes={resultOutcomes}
                setResultOutcomes={setResultOutcomes}
                onSaveResults={saveResults}
                onRoundUpdated={loadAll}
                teams={teams}
              />
            ))}

            {rounds.length === 0 && (
              <p className="text-slate-muted text-center py-8">No hay fechas creadas todavía</p>
            )}
          </div>
        )}

        {tab === 'players' && (
          <div
            className="rounded-2xl overflow-hidden card-gradient"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h2 className="font-bebas text-xl text-slate-bright tracking-wider">
                Jugadores
              </h2>
              <div className="flex gap-3 text-xs">
                <span style={{ color: '#22C55E' }}>
                  🟢 {players.filter(p => p.is_alive).length} vivos
                </span>
                <span style={{ color: '#EF4444' }}>
                  💀 {players.filter(p => !p.is_alive).length} eliminados
                </span>
              </div>
            </div>

            {players.length === 0 ? (
              <p className="text-slate-muted text-center py-10">No hay jugadores registrados</p>
            ) : (
              players.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-5 py-4"
                  style={{
                    borderBottom: i < players.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: p.is_alive ? '#22C55E' : '#EF4444',
                      boxShadow: p.is_alive ? '0 0 5px rgba(34,197,94,0.6)' : '0 0 5px rgba(239,68,68,0.6)',
                    }}
                  />
                  <span className="flex-1 font-medium text-slate-bright">{p.username}</span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: p.is_alive ? '#22C55E' : '#EF4444' }}
                  >
                    {p.is_alive ? 'VIVO' : 'ELIMINADO'}
                  </span>
                  <button
                    onClick={() => togglePlayer(p.id, p.is_alive)}
                    className="text-xs px-3 py-2 rounded-lg font-bold transition-colors duration-200 min-h-[36px]"
                    style={
                      p.is_alive
                        ? {
                            color: '#EF4444',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                          }
                        : {
                            color: '#22C55E',
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.2)',
                          }
                    }
                  >
                    {p.is_alive ? 'Eliminar' : 'Reactivar'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>
      <Toast toast={toast} />
    </>
  );
}

function RoundCard({
  round, onStatusChange, onResolve, onLoadPicks,
  resultsRoundId, roundPicksForResults, resultOutcomes, setResultOutcomes, onSaveResults,
  onRoundUpdated, teams,
}) {
  const [picks, setPicks] = useState([]);
  const [showPicks, setShowPicks] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineValue, setDeadlineValue] = useState('');
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [editingDateRange, setEditingDateRange] = useState(false);
  const [matchStart, setMatchStart] = useState(round.match_start_date ? String(round.match_start_date).slice(0, 10) : '');
  const [matchEnd, setMatchEnd] = useState(round.match_end_date ? String(round.match_end_date).slice(0, 10) : '');
  const [savingDateRange, setSavingDateRange] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  function startEditDeadline() {
    // Convert stored UTC timestamp to local datetime-local format
    const d = new Date(round.deadline);
    const pad = n => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setDeadlineValue(local);
    setEditingDeadline(true);
  }

  async function saveDeadline() {
    if (!deadlineValue) return;
    setSavingDeadline(true);
    const res = await fetch(`/api/rounds/${round.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deadline: new Date(deadlineValue).toISOString() }),
    });
    setSavingDeadline(false);
    if (res.ok) {
      setEditingDeadline(false);
      onRoundUpdated?.();
    }
  }

  async function togglePicks() {
    if (!showPicks) {
      const res = await fetch(`/api/rounds/${round.id}/picks`);
      setPicks(await res.json());
    }
    setShowPicks(!showPicks);
  }

  async function saveDateRange() {
    setSavingDateRange(true);
    const res = await fetch(`/api/rounds/${round.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchStartDate: matchStart || null, matchEndDate: matchEnd || null }),
    });
    setSavingDateRange(false);
    if (res.ok) { setEditingDateRange(false); onRoundUpdated?.(); }
  }

  async function suggestFromAPI() {
    const start = round.match_start_date ? String(round.match_start_date).slice(0, 10) : matchStart;
    const end = round.match_end_date ? String(round.match_end_date).slice(0, 10) : matchEnd;
    if (!start) return;
    setSuggesting(true);
    try {
      const res = await fetch(`/api/fixtures?startDate=${start}&endDate=${end || start}`);
      const data = await res.json();
      const fixtures = data.fixtures || [];

      // Build a lookup: Spanish team name → outcome
      const suggestions = {};
      for (const f of fixtures) {
        if (!f.completed) continue;
        const isDraw = !f.home.winner && !f.away.winner;
        const homeOutcome = isDraw ? 'draw' : (f.home.winner ? 'win' : 'loss');
        const awayOutcome = isDraw ? 'draw' : (f.away.winner ? 'win' : 'loss');

        const homeSpanish = (TEAM_MAP[f.home.name] || {}).name || f.home.name;
        const awaySpanish = (TEAM_MAP[f.away.name] || {}).name || f.away.name;
        suggestions[homeSpanish] = homeOutcome;
        suggestions[awaySpanish] = awayOutcome;
      }

      // Map to team IDs from picks
      const newOutcomes = { ...resultOutcomes };
      for (const pick of roundPicksForResults) {
        if (suggestions[pick.team_name] !== undefined) {
          newOutcomes[pick.team_id] = suggestions[pick.team_name];
        }
      }
      setResultOutcomes(newOutcomes);
    } finally {
      setSuggesting(false);
    }
  }

  const borderClass = round.status === 'open' ? 'card-green' : round.status === 'closed' ? 'card-gold' : 'card-blue';

  return (
    <div
      className={`rounded-2xl overflow-hidden card-gradient ${borderClass}`}
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3
              className="font-bebas text-slate-bright leading-tight"
              style={{ fontSize: '1.6rem', letterSpacing: '0.03em' }}
            >
              {round.name}
            </h3>
            {editingDeadline ? (
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="datetime-local"
                  value={deadlineValue}
                  onChange={e => setDeadlineValue(e.target.value)}
                  className="text-xs rounded-lg px-2 py-1.5 text-slate-bright focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(245,158,11,0.4)',
                  }}
                />
                <button
                  onClick={saveDeadline}
                  disabled={savingDeadline}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
                  style={{ color: '#22C55E', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  {savingDeadline ? '···' : '✓'}
                </button>
                <button
                  onClick={() => setEditingDeadline(false)}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
                  style={{ color: '#94A3B8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={startEditDeadline}
                className="text-left mt-0.5 group"
              >
                <p className="text-slate-muted text-xs group-hover:text-gold transition-colors">
                  Cierre: {new Date(round.deadline).toLocaleString('es-AR')} ✎
                </p>
              </button>
            )}
          </div>
          {round.status === 'open' && <span className="pill-open">ABIERTA</span>}
          {round.status === 'closed' && <span className="pill-closed">CERRADA</span>}
          {round.status === 'resolved' && <span className="pill-resolved">RESUELTA</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          {round.status === 'open' && (
            <AdminBtn color="gold" onClick={() => onStatusChange(round.id, 'closed')}>
              Cerrar picks
            </AdminBtn>
          )}
          {round.status === 'closed' && (
            <>
              <AdminBtn color="green" onClick={() => onStatusChange(round.id, 'open')}>
                Reabrir
              </AdminBtn>
              <AdminBtn color="red" onClick={() => onResolve(round.id)}>
                💥 Resolver fecha
              </AdminBtn>
            </>
          )}
          <AdminBtn color="gray" onClick={togglePicks}>
            {showPicks ? 'Ocultar' : 'Ver'} picks
          </AdminBtn>
          {round.status !== 'resolved' && (
            <AdminBtn color="blue" onClick={() => onLoadPicks(round.id)}>
              Cargar resultados
            </AdminBtn>
          )}
        </div>

        {/* Date range for fixture display */}
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {editingDateRange ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-muted">Partidos:</span>
              <input
                type="date"
                value={matchStart}
                onChange={e => setMatchStart(e.target.value)}
                className="text-xs rounded-lg px-2 py-1.5 text-slate-bright focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(96,165,250,0.4)' }}
              />
              <span className="text-slate-muted text-xs">→</span>
              <input
                type="date"
                value={matchEnd}
                onChange={e => setMatchEnd(e.target.value)}
                className="text-xs rounded-lg px-2 py-1.5 text-slate-bright focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(96,165,250,0.4)' }}
              />
              <button
                onClick={saveDateRange}
                disabled={savingDateRange}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
                style={{ color: '#22C55E', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                {savingDateRange ? '···' : '✓ Guardar'}
              </button>
              <button
                onClick={() => setEditingDateRange(false)}
                className="text-xs font-bold px-2 py-1.5 rounded-lg"
                style={{ color: '#94A3B8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingDateRange(true)} className="group flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-muted group-hover:text-gold transition-colors">
                Rango fixture:
              </span>
              <span className="text-xs text-slate-muted group-hover:text-slate-bright transition-colors">
                {round.match_start_date
                  ? `${String(round.match_start_date).slice(0, 10)} → ${String(round.match_end_date || round.match_start_date).slice(0, 10)}`
                  : 'Sin configurar ✎'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Picks list */}
      {showPicks && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4">
            <p className="text-slate-muted text-xs uppercase tracking-widest mb-3">Picks</p>
            {picks.length === 0 ? (
              <p className="text-slate-muted text-sm">Nadie eligió todavía</p>
            ) : (
              picks.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 py-2"
                  style={{ borderBottom: i < picks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  <span className="text-xl">{p.flag_emoji}</span>
                  <span className="text-slate-bright text-sm flex-1">{p.team_name}</span>
                  <span className="text-slate-muted text-xs">{p.username}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Results entry */}
      {resultsRoundId === round.id && roundPicksForResults.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-muted text-xs uppercase tracking-widest">Cargar Resultados</p>
              {(round.match_start_date || matchStart) && (
                <button
                  onClick={suggestFromAPI}
                  disabled={suggesting}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
                >
                  {suggesting ? '···' : '⚡ Sugerir desde API'}
                </button>
              )}
            </div>
            <div className="space-y-2 mb-4">
              {roundPicksForResults.map(p => (
                <div key={p.team_id} className="flex items-center gap-3">
                  <span className="text-xl">{p.flag_emoji}</span>
                  <span className="text-slate-bright text-sm flex-1">{p.team_name}</span>
                  <select
                    value={resultOutcomes[p.team_id] || ''}
                    onChange={e => setResultOutcomes(prev => ({ ...prev, [p.team_id]: e.target.value }))}
                    className="text-sm rounded-lg px-3 py-2 text-slate-bright focus:outline-none transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <option value="">—</option>
                    <option value="win">✓ Ganó</option>
                    <option value="draw">= Empató</option>
                    <option value="loss">✗ Perdió</option>
                  </select>
                </div>
              ))}
            </div>
            <button
              onClick={onSaveResults}
              className="text-sm font-bold px-4 py-2.5 rounded-xl transition-colors duration-200 min-h-[44px]"
              style={{
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#22C55E',
              }}
            >
              GUARDAR RESULTADOS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminBtn({ children, onClick, color = 'gray' }) {
  const styles = {
    gold: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
    green: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
    red: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
    blue: { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)' },
    gray: { color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.15)' },
  };
  const s = styles[color];
  return (
    <button
      onClick={onClick}
      className="text-xs font-bold px-3 py-2 rounded-lg transition-all duration-200 min-h-[36px]"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {children}
    </button>
  );
}
