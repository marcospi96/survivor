'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

export default function WelcomeSplash({ onDismiss }) {
  const { update } = useSession();
  const [dismissing, setDismissing] = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    await fetch('/api/users/welcome', { method: 'POST' });
    await update({ hasSeeenWelcome: true });
    onDismiss();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy">
      <div className="relative w-full h-full flex flex-col items-center justify-center">

        {/* Background image */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/welcome.jpg"
            alt="Survivor"
            fill
            className="object-cover object-center opacity-30"
            priority
            onError={() => {}}
          />
          {/* Multi-layer overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(10,15,30,0.5) 0%, rgba(10,15,30,0.1) 40%, rgba(10,15,30,0.85) 100%)',
            }}
          />
          {/* Gold radial glow */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(245,158,11,0.08) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-20 text-center px-6 animate-fade-in">
          <div
            className="text-7xl mb-6 leading-none"
            style={{ filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.6))' }}
          >
            ⚽
          </div>

          <h1
            className="font-bebas leading-none mb-1"
            style={{
              fontSize: 'clamp(3.5rem, 16vw, 7rem)',
              color: '#F8FAFC',
              textShadow: '0 2px 40px rgba(0,0,0,0.6)',
              letterSpacing: '0.05em',
            }}
          >
            BIENVENIDO
          </h1>
          <h2
            className="font-bebas leading-none mb-6"
            style={{
              fontSize: 'clamp(3rem, 14vw, 6rem)',
              background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.05em',
            }}
          >
            A SURVIVOR
          </h2>

          <p className="text-slate-bright/80 text-base mb-2 font-medium">World Cup 2026</p>
          <p className="text-slate-muted text-sm mb-10 max-w-xs mx-auto leading-relaxed">
            Elegí un equipo cada fecha. Si gana, sobrevivís.<br />
            Si pierde o empata, quedás eliminado.<br />
            <span className="text-gold font-semibold">¡Nunca repitas equipo!</span>
          </p>

          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="btn-primary rounded-full text-xl px-12 py-4 font-bebas tracking-widest disabled:opacity-50"
            style={{
              letterSpacing: '0.12em',
              boxShadow: '0 0 30px rgba(245,158,11,0.35)',
            }}
          >
            {dismissing ? '...' : '¡EMPEZAR!'}
          </button>
        </div>
      </div>
    </div>
  );
}
