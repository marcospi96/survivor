'use client';
import { useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  return { toast, showToast };
}

export function Toast({ toast }) {
  if (!toast) return null;

  const config = {
    success: {
      border: 'rgba(34,197,94,0.4)',
      shadow: '0 0 20px rgba(34,197,94,0.2)',
      dot: '#22C55E',
    },
    error: {
      border: 'rgba(239,68,68,0.4)',
      shadow: '0 0 20px rgba(239,68,68,0.2)',
      dot: '#EF4444',
    },
    info: {
      border: 'rgba(59,130,246,0.4)',
      shadow: '0 0 20px rgba(59,130,246,0.2)',
      dot: '#3B82F6',
    },
  };

  const c = config[toast.type] || config.success;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in
                 flex items-center gap-3 px-5 py-3 rounded-full text-sm font-bold
                 text-slate-bright whitespace-nowrap"
      style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: `1px solid ${c.border}`,
        boxShadow: c.shadow,
        backdropFilter: 'blur(12px)',
      }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: c.dot, boxShadow: `0 0 6px ${c.dot}` }}
      />
      {toast.message}
    </div>
  );
}
