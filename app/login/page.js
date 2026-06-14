'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'register') {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al registrarse');
        setLoading(false);
        return;
      }
    }

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Usuario o contraseña incorrectos');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background orbs */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(239,68,68,0.04) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo area */}
        <div className="text-center mb-10">
          <div
            className="text-6xl mb-4 leading-none"
            style={{ filter: 'drop-shadow(0 0 16px rgba(245,158,11,0.5))' }}
          >
            ⚽
          </div>
          <h1
            className="font-bebas text-gradient-gold leading-none mb-1"
            style={{ fontSize: '4.5rem', letterSpacing: '0.1em' }}
          >
            SURVIVOR
          </h1>
          <p className="text-slate-muted text-xs font-bold uppercase tracking-widest">
            FIFA World Cup 2026
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(145deg, #0F172A 0%, #131C2E 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Tab toggle */}
          <div
            className="flex rounded-xl overflow-hidden mb-6 p-1 gap-1"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            {[
              { id: 'login', label: 'INICIAR SESIÓN' },
              { id: 'register', label: 'REGISTRARSE' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setMode(tab.id); setError(''); }}
                className="flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200"
                style={
                  mode === tab.id
                    ? {
                        background: 'linear-gradient(135deg, #F59E0B, #F97316)',
                        color: '#0A0F1E',
                        boxShadow: '0 0 16px rgba(245,158,11,0.3)',
                      }
                    : { color: '#64748B' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="input-field"
              autoComplete="username"
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
            />

            {error && (
              <p
                className="text-xs text-center py-2 rounded-lg"
                style={{
                  color: '#EF4444',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 rounded-xl text-sm font-bold min-h-[48px]"
              style={{
                boxShadow: loading ? 'none' : '0 0 20px rgba(245,158,11,0.25)',
              }}
            >
              {loading ? '···' : mode === 'login' ? 'ENTRAR' : 'CREAR CUENTA'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-muted/50 text-xs mt-6">
          Last team standing wins
        </p>
      </div>
    </div>
  );
}
