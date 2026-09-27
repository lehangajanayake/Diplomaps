/**
 * The end of the game: victory or defeat on your ambition, the moments that decided it, a tip for next
 * time, the map before and after, and the reveal: every secret aim, every lie, and each ruler's verdict.
 */
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { AMBITION } from '../../engine/ambitions';
import { seasonTitle } from '../../engine/config';
import { liesOf } from '../../engine/endings';
import { nameOf, PROFILES } from '../../engine/nations';
import { seedLabel } from '../../engine/rng';
import { NATION_IDS, type Ending, type Holder, type LedgerEntry, type NationId, type RegionId, type WorldState } from '../../engine/types';
import { regionsOf } from '../../engine/world';
import { playAgain } from '../../store/flow';
import { useStore } from '../../store/worldStore';
import { AMBITION_SEAL } from '../common/ambitionArt';
import { SealButton } from '../common/SealButton';
import { WaxSeal } from '../common/WaxSeal';
import { StaticMap } from '../map/StaticMap';
import { Tokens } from '../map/Tokens';
import { Table } from '../table/Table';

function MiniMap({ world, when, regions, caption }: { world: WorldState; when: 'before' | 'after'; regions: WorldState['regions']; caption: string }) {
  const owners = useMemo(() => {
    const out: Record<RegionId, Holder> = {};
    for (const id of world.map.regionIds) out[id] = regions[id]!.owner;
    return out;
  }, [world.map.regionIds, regions]);
  return (
    <figure className="min-w-0 flex-1">
      <div className="parchment relative aspect-[10/7] w-full overflow-hidden">
        <div className="map-sea" />
        <StaticMap map={world.map} owners={owners} />
        <svg viewBox="0 0 1000 700" className="absolute inset-0 h-full w-full">
          <Tokens map={world.map} regions={regions} />
        </svg>
        <div className="sheet-light pointer-events-none absolute inset-0" />
      </div>
      <figcaption className="mt-[0.35em] text-center font-sc text-[0.85rem] tracking-[0.08em] text-parchment-200">
        {when === 'before' ? 'Before' : 'After'} · <span className="font-body italic">{caption}</span>
      </figcaption>
    </figure>
  );
}

/** What a lie that was never caught went on to do, when it started a war. */
function lieOutcome(world: WorldState, e: LedgerEntry): string | null {
  if (!e.about) return null;
  const war = world.stats.instigated.find((x) => x.how === 'lie' && x.a === e.to && x.b === e.about);
  return war ? `${nameOf(war.a, 'start')} went to war with ${nameOf(war.b)}.` : null;
}

