/**
 * The five courts, always on the table: each seal with a needle for how far it trusts you and an eye for
 * how much it suspects you, and crossed swords joining any two at war. Click a court for its dossier.
 */
import { PROFILES } from '../../engine/nations';
import { NATION_IDS, type NationId, type WorldState } from '../../engine/types';
import { isStanding } from '../../engine/world';
import { openDossier, toggleRelations } from '../../store/flow';
import { useStore } from '../../store/worldStore';
import { FloatingDelta } from '../common/FloatingDelta';
import { SuspicionMark } from '../common/SuspicionMark';
import { TrustNeedle } from '../common/TrustNeedle';
import { WaxSeal } from '../common/WaxSeal';
import { STRING } from '../map/palette';
import { suspicionWord, trustWord } from './words';

/** Height of one court's row, in the arcs' drawing units (tenths of an em): rows are 1.8em tall. */
const ROW = 18;

function CourtRow({ world, nation }: { world: WorldState; nation: NationId }) {
  const p = PROFILES[nation];
  const n = world.nations[nation];
  const standing = isStanding(world, nation);
  return (
    <li className="h-[1.8em]">
      <button
        type="button"
        onClick={() => openDossier(nation)}
        className="group grid h-full w-full grid-cols-[1.45em_1fr_1.75em_1.05em] items-center gap-x-[0.3em] pr-[1.25em] text-left"
        title={standing ? `${p.name}: trust ${trustWord(n.trustPlayer).toLowerCase()} (${Math.round(n.trustPlayer)}), suspicion ${suspicionWord(n.suspicion).toLowerCase()} (${Math.round(n.suspicion)})` : `${p.name} has fallen`}
        data-court={nation}
      >
        <WaxSeal colour={p.colour} emblem={p.emblem} size="1.45em" seed={nation.length * 7} cracked={!standing} />
        <span className={`truncate font-sc text-[0.8rem] leading-none group-hover:text-wax ${standing ? '' : 'text-ink-faded line-through decoration-ink-red'}`}>{p.name}</span>
        {standing ? (
          <>
            <span className="relative">
              <TrustNeedle value={n.trustPlayer} className="w-full" />
              <FloatingDelta value={Math.round(n.trustPlayer)} on="parchment" className="-top-[0.6em] left-1/2" />
            </span>
            <span className="relative">
              <SuspicionMark value={n.suspicion} className="w-full" />
              <FloatingDelta value={Math.round(n.suspicion)} invert on="parchment" className="-top-[0.6em] left-1/2" />
            </span>
          </>
        ) : (
          <span className="col-span-2 font-hand text-[0.75rem] italic text-ink-faded">fallen</span>
        )}
      </button>
    </li>
  );
}

const SWORDS = 'M-3 -3 L3 3 M3 -3 L-3 3 M-3.4 1.6 L-1.6 3.4 M3.4 1.6 L1.6 3.4';

/** Arcs down the right edge joining the rows of two nations at war, with crossed swords at the bend. */
function WarArcs({ world }: { world: WorldState }) {
  const rows = NATION_IDS.length;
  const y = (n: NationId) => NATION_IDS.indexOf(n) * ROW + ROW / 2;
  const wars = world.wars.map((war) => [war.a, war.b].sort((a, b) => y(a) - y(b)) as [NationId, NationId]);
  return (
    <svg viewBox={`0 0 12 ${rows * ROW}`} className="pointer-events-none absolute right-0 top-0 h-full w-[1.2em]" aria-hidden>
      {wars.map(([a, b], i) => {
        const reach = 5 + (Math.abs(y(b) - y(a)) / ROW) * 1 + (i % 2) * 1.2;
        const mid = (y(a) + y(b)) / 2;
        return (
          <g key={`${a}-${b}`}>
            <path d={`M1 ${y(a)} Q${1 + reach * 2} ${mid} 1 ${y(b)}`} fill="none" stroke={STRING.war.colour} strokeWidth={1.1} opacity={0.85} />
            <circle cx={1 + reach} cy={mid} r={4.2} fill="#f1e2bd" stroke={STRING.war.colour} strokeWidth={0.8} />
            <path d={SWORDS} transform={`translate(${1 + reach} ${mid})`} stroke={STRING.war.colour} strokeWidth={1.1} strokeLinecap="round" fill="none" />
          </g>
        );
      })}
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="-5 -6 10 12" className="h-[0.95em] w-[0.8em]" aria-hidden>
      <path d="M0 0 L0 6" stroke="#4a3310" strokeWidth={1} />
      <circle cy={-1.5} r={3.4} fill="#c9a24a" stroke="#4a3310" strokeWidth={0.8} />
    </svg>
  );
}

export function Courts({ world }: { world: WorldState }) {
  const relations = useStore((s) => s.relations);
  const showing = relations !== 'off';
  return (
    <section className="parchment relative px-[0.65em] pb-[0.4em] pt-[0.45em] text-ink" aria-label="The five courts" data-tutorial="courts">
      <h2 className="whitespace-nowrap text-center font-display text-[0.8rem] font-semibold tracking-[0.12em]">THE COURTS</h2>
      <div className="relative mt-[0.15em]">
        <ul>
          {NATION_IDS.map((n) => (
            <CourtRow key={n} world={world} nation={n} />
          ))}
        </ul>
        <WarArcs world={world} />
      </div>
      {showing && (
        <p className="mt-[0.15em] flex flex-wrap justify-center gap-x-[0.6em] font-body text-[0.7rem] leading-tight">
          {(['ally', 'neutral', 'hostile', 'war'] as const).map((k) => (
            <span key={k} className="inline-flex items-center gap-[0.25em]">
              <span className="inline-block h-[2px] w-[0.9em]" style={{ background: STRING[k].colour }} />
              {STRING[k].label}
            </span>
          ))}
        </p>
      )}
      <button
        type="button"
        onClick={toggleRelations}
        aria-pressed={relations === 'on'}
        className={`mx-auto mt-[0.15em] flex items-center gap-[0.3em] font-sc text-[0.78rem] ${showing ? 'text-wax' : 'text-ink-soft hover:text-wax'}`}
        title="Pins and string between the capitals: who is friend and who is foe"
      >
        <PinIcon />
        {showing ? 'Hide relations' : 'Show relations'}
      </button>
    </section>
  );
}
