'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Toast, useToast } from '@/components/Toast';

export default function PickPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState([]);
  const [usedTeamIds, setUsedTeamIds] = useState(new Set());
  const [currentRound, setCurrentRound] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') loadData();
  }, [status]);

  async function loadData() {
    const [teamsRes, roundsRes, myPicksRes] = await Promise.all([
      fetch('/api/teams'),
      fetch('/api/rounds'),
      fetch('/api/picks'),
    ]);
    const teamsData = await teamsRes.json();
    const roundsData = await roundsRes.json();
    const myPicksData = await myPicksRes.json();

    const openRound = roundsData.find(r => r.status === 'open' && new Date(r.deadline) > new Date());
    setCurrentRound(openRound || null);
    setTeams(teamsData);
    setUsedTeamIds(new Set(myPicksData.map(p => p.team_id)));
    setLoading(false);
  }

  async function handlePick() {
    if (!selected || !currentRound || submitting) return;
    setSubmitting(true);

    const res = await fetch('/api/picks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundId: currentRound.id, teamId: selected.id }),
    });
    const data = await res.json();

    if (res.ok) {
      showToast(`✓ Elegiste ${selected.flag_emoji} ${selected.name}!`);
      setTimeout(() => router.push('/'), 1500);
    } else {
      showToast(data.error || 'Error al guardar', 'error');
      setSubmitting(false);
    }
  }

  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-slate-muted">Cargando...</span>
      </div>
    );
  }

  if (!currentRound) {
    return (
      <>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-5xl mb-4">⏳</p>
          <p className="text-slate-muted font-medium">No hay fecha abierta para elegir</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-10">

        {/* Header */}
        <div className="mb-6">
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-2"
            style={{
              color: '#F59E0B',
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            Elegí tu equipo
          </span>
          <h1
            className="font-bebas leading-tight text-slate-bright"
            style={{ fontSize: '2.5rem', letterSpacing: '0.03em' }}
          >
            {currentRound.name}
          </h1>
          <p className="text-slate-muted text-sm mt-1">
            Equipos grises = ya los usaste · Toca uno para seleccionarlo
          </p>
        </div>

        {/* Selected preview banner */}
        {selected && (
          <div
            className="rounded-2xl p-4 mb-5 flex items-center gap-4 animate-slide-up"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.05) 100%)',
              border: '1px solid rgba(245,158,11,0.3)',
              boxShadow: '0 0 30px rgba(245,158,11,0.12)',
            }}
          >
            <span className="text-5xl">{selected.flag_emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bebas text-2xl text-slate-bright leading-tight" style={{ letterSpacing: '0.03em' }}>
                {selected.name}
              </p>
              <p className="text-slate-muted text-xs mt-0.5">Tu selección actual</p>
            </div>
            <button
              onClick={handlePick}
              disabled={submitting}
              className="btn-primary rounded-xl px-5 py-3 text-sm font-bold min-h-[48px] min-w-[100px]"
              style={{ boxShadow: '0 0 20px rgba(245,158,11,0.2)' }}
            >
              {submitting ? '···' : 'CONFIRMAR'}
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-5">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-muted text-sm pointer-events-none"
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar país..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Teams grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map(team => {
            const used = usedTeamIds.has(team.id);
            const isSelected = selected?.id === team.id;

            if (used) {
              return (
                <div key={team.id} className="team-card-used relative">
                  <span className="text-4xl">{team.flag_emoji}</span>
                  <span className="text-xs font-bold text-center leading-tight text-slate-muted">
                    {team.name}
                  </span>
                  <span
                    className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: 'rgba(100,116,139,0.6)' }}
                  >
                    ya usaste
                  </span>
                </div>
              );
            }

            if (isSelected) {
              return (
                <button
                  key={team.id}
                  onClick={() => setSelected(null)}
                  className="team-card-selected relative"
                >
                  <span className="text-4xl">{team.flag_emoji}</span>
                  <span className="text-xs font-bold text-center leading-tight text-slate-bright">
                    {team.name}
                  </span>
                  <span
                    className="absolute top-2 right-2 text-sm"
                    style={{ color: '#F59E0B', textShadow: '0 0 8px rgba(245,158,11,0.8)' }}
                  >
                    ★
                  </span>
                </button>
              );
            }

            return (
              <button
                key={team.id}
                onClick={() => setSelected(team)}
                className="team-card-available"
              >
                <span className="text-4xl">{team.flag_emoji}</span>
                <span className="text-xs font-bold text-center leading-tight text-slate-bright">
                  {team.name}
                </span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-slate-muted py-12">No se encontraron equipos</p>
        )}
      </main>
      <Toast toast={toast} />
    </>
  );
}
