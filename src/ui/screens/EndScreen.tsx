/**
 * The end of the game: the map as it was and as it is, the reveal (every secret aim, every lie that
 * worked or was caught), each ruler's verdict in their own voice, and a historian's epilogue.
 */
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { seasonTitle } from '../../engine/config';
import { isLie } from '../../engine/ledger';
import { PROFILES } from '../../engine/nations';
import { seedLabel } from '../../engine/rng';
import { NATION_IDS, type LedgerEntry, type Owner, type RegionId, type WorldState } from '../../engine/types';
import { playAgain } from '../../store/flow';
import { useStore } from '../../store/worldStore';
import { SealButton } from '../common/SealButton';
import { WaxSeal } from '../common/WaxSeal';
import { StaticMap } from '../map/StaticMap';
import { Tokens } from '../map/Tokens';
import { Table } from '../table/Table';

function MiniMap({ world, when, regions, caption }: { world: WorldState; when: 'before' | 'after'; regions: WorldState['regions']; caption: string }) {
  const owners = useMemo(() => {
    const out: Record<RegionId, Owner> = {};
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

function lieOutcome(world: WorldState, e: LedgerEntry): string | null {
  if (e.type !== 'claim' || !e.about || e.caught) return null;
  for (const h of world.history) {
    if (h.season < e.season) continue;
    const turned = h.actions.find((a) => a.nation === e.to && a.target === e.about && ['threaten', 'declare_war', 'mobilise', 'spread_rumour', 'demand'].includes(a.action));
    if (turned) return `${PROFILES[e.to].name} turned on ${PROFILES[e.about].name} in ${seasonTitle(h.season)}.`;
  }
  return null;
}

export function EndScreen() {
  const world = useStore((s) => s.world);
  const ending = useStore((s) => s.ending);
  if (!world?.ending) return null;
  const end = world.ending;
  const lies = world.player.ledger.filter(isLie);
  const worked = lies.filter((e) => !e.caught);
  const caught = lies.filter((e) => e.caught);
  const stats: [string, string | number][] = [
    ['Promises made', world.player.ledger.filter((e) => e.type === 'promise').length],
    ['Claims made', world.player.ledger.filter((e) => e.type === 'claim').length],
    ['Lies caught', `${caught.length} of ${lies.length}`],
    ['Wars started', world.stats.warsStarted],
    ['Battles fought', world.stats.battles],
    ['Gold earned', world.player.goldEarned],
    ['Treasury', world.player.gold],
    ['Audiences held', world.stats.audiencesHeld],
  ];
  const loading = !ending || ending.loading;

  return (
    <Table>
      <div className="grid h-full grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-[2.4vw] px-[3vw] pb-[3.2vh] pt-[4.4vh]">
        <section className="flex min-h-0 flex-col">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <p className="font-sc text-[0.95rem] tracking-[0.35em] text-parchment-300/75">
              {end.early ? `The game ended early, in ${seasonTitle(end.season)}` : 'The last season is over'}
            </p>
            <h1 className="font-title text-[clamp(2.4rem,4.6vw,4.4rem)] leading-[1.05] text-parchment-100 candle-text">{end.title}</h1>
            <p className="mt-[0.2em] font-body text-[1.1rem] italic text-parchment-200/90">{end.subtitle}</p>
          </motion.div>
          <motion.div className="mt-[2.2vh] flex gap-[1.4vw]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 1 }}>
            <MiniMap world={world} when="before" regions={world.initialRegions} caption={seasonTitle(1)} />
            <MiniMap world={world} when="after" regions={world.regions} caption={seasonTitle(end.season)} />
          </motion.div>
          <motion.dl className="mt-[2vh] grid grid-cols-4 gap-x-[1.2vw] gap-y-[1vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
            {stats.map(([label, value]) => (
              <div key={label} className="text-center">
                <dt className="font-sc text-[0.74rem] tracking-[0.1em] text-parchment-300/75">{label}</dt>
                <dd className="font-display text-[1.25rem] font-semibold text-gold-bright candle-text">{value}</dd>
              </div>
            ))}
          </motion.dl>
          <div className="mt-auto flex items-end justify-between pt-[2vh]">
            <div className="parchment px-[1.1em] py-[0.5em]">
              <SealButton label="Play again" onClick={playAgain} size="3.4em" seed={41} hint="A new game on a new map." />
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
            <p className="text-center font-hand text-[0.9rem] italic text-ink-faded">What each court truly wanted, and what each ruler now says of you.</p>
            <ul className="mt-[0.8em] space-y-[0.9em]">
              {NATION_IDS.map((n, i) => {
                const p = PROFILES[n];
                const verdict = ending?.verdicts[n];
                return (
                  <motion.li key={n} className="flex gap-[0.8em]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.25 }}>
                    <WaxSeal colour={p.colour} emblem={p.emblem} size="2.6em" seed={i + 3} className="mt-[0.2em] shrink-0" />
                    <div className="min-w-0">
                      <p className="font-sc text-[0.95rem]">
                        {p.ruler.name} <span className="font-body text-[0.8rem] italic text-ink-faded">of {p.name}</span>
                      </p>
                      <p className="font-body text-[0.86rem] leading-snug">
                        <span className="font-sc text-[0.75rem] text-wax">Secret aim · </span>
                        {p.secretGoal}
                      </p>
                      <p className="mt-[0.15em] font-hand text-[0.98rem] italic leading-snug text-ink-soft">
                        {verdict ? `“${verdict}”` : loading ? <span className="animate-pulse">{p.ruler.name.split(' ')[0]} is choosing their words…</span> : ''}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>

            <h3 className="mt-[1.2em] text-center font-display text-[1rem] font-semibold tracking-[0.14em]">Your Lies</h3>
            {lies.length === 0 ? (
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

            <h3 className="mt-[1.2em] text-center font-display text-[1rem] font-semibold tracking-[0.14em]">Epilogue</h3>
            <p className="text-center font-hand text-[0.85rem] italic text-ink-faded">from a history of the five crowns, written in Year 715</p>
            <p className="mt-[0.4em] font-body text-[0.95rem] leading-relaxed">
              {ending && !ending.loading ? ending.epilogue : <span className="animate-pulse italic text-ink-faded">The historians are still arguing…</span>}
            </p>
          </div>
        </motion.section>
      </div>
    </Table>
  );
}
