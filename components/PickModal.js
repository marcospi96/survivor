'use client';
import { useState, useEffect, useRef } from 'react';

export default function PickModal({ isOpen, onClose, currentRound, onPickSuccess }) {
  const [teams, setTeams] = useState([]);
  const [usedTeamIds, setUsedTeamIds] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelected(null);
      setSearch('');
      setError('');
      loadData();
      // Prevent background scroll
      document.body.style.overflow = 'hidden';
      setTimeout(() => searchRef.current?.focus(), 300);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  async function loadData() {
    setLoading(true);
    const [teamsRes, picksRes] = await Promise.all([
      fetch('/api/teams'),
      fetch('/api/picks'),
    ]);
    const teamsData = await teamsRes.json();
    const picksData = await picksRes.json();
    setTeams(Array.isArray(teamsData) ? teamsData : []);
    setUsedTeamIds(new Set(Array.isArray(picksData) ? picksData.map(p => p.team_id) : []));
    setLoading(false);
  }

  async function handleConfirm() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/picks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundId: currentRound.id, teamId: selected.id }),
    });
    const data = await res.json();

    if (res.ok) {
      onPickSuccess(selected);
      onClose();
    } else {
      setError(data.error || 'Error al guardar');
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );
  const available = filtered.filter(t => !usedTeamIds.has(t.id));
  const used = filtered.filter(t => usedTeamIds.has(t.id));

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal panel — slides up from bottom, covers most of screen */}
      <div
        className="modal-slide-up absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #131C2E 0%, #0F172A 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          maxHeight: '93vh',
        }}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Drag handle */}
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />

          <div className="flex items-start justify-between">
            <div>
              <h2
                className="font-bebas leading-none"
                style={{ fontSize: '2.2rem', letterSpacing: '0.04em', color: '#F8FAFC' }}
              >
                Elegí tu equipo
              </h2>
              <p className="text-slate-muted text-xs mt-1">{currentRound?.name}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-muted hover:text-slate-bright transition-colors flex-shrink-0 ml-3"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-muted text-sm pointer-events-none">
              🔍
            </span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar país..."
              className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-bright placeholder-slate-muted focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(245,158,11,0.5)';
                e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.08)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* ── Scrollable team grid ────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-muted">
              Cargando equipos...
            </div>
          ) : (
            <>
              {/* Available teams */}
              {available.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {available.map(team => {
                    const isSelected = selected?.id === team.id;
                    return (
                      <button
                        key={team.id}
                        onClick={() => setSelected(isSelected ? null : team)}
                        className="relative flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl transition-all duration-150 active:scale-95"
                        style={
                          isSelected
                            ? {
                                background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.07) 100%)',
                                border: '2px solid #F59E0B',
                                boxShadow: '0 0 20px rgba(245,158,11,0.25)',
                                transform: 'scale(1.03)',
                              }
                            : {
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                              }
                        }
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = 'rgba(245,158,11,0.35)';
                            e.currentTarget.style.background = 'rgba(245,158,11,0.06)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                          }
                        }}
                      >
                        <span className="text-3xl leading-none">{team.flag_emoji}</span>
                        <span
                          className="text-[11px] font-bold text-center leading-tight"
                          style={{ color: isSelected ? '#F59E0B' : '#F8FAFC' }}
                        >
                          {team.name}
                        </span>
                        {isSelected && (
                          <span
                            className="absolute top-1.5 right-1.5 text-[10px] font-black"
                            style={{ color: '#F59E0B' }}
                          >
                            ★
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Used teams — dimmed section */}
              {used.length > 0 && (
                <>
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-2.5 px-1"
                    style={{ color: 'rgba(100,116,139,0.5)' }}
                  >
                    Ya usaste
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {used.map(team => (
                      <div
                        key={team.id}
                        className="relative flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl grayscale opacity-30 cursor-not-allowed"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <span className="text-3xl leading-none">{team.flag_emoji}</span>
                        <span className="text-[11px] font-bold text-center leading-tight text-slate-muted">
                          {team.name}
                        </span>
                        <span
                          className="absolute top-1.5 right-1.5 text-[9px] font-bold"
                          style={{ color: 'rgba(100,116,139,0.6)' }}
                        >
                          ✓
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {filtered.length === 0 && (
                <p className="text-center text-slate-muted py-12">No se encontraron equipos</p>
              )}

              {/* Bottom padding for sticky bar */}
              <div className="h-24" />
            </>
          )}
        </div>

        {/* ── Sticky confirm bar ──────────────────────────── */}
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(15,23,42,0.97)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {error && (
            <p className="text-crimson text-xs text-center mb-2">{error}</p>
          )}

          {selected ? (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-3 flex-1 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <span className="text-2xl">{selected.flag_emoji}</span>
                <div className="min-w-0">
                  <p className="text-slate-bright font-bold text-sm leading-tight truncate">{selected.name}</p>
                  <p className="text-slate-muted text-xs">Tu pick</p>
                </div>
              </div>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="btn-primary rounded-xl px-5 py-3 font-bold text-sm min-h-[52px] min-w-[110px] flex-shrink-0"
                style={{ boxShadow: '0 0 20px rgba(245,158,11,0.25)' }}
              >
                {submitting ? '···' : 'CONFIRMAR ✓'}
              </button>
            </div>
          ) : (
            <p className="text-slate-muted text-sm text-center py-2">
              Tocá un equipo para seleccionarlo
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
