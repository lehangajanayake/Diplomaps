/** The war table: dark wood, the warm pool of candlelight, dust in the air, and a heavy vignette. */
import type { ReactNode } from 'react';

const MOTES = Array.from({ length: 16 }, (_, i) => ({
  left: 62 + ((i * 37) % 36),
  top: 18 + ((i * 53) % 70),
  delay: -((i * 1.7) % 16),
  duration: 12 + ((i * 5) % 9),
  scale: 0.6 + ((i * 7) % 5) / 6,
}));

export function Table({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <div className="wood relative h-full w-full overflow-hidden">
      <div className="table-light pointer-events-none absolute inset-0 animate-flicker" />
      <div className="relative z-10 h-full w-full">{children}</div>
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="mote"
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              animationDelay: `${m.delay}s`,
              animationDuration: `${m.duration}s`,
              transform: `scale(${m.scale})`,
            }}
          />
        ))}
      </div>
      <div className="table-vignette pointer-events-none absolute inset-0 z-40" />
      <div
        className="danger-vignette pointer-events-none absolute inset-0 z-40 transition-opacity duration-1000"
        style={{ opacity: danger ? 1 : 0, animation: danger ? 'var(--animate-heartbeat)' : 'none' }}
      />
    </div>
  );
}
