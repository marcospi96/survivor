'use client';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { Toast, useToast } from '@/components/Toast';

export default function BanterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const recipientId = params.id;
  const [messages, setMessages] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();
  const bottomRef = useRef(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') {
      if (!session.user.isAlive) { router.push('/'); return; }
      loadData();
    }
  }, [status]);

  async function loadData() {
    const [usersRes, messagesRes] = await Promise.all([
      fetch('/api/users'),
      fetch(`/api/messages?recipientId=${recipientId}`),
    ]);
    const users = await usersRes.json();
    const msgs = await messagesRes.json();
    setRecipient(users.find(u => u.id.toString() === recipientId) || null);
    setMessages(Array.isArray(msgs) ? msgs : []);
    setLoading(false);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId, content }),
    });
    const data = await res.json();

    if (res.ok) {
      setContent('');
      showToast('Mensaje enviado 😈');
      await loadData();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      showToast(data.error || 'Error al enviar', 'error');
    }
    setSending(false);
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
      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors duration-200 text-slate-muted hover:text-slate-bright flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            ←
          </button>
          <div>
            <h1 className="font-bebas text-2xl text-slate-bright leading-tight" style={{ letterSpacing: '0.03em' }}>
              💀 {recipient?.username || 'Jugador'}
            </h1>
            <p className="text-slate-muted text-xs">Wall de banter · solo tus mensajes son visibles para otros</p>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3 mb-6 min-h-[200px]">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">😈</p>
              <p className="text-slate-muted font-medium">Sé el primero en mandarle banter</p>
              <p className="text-slate-muted/50 text-xs mt-1">Solo lo verá él/ella</p>
            </div>
          ) : (
            messages.map(m => {
              const isMe = m.sender_id?.toString() === session.user.id;
              return (
                <div
                  key={m.id}
                  className="rounded-2xl p-4 animate-fade-in"
                  style={{
                    background: isMe
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.04) 100%)'
                      : 'rgba(15,23,42,0.8)',
                    border: isMe
                      ? '1px solid rgba(245,158,11,0.2)'
                      : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="font-bold text-sm"
                      style={{ color: isMe ? '#F59E0B' : '#94A3B8' }}
                    >
                      {m.sender_name}
                      {isMe && <span className="text-[10px] ml-1.5 opacity-60 font-normal">(tú)</span>}
                    </span>
                    <span className="text-slate-muted text-xs">
                      {new Date(m.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-bright/85 text-sm leading-relaxed">{m.content}</p>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Sticky input bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: 'rgba(10,15,30,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <form
          onSubmit={sendMessage}
          className="max-w-2xl mx-auto px-4 py-3 flex gap-2 items-center"
        >
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`Mandarle algo a ${recipient?.username || 'este jugador'}...`}
            maxLength={500}
            className="flex-1 rounded-xl px-4 py-3 text-slate-bright placeholder-slate-muted text-sm focus:outline-none transition-all duration-200 min-h-[48px]"
            style={{
              background: 'rgba(255,255,255,0.05)',
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
          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="btn-primary rounded-xl px-5 text-sm font-bold min-h-[48px] min-w-[80px]"
          >
            {sending ? '···' : 'Enviar'}
          </button>
        </form>
      </div>

      <Toast toast={toast} />
    </>
  );
}
