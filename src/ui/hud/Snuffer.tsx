/** The mute toggle: a brass candle snuffer. Down means the room falls silent. */
import { useEffect } from 'react';
import { sound } from '../../audio/sound';
import { useStore } from '../../store/worldStore';

const KEY = 'diplomaps.muted';

export function Snuffer() {
  const muted = useStore((s) => s.muted);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === '1') useStore.setState({ muted: true });
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    sound.setMuted(muted);
    try {
      localStorage.setItem(KEY, muted ? '1' : '0');
    } catch {
      // ignore
    }
  }, [muted]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      if (e.key === 'm' || e.key === 'M') useStore.setState((s) => ({ muted: !s.muted }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <button
      type="button"
      onClick={() => useStore.setState((s) => ({ muted: !s.muted }))}
      className="group flex items-center gap-[0.4em]"
      title={muted ? 'Let the fire speak (sound on, M)' : 'Hush the room (sound off, M)'}
      aria-pressed={muted}
      aria-label={muted ? 'Sound is off' : 'Sound is on'}
    >
      <svg viewBox="0 0 60 40" className="h-[4.2vh] min-h-[26px] w-auto transition-transform duration-300 group-hover:-rotate-6" aria-hidden>
        <defs>
          <linearGradient id="snuff" x1="0" x2="1">
            <stop offset="0" stopColor="#6a4c1c" />
            <stop offset="0.5" stopColor="#e3c476" />
            <stop offset="1" stopColor="#6a4c1c" />
          </linearGradient>
        </defs>
        <ellipse cx="30" cy="36" rx="24" ry="3" fill="#000" opacity="0.4" />
        <path d="M6 30 C18 26 30 24 40 18" stroke="url(#snuff)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <g transform={muted ? 'translate(44 26) rotate(0)' : 'translate(44 12) rotate(-25)'} style={{ transition: 'transform 0.4s' }}>
          <path d="M-7 8 L0 -8 L7 8 Z" fill="url(#snuff)" stroke="#3b2a0c" strokeWidth="0.8" />
        </g>
        {!muted && <path d="M50 30 C48 26 52 24 50 20" stroke="#cbb89a" strokeWidth="1" fill="none" opacity="0.5" />}
      </svg>
      <span className="font-sc text-[0.72rem] tracking-[0.1em] text-parchment-300/80 group-hover:text-gold-bright">{muted ? 'silent' : 'sound'}</span>
    </button>
  );
}
