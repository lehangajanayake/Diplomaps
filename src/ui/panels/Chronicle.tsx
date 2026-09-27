/**
 * "News of the Realm": a parchment scroll with one short line per event, each under the seal of the
 * nation it is about. The chronicler's full prose waits behind "Read the full chronicle".
 */
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { CROSSING_PROFILE, PROFILES } from '../../engine/nations';
import { CROSSING, type ChronicleBeat, type ChronicleEntry } from '../../engine/types';
import { openChronicle } from '../../store/flow';
import { BeatIcon } from '../common/BeatIcon';
import { WaxSeal } from '../common/WaxSeal';

function Roller() {
  return (
    <div className="relative z-10 mx-[-6%] h-[1.6vh] min-h-[11px] rounded-full" style={{ background: 'linear-gradient(180deg, #2a170a 0%, #7a4c26 35%, #a06a38 50%, #5a341a 75%, #1e1007 100%)', boxShadow: '0 3px 6px rgb(0 0 0 / 0.6)' }}>
      <span className="absolute -left-[5%] top-1/2 h-[140%] w-[7%] -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #c9a24a, #5a3f14)' }} />
      <span className="absolute -right-[5%] top-1/2 h-[140%] w-[7%] -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #c9a24a, #5a3f14)' }} />
    </div>
  );
}

const TONE = { good: 'text-[#2f5a2c]', bad: 'text-ink-red', neutral: 'text-ink-soft' } as const;

function Line({ beat, delay, animate }: { beat: ChronicleBeat; delay: number; animate: boolean }) {
  const seal = beat.seal === CROSSING ? { colour: CROSSING_PROFILE.colour, emblem: 'crossroads' as const } : beat.seal === 'unclaimed' ? null : PROFILES[beat.seal];
  return (
    <motion.li
      className="flex items-start gap-[0.4em]"
      initial={animate ? { opacity: 0, x: -6 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      {seal && <WaxSeal colour={seal.colour} emblem={seal.emblem} size="1.2em" seed={beat.text.length} />}
      <BeatIcon kind={beat.kind} className={`mt-[0.15em] h-[0.95em] w-[0.95em] shrink-0 ${TONE[beat.tone]}`} />
      <span className="leading-snug">{beat.text}</span>
    </motion.li>
  );
}

export function Chronicle({ entries, pending }: { entries: ChronicleEntry[]; pending?: string | null }) {
  const reduce = useReducedMotion();
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [entries.length]);
  const ordered = [...entries].reverse();
  const latest = ordered[0]?.season;
  return (
    <div
      className="flex h-full cursor-pointer flex-col"
      data-tutorial="chronicle"
      role="button"
      tabIndex={0}
      aria-label="Open the full chronicle"
      onClick={openChronicle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openChronicle();
        }
      }}
    >
      <Roller />
      <div ref={bodyRef} className="parchment relative -my-[0.4vh] flex-1 overflow-y-auto px-[0.85em] pb-[0.7em] pt-[0.8em] text-ink">
        <h2 className="text-center font-display text-[0.92rem] font-semibold tracking-[0.12em]">News of the Realm</h2>
        <div className="mx-auto mb-[0.6em] mt-[0.2em] h-px w-2/3 bg-ink/40" />
        {ordered.map((entry) => (
          <section key={entry.season} className="mb-[0.8em]">
            <h3 className="mb-[0.25em] font-sc text-[0.84rem] tracking-[0.06em] text-wax">{entry.title}</h3>
            {entry.beats.length > 0 ? (
              <ul className="space-y-[0.3em] font-body text-[0.82rem]">
                {entry.beats.map((b, i) => (
                  <Line key={i} beat={b} delay={i * 0.15} animate={!reduce && entry.season === latest} />
                ))}
              </ul>
            ) : entry.season > 0 ? (
              <p className="font-body text-[0.82rem] italic text-ink-soft">A quiet season: no army marched.</p>
            ) : (
              <div className="font-body text-[0.82rem] leading-snug">
                {entry.lines.map((line, i) => (
                  <p key={i} className="mb-[0.4em]">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </section>
        ))}
        {pending && <p className="mt-[0.3em] animate-pulse text-center font-hand text-[0.8rem] italic text-ink-faded">{pending}</p>}
      </div>
      <Roller />
    </div>
  );
}
