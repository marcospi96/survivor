'use client';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  return (
    <nav className="nav-blur sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-lg leading-none" style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.6))' }}>⚽</span>
          <span
            className="font-bebas text-2xl tracking-widest text-gradient-gold leading-none"
            style={{ letterSpacing: '0.12em' }}
          >
            SURVIVOR
          </span>
          <span
            className="text-[10px] font-bold tracking-widest hidden sm:block"
            style={{ color: 'rgba(245,158,11,0.5)' }}
          >
            2026
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {session.user.isAdmin && (
            <Link
              href="/admin"
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 ${
                pathname.startsWith('/admin')
                  ? 'btn-primary text-navy px-3 py-1.5 rounded-lg'
                  : 'text-gold border border-gold/30 hover:border-gold/60 hover:bg-gold/5'
              }`}
            >
              ADMIN
            </Link>
          )}

          {/* Username pill */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: session.user.isAlive ? '#22C55E' : '#EF4444',
                boxShadow: session.user.isAlive
                  ? '0 0 6px rgba(34,197,94,0.8)'
                  : '0 0 6px rgba(239,68,68,0.8)',
              }}
            />
            <span className="text-slate-bright font-medium text-xs truncate max-w-[100px]">
              {session.user.username}
            </span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-slate-muted hover:text-slate-bright transition-colors duration-200 text-xs px-2"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
