/** The pass on a nation's road into the valley: open or closed, what switching it would do, and the switch. */
import { nameOf } from '../../engine/nations';
import { effectsOf } from '../../engine/outcome';
import { passLocked, passOutcome } from '../../engine/passes';
import type { NationId, WorldState } from '../../engine/types';
import { togglePass } from '../../store/flow';
import { EffectChip } from '../common/EffectChip';

/** A little inked gatehouse, barred in red when the pass is closed. */
export function GateIcon({ closed, className }: { closed: boolean; className?: string }) {
  return (
    <svg viewBox="-8 -7 16 13" className={className} aria-hidden>
      <path d="M-7 5 V-4 H-6 V-5.5 H-4.8 V-4 H-3.4 V5 Z M3.4 5 V-4 H4.8 V-5.5 H6 V-4 H7 V5 Z" fill="currentColor" />
      <path d="M-3.4 5 V0.2 A3.4 3.4 0 0 1 3.4 0.2 V5" fill="none" stroke="currentColor" strokeWidth={1} />
      {closed && <path d="M-3.4 2.4 H3.4 M-1.8 -2 V5 M0 -3 V5 M1.8 -2 V5" fill="none" stroke="#8e2417" strokeWidth={1.2} />}
    </svg>
  );
}

interface Props {
  world: WorldState;
  nation: NationId;
  /** Show what switching would do beneath the switch, not only on hover. */
  detailed?: boolean;
}

export function PassControl({ world, nation, detailed = false }: Props) {
  const state = world.player.passes[nation];
  const locked = passLocked(world, nation);
  const effects = effectsOf(world, passOutcome(nation, state === 'open' ? 'closed' : 'open'));
  return (
    <div data-pass={nation}>
      <div className="flex items-center gap-[0.5em]">
        <GateIcon closed={state === 'closed'} className={`h-[1.25em] w-[1.25em] shrink-0 ${state === 'closed' ? 'text-ink-red' : 'text-ink'}`} />
        <span className="font-body text-[0.9rem]">
          Pass to {nameOf(nation)}: <span className={`font-sc ${state === 'closed' ? 'text-ink-red' : ''}`}>{state}</span>
        </span>
        <button
          type="button"
          onClick={() => togglePass(nation)}
          disabled={!!locked}
          title={locked ?? effects.map((e) => e.text).join(' · ')}
          className="ml-auto font-sc text-[0.9rem] text-wax underline decoration-wax/40 underline-offset-2 hover:decoration-wax disabled:cursor-not-allowed disabled:text-ink-faded disabled:no-underline"
        >
          {state === 'open' ? 'Close it' : 'Open it'}
        </button>
      </div>
      {detailed &&
        (locked ? (
          <p className="mt-[0.15em] font-hand text-[0.82rem] italic text-ink-faded">{locked}</p>
        ) : (
          <p className="mt-[0.15em] flex flex-wrap gap-x-[0.8em] gap-y-[0.05em] pl-[1.75em]">
            {effects.map((e, i) => (
              <EffectChip key={i} effect={e} />
            ))}
          </p>
        ))}
    </div>
  );
}
