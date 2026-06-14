'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import WelcomeSplash from '@/components/WelcomeSplash';
import Countdown from '@/components/Countdown';
import PickModal from '@/components/PickModal';
import FixturesSection from '@/components/FixturesSection';
import { Toast, useToast } from '@/components/Toast';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPickModal, setShowPickModal] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') {
      if (!session.user.hasSeeenWelcome) setShowWelcome(true);
      fetchDashboard();
    }
  }, [status]);

  async function fetchDashboard() {
    setLoading(true);
    const res = await fetch('/api/dashboard');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  function handlePickSuccess(team) {
    showToast(`✓ Elegiste ${team.flag_emoji} ${team.name}!`);
    fetchDashboard();
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="font-bebas text-3xl text-gradient-gold tracking-widest">SURVIVOR</span>
          <span className="text-slate-muted text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const { currentRound, myPick, roundPicks, canSeeAll, players, pickHistory } = data || {};
  const alivePlayers = players?.filter(p => p.is_alive) || [];
  const eliminatedPlayers = players?.filter(p => !p.is_alive) || [];
  const picksByUser = {};
  (roundPicks || []).forEach(p => { picksByUser[p.user_id] = p; });

  const roundOpen = currentRound?.status === 'open' && new Date(currentRound.deadline) > new Date();
  const canPick = roundOpen && session.user.isAlive && !myPick;

  return (
    <>
      {showWelcome && !session.user.hasSeeenWelcome && (
        <WelcomeSplash onDismiss={() => setShowWelcome(false)} />
      )}

      <PickModal
        isOpen={showPickModal}
        onClose={() => setShowPickModal(false)}
        currentRound={currentRound}
        onPickSuccess={handlePickSuccess}
      />

      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-10">

        {/* ── PICK CTA — shown FIRST when player hasn't picked ─ */}
        {canPick && (
          <button
            onClick={() => setShowPickModal(true)}
            className="pick-cta-pulse w-full rounded-2xl p-6 text-left relative overflow-hidden block"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.04) 60%, rgba(239,68,68,0.04) 100%)',
              border: '2px solid rgba(245,158,11,0.5)',
            }}
          >
            {/* Decorative glow blob */}
            <div
              className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)' }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-4xl leading-none"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.6))' }}
                >
                  ⚽
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{
                    color: '#F59E0B',
                    background: 'rgba(245,158,11,0.15)',
                    border: '1px solid rgba(245,158,11,0.3)',
                  }}
                >
                  Fecha abierta
                </span>
              </div>

              <h2
                className="font-bebas leading-none mb-1"
                style={{
                  fontSize: 'clamp(2.4rem, 8vw, 3.2rem)',
                  color: '#F8FAFC',
                  letterSpacing: '0.04em',
                }}
              >
                ELEGÍ TU EQUIPO
              </h2>
              <p
                className="font-bebas mb-4"
                style={{ fontSize: '1.2rem', color: '#F59E0B', letterSpacing: '0.05em' }}
              >
                {currentRound.name}
              </p>

              <div className="flex items-center gap-2">
                <span className="text-slate-muted text-xs uppercase tracking-wider">Cierra en</span>
                <Countdown deadline={currentRound.deadline} />
              </div>
            </div>

            {/* Arrow */}
            <div
              className="absolute right-5 top-1/2 -translate-y-1/2 font-bebas text-4xl pointer-events-none"
              style={{ color: 'rgba(245,158,11,0.25)', letterSpacing: 0 }}
            >
              →
            </div>
          </button>
        )}

        {/* ── Current Round Card ────────────────────────────── */}
        <section
          className="rounded-2xl p-5 card-gold card-gradient shadow-card"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {currentRound ? (
            <>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-2"
                    style={{
                      color: '#F59E0B',
                      background: 'rgba(245,158,11,0.12)',
                      border: '1px solid rgba(245,158,11,0.25)',
                    }}
                  >
                    Fecha activa
                  </span>
                  <h2
                    className="font-bebas leading-tight"
                    style={{ fontSize: '1.8rem', color: '#F8FAFC', letterSpacing: '0.03em' }}
                  >
                    {currentRound.name}
                  </h2>
                </div>
                <RoundBadge status={currentRound.status} deadline={currentRound.deadline} />
              </div>

              {currentRound.status === 'open' && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-slate-muted text-xs uppercase tracking-wider">Cierra en</span>
                  <Countdown deadline={currentRound.deadline} />
                </div>
              )}

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />

              {/* My pick */}
              {myPick ? (
                <div
                  className="flex items-center gap-4 rounded-xl p-3"
                  style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
                >
                  <span className="text-4xl">{myPick.flag_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-bright text-base leading-tight">{myPick.team_name}</p>
                    <p className="text-emerald text-xs font-bold mt-0.5">✓ Elegido esta fecha</p>
                  </div>
                </div>
              ) : canPick ? (
                <button
                  onClick={() => setShowPickModal(true)}
                  className="btn-primary flex items-center justify-center gap-2 w-full rounded-xl min-h-[48px] text-sm font-bold"
                >
                  ⚡ Abrir selector de equipos
                </button>
              ) : !session.user.isAlive ? (
                <p className="text-slate-muted text-sm text-center py-1">💀 Estás eliminado</p>
              ) : currentRound?.status === 'open' ? (
                <p className="text-crimson text-sm text-center py-1">⏰ El plazo de picks venció</p>
              ) : (
                <p className="text-slate-muted text-sm text-center py-1">La fecha está cerrada</p>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">⏳</p>
              <p className="text-slate-muted font-medium">No hay fecha activa</p>
            </div>
          )}
        </section>

        {/* ── Fixture ─────────────────────────────────────────── */}
        {currentRound?.match_start_date && (
          <FixturesSection
            startDate={String(currentRound.match_start_date).slice(0, 10)}
            endDate={String(currentRound.match_end_date || currentRound.match_start_date).slice(0, 10)}
          />
        )}

        {/* ── Tablero ─────────────────────────────────────────── */}
        <section>
          <p className="section-title mb-4">Tablero</p>
          <div className="grid grid-cols-2 gap-3">

            {/* VIVOS */}
            <div
              className="rounded-2xl card-green card-gradient shadow-green"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="flex items-center justify-between px-4 pt-4 pb-3"
                style={{ borderBottom: '1px solid rgba(34,197,94,0.1)' }}
              >
                <span className="text-emerald font-bebas text-xl tracking-wider">VIVOS</span>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    color: '#22C55E',
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.3)',
                  }}
                >
                  {alivePlayers.length}
                </span>
              </div>
              <div className="px-4 py-2">
                {alivePlayers.length === 0 ? (
                  <p className="text-slate-muted text-xs py-2 text-center">Nadie sobrevivió</p>
                ) : (
                  alivePlayers.map(p => {
                    const pick = picksByUser[p.id];
                    const isMe = p.id.toString() === session.user.id;
                    return (
                      <div key={p.id} className="player-row">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: '#22C55E', boxShadow: '0 0 4px rgba(34,197,94,0.6)' }}
                        />
                        <span
                          className="text-sm flex-1 truncate font-medium"
                          style={{ color: isMe ? '#F59E0B' : '#F8FAFC' }}
                        >
                          {p.username}{isMe ? ' (yo)' : ''}
                        </span>
                        {(pick && (canSeeAll || isMe)) ? (
                          <span className="text-base flex-shrink-0">{pick.flag_emoji}</span>
                        ) : currentRound?.status === 'open' && !canSeeAll ? (
                          <span className="text-slate-muted/40 text-xs">?</span>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ELIMINADOS */}
            <div
              className="rounded-2xl card-red card-gradient shadow-red"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="flex items-center justify-between px-4 pt-4 pb-3"
                style={{ borderBottom: '1px solid rgba(239,68,68,0.1)' }}
              >
                <span className="text-crimson font-bebas text-xl tracking-wider">ELIMINADOS</span>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    color: '#EF4444',
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                  }}
                >
                  {eliminatedPlayers.length}
                </span>
              </div>
              <div className="px-4 py-2">
                {eliminatedPlayers.length === 0 ? (
                  <p className="text-slate-muted text-xs py-2 text-center">Todos vivos</p>
                ) : (
                  eliminatedPlayers.map(p => (
                    <div key={p.id} className="player-row flex-col items-start gap-0.5">
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-slate-muted text-xs">💀</span>
                        <span className="text-sm text-slate-muted line-through flex-1 truncate">{p.username}</span>
                        {p.eliminated_flag && <span className="text-sm">{p.eliminated_flag}</span>}
                      </div>
                      {p.eliminated_round && (
                        <p className="text-xs pl-5" style={{ color: 'rgba(100,116,139,0.6)' }}>
                          {p.eliminated_round}
                        </p>
                      )}
                      {session.user.isAlive && (
                        <Link
                          href={`/banter/${p.id}`}
                          className="text-xs pl-5 font-bold transition-colors duration-200"
                          style={{ color: 'rgba(245,158,11,0.6)' }}
                        >
                          💬 banter
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Picks de esta fecha ──────────────────────────── */}
        {currentRound && canSeeAll && roundPicks?.length > 0 && (
          <section>
            <p className="section-title mb-4">Picks de esta fecha</p>
            <div
              className="rounded-2xl card-gradient"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {roundPicks.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    borderBottom: i < roundPicks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <span className="text-2xl">{p.flag_emoji}</span>
                  <span className="text-slate-bright font-medium flex-1 text-sm">{p.team_name}</span>
                  <span className="text-slate-muted text-xs">{p.username}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Historial ────────────────────────────────────── */}
        {pickHistory?.length > 0 && (
          <section>
            <p className="section-title mb-4">Tu historial</p>
            <div
              className="rounded-2xl card-gradient"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {pickHistory.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    borderBottom: i < pickHistory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <span className="text-2xl">{p.flag_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-bright font-medium text-sm leading-tight">{p.team_name}</p>
                    <p className="text-slate-muted text-xs truncate mt-0.5">{p.round_name}</p>
                  </div>
                  <OutcomeBadge outcome={p.outcome} status={p.round_status} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Banter inbox (eliminated only) ──────────────── */}
        {!session.user.isAlive && (
          <section>
            <p className="section-title mb-4">Tu wall de banter</p>
            <div
              className="rounded-2xl card-gradient card-red shadow-red"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="p-4">
                <BanterInbox />
              </div>
            </div>
          </section>
        )}
      </main>
      <Toast toast={toast} />
    </>
  );
}

function RoundBadge({ status, deadline }) {
  if (status === 'open') {
    const expired = deadline && new Date(deadline) <= new Date();
    if (expired) return <span className="pill-closed">VENCIDA</span>;
    return <span className="pill-open">ABIERTA</span>;
  }
  if (status === 'closed') return <span className="pill-closed">CERRADA</span>;
  return <span className="pill-resolved">RESUELTA</span>;
}

function OutcomeBadge({ outcome, status }) {
  if (status !== 'resolved' || !outcome) {
    return (
      <span className="text-xs text-slate-muted">
        {status === 'open' ? 'En juego' : status === 'closed' ? 'Pendiente' : '-'}
      </span>
    );
  }
  if (outcome === 'win') {
    return (
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ color: '#22C55E', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
      >
        ✓ Ganó
      </span>
    );
  }
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color: '#EF4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
    >
      {outcome === 'draw' ? '✗ Empató' : '✗ Perdió'}
    </span>
  );
}

function BanterInbox() {
  const [messages, setMessages] = useState(null);

  useEffect(() => {
    fetch('/api/messages')
      .then(r => r.json())
      .then(d => setMessages(Array.isArray(d) ? d : []));
  }, []);

  if (!messages) return <p className="text-slate-muted text-sm text-center py-2">Cargando...</p>;
  if (messages.length === 0) {
    return <p className="text-slate-muted text-sm text-center py-2">Nadie te mandó nada todavía 😢</p>;
  }

  return (
    <div className="space-y-3">
      {messages.map(m => (
        <div
          key={m.id}
          className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,158,11,0.1)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-gold font-bold text-sm">{m.sender_name}</span>
            <span className="text-slate-muted text-xs">
              {new Date(m.created_at).toLocaleDateString('es-AR', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          <p className="text-slate-bright/80 text-sm leading-relaxed">{m.content}</p>
        </div>
      ))}
    </div>
  );
}
