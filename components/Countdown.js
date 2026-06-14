'use client';
import { useState, useEffect } from 'react';

export default function Countdown({ deadline }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(deadline));

  function getTimeLeft(deadline) {
    const diff = new Date(deadline) - new Date();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s };
  }

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft(deadline)), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!timeLeft) {
    return (
      <span className="flex items-center gap-1.5 text-crimson font-bold text-sm">
        ⏰ Plazo vencido
      </span>
    );
  }

  const { h, m, s } = timeLeft;

  return (
    <div className="flex items-center gap-1.5">
      {h > 0 && (
        <>
          <TimeBlock value={h} label="h" />
          <span className="text-slate-muted text-lg font-bold">:</span>
        </>
      )}
      <TimeBlock value={m} label="m" />
      <span className="text-slate-muted text-lg font-bold">:</span>
      <TimeBlock value={s} label="s" />
    </div>
  );
}

function TimeBlock({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="font-bebas text-2xl leading-none tracking-wider"
        style={{ color: '#F59E0B', textShadow: '0 0 12px rgba(245,158,11,0.5)' }}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-slate-muted text-[9px] uppercase tracking-widest leading-none mt-0.5">
        {label}
      </span>
    </div>
  );
}