function Heading({ end }: { end: Ending }) {
  const won = end.result === 'victory';
  const art = AMBITION_SEAL[end.ambition];
  const def = AMBITION[end.ambition];
  return (
    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
      <p className="font-sc text-[0.95rem] tracking-[0.35em] text-parchment-300/75">
        {end.early ? `The game ended early, in ${seasonTitle(end.season)}` : 'The last season is over'}
      </p>
      <h1 className={`font-title text-[clamp(2.4rem,4.6vw,4.4rem)] leading-[1.05] candle-text ${won ? '!text-gold-bright' : ''}`}>{end.title}</h1>
      <p className="mt-[0.2em] font-body text-[1.15rem] italic text-parchment-200/90">{end.subtitle}</p>
      <div className="mt-[1.4vh] flex items-center gap-[0.8em]">
        <WaxSeal colour={art.colour} emblem={art.emblem} size="2.8em" seed={31} cracked={!won} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[0.95rem] tracking-[0.05em] text-parchment-100">{def.title}</p>
          <div className="mt-[0.3em] h-[0.55em] max-w-[22em] overflow-hidden rounded-full bg-black/40">
            <motion.div
              className="h-full rounded-full"
              style={{ background: won ? 'linear-gradient(90deg, #4f6b3e, #9ab86f)' : 'linear-gradient(90deg, #86672a, #c9a24a)' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(end.progress.ratio * 100)}%` }}
              transition={{ delay: 0.6, duration: 1.4, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-[0.2em] font-body text-[0.9rem] text-parchment-200">{end.progress.label}</p>
        </div>
      </div>
    </motion.div>
  );
}

const POSSESSIVE = { he: 'his', she: 'her', they: 'their' } as const;

function Verdict({ world, nation, index, verdict, loading }: { world: WorldState; nation: NationId; index: number; verdict?: string; loading: boolean }) {
  const p = PROFILES[nation];
  const fallen = regionsOf(world, nation).length === 0;
  return (
    <motion.li className="flex gap-[0.8em]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + index * 0.25 }}>
      <WaxSeal colour={p.colour} emblem={p.emblem} size="2.6em" seed={index + 3} cracked={fallen} className="mt-[0.2em] shrink-0" />
      <div className="min-w-0">
        <p className="font-sc text-[0.95rem]">
          {p.ruler.name}{' '}
          <span className={`font-body text-[0.8rem] italic text-ink-faded ${fallen ? 'line-through decoration-ink-red' : ''}`}>of {p.name}</span>
        </p>
        <p className="font-hand text-[1.02rem] italic leading-snug text-ink-soft">
          {verdict ? `“${verdict}”` : loading ? <span className="animate-pulse">{p.ruler.short} is choosing {POSSESSIVE[p.ruler.pronoun]} words…</span> : ''}
        </p>
        <p className="mt-[0.1em] font-body text-[0.8rem] leading-snug text-ink-faded">
          <span className="font-sc text-wax">Secret aim · </span>
          {p.aim}
        </p>
      </div>
    </motion.li>
  );
}

export function EndScreen() {
  const world = useStore((s) => s.world);
  const ending = useStore((s) => s.ending);
  if (!world?.ending) return null;
  const end = world.ending;
  const { worked, caught } = liesOf(world);
  const loading = !ending || ending.loading;

  return (
    <Table>
      <div className="grid h-full grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-[2.4vw] px-[3vw] pb-[3.2vh] pt-[4.4vh]">
        <section className="flex min-h-0 flex-col">
          <Heading end={end} />
          <motion.div className="mt-[2vh] grid grid-cols-2 gap-[1.6vw]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
            <div>
              <h2 className="font-sc text-[0.85rem] tracking-[0.14em] text-parchment-300/80">What decided it</h2>
              <ul className="mt-[0.3em] space-y-[0.25em] font-body text-[1rem] leading-snug text-parchment-100">
                {end.moments.map((m) => (
                  <li key={m}>· {m}</li>
                ))}
                {end.moments.length === 0 && <li className="italic text-parchment-300">A quiet reign, and a quiet end.</li>}
              </ul>
            </div>
            <div>
              <h2 className="font-sc text-[0.85rem] tracking-[0.14em] text-parchment-300/80">Next time</h2>
              <p className="mt-[0.3em] font-body text-[1rem] italic leading-snug text-gold-bright/90">{end.tip}</p>
            </div>
          </motion.div>
          <motion.div className="mt-[2.2vh] flex gap-[1.4vw]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 1 }}>
            <MiniMap world={world} when="before" regions={world.initialRegions} caption={seasonTitle(1)} />
            <MiniMap world={world} when="after" regions={world.regions} caption={seasonTitle(end.season)} />
          </motion.div>
          <div className="mt-auto flex items-end justify-between pt-[2vh]">
            <div className="parchment px-[1.1em] py-[0.5em]">
              <SealButton label="Play again with a new ambition" onClick={playAgain} size="3.4em" seed={41} hint="A new map, and a new ambition." />
            </div>
            <p className="font-body text-[0.8rem] italic text-parchment-300/60">Map seed {seedLabel(world.seed)}</p>
          </div>
        </section>

        <motion.section
          className="parchment flex min-h-0 flex-col"
          initial={{ opacity: 0, x: 40, rotate: 1.5 }}
          animate={{ opacity: 1, x: 0, rotate: 0.4 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 80, damping: 16 }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-[1.6em] py-[1.2em]">
            <h2 className="text-center font-display text-[1.15rem] font-semibold tracking-[0.16em]">The Reveal</h2>
            <p className="text-center font-hand text-[0.9rem] italic text-ink-faded">What each ruler now says of you, and what they wanted all along.</p>
            <ul className="mt-[0.8em] space-y-[0.9em]">
              {NATION_IDS.map((n, i) => (
                <Verdict key={n} world={world} nation={n} index={i} verdict={ending?.verdicts[n]} loading={loading} />
              ))}
            </ul>

            <h3 className="mt-[1.2em] text-center font-display text-[1rem] font-semibold tracking-[0.14em]">Your Lies</h3>
            {worked.length + caught.length === 0 ? (
              <p className="text-center font-body text-[0.9rem] italic text-ink-faded">You told no lies the ledger could prove. Remarkable, or careful.</p>
            ) : (
              <div className="mt-[0.4em] grid grid-cols-2 gap-[1em] font-body text-[0.84rem] leading-snug">
                <div>
                  <p className="font-sc text-[0.8rem] text-[#3d5a3a]">Worked ({worked.length})</p>
                  <ul className="mt-[0.2em] space-y-[0.3em]">
                    {worked.map((e) => (
                      <li key={e.id}>
                        “{e.what}” <span className="italic text-ink-faded">to {PROFILES[e.to].name}</span>
                        {lieOutcome(world, e) && <span className="block italic text-ink-soft">{lieOutcome(world, e)}</span>}
                      </li>
                    ))}
                    {worked.length === 0 && <li className="italic text-ink-faded">None.</li>}
                  </ul>
                </div>
                <div>
                  <p className="font-sc text-[0.8rem] text-ink-red">Caught ({caught.length})</p>
                  <ul className="mt-[0.2em] space-y-[0.3em]">
                    {caught.map((e) => (
                      <li key={e.id}>
                        <span className="line-through decoration-ink-red decoration-2">“{e.what}”</span>{' '}
                        <span className="italic text-ink-faded">
                          to {PROFILES[e.to].name}; caught by {e.caughtBy.map((c) => PROFILES[c].name).join(', ')}
                        </span>
                      </li>
                    ))}
                    {caught.length === 0 && <li className="italic text-ink-faded">None. Not one.</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </Table>
  );
}
