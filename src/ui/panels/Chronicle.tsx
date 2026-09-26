/** "News of the Realm": a parchment scroll where each season's entry inks itself in, word by word. */
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { ChronicleEntry } from '../../engine/types';

function Roller() {
  return (
    <div className="relative z-10 mx-[-6%] h-[1.6vh] min-h-[11px] rounded-full" style={{ background: 'linear-gradient(180deg, #2a170a 0%, #7a4c26 35%, #a06a38 50%, #5a341a 75%, #1e1007 100%)', boxShadow: '0 3px 6px rgb(0 0 0 / 0.6)' }}>
      <span className="absolute -left-[5%] top-1/2 h-[140%] w-[7%] -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #c9a24a, #5a3f14)' }} />
      <span className="absolute -right-[5%] top-1/2 h-[140%] w-[7%] -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #c9a24a, #5a3f14)' }} />
    </div>
  );
}

function InkedLine({ text, delay, animate }: { text: string; delay: number; animate: boolean }) {
  const words = text.split(' ');
  if (!animate) return <p className="mb-[0.5em]">{text}</p>;
  return (
    <p className="mb-[0.5em]">
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: 'blur(2px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ delay: delay + i * 0.07, duration: 0.5 }}
        >
          {w}{' '}
        </motion.span>
      ))}
    </p>
  );
}

export function Chronicle({ entries, freshSeason, pending }: { entries: ChronicleEntry[]; freshSeason: number | null; pending?: string | null }) {
  const reduce = useReducedMotion();
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [entries.length]);
  const ordered = [...entries].reverse();
  return (
    <div className="flex h-full flex-col">
      <Roller />
      <div ref={bodyRef} className="parchment relative -my-[0.4vh] flex-1 overflow-y-auto px-[0.95em] pb-[0.8em] pt-[0.9em] text-ink">
        <h2 className="text-center font-display text-[0.92rem] font-semibold tracking-[0.12em]">News of the Realm</h2>
        <div className="mx-auto mb-[0.7em] mt-[0.2em] h-px w-2/3 bg-ink/40" />
        {pending && (
          <p className="mb-2 animate-pulse text-center font-hand text-[0.85rem] italic text-ink-faded">{pending}</p>
        )}
        {ordered.map((entry) => {
          const fresh = !reduce && entry.season === freshSeason;
          return (
            <section key={entry.season} className="mb-[0.9em]">
              <h3 className="mb-[0.25em] font-sc text-[0.86rem] tracking-[0.06em] text-wax">{entry.title}</h3>
              <div className="font-body text-[0.84rem] leading-snug">
                {entry.lines.map((line, i) => (
                  <InkedLine key={i} text={line} animate={fresh} delay={i * line.split(' ').length * 0.07} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <Roller />
    </div>
  );
}
