/** A row of small seals with nation names, each opening that nation's dossier. Used for friends and enemies. */
import { PROFILES } from '../../engine/nations';
import type { NationId, WorldState } from '../../engine/types';
import { isStanding } from '../../engine/world';
import { openDossier } from '../../store/flow';
import { WaxSeal } from './WaxSeal';

interface Props {
  nations: readonly NationId[];
  world: WorldState;
  /** Marks a nation "at war" beside its name. */
  atWar?: (n: NationId) => boolean;
  /** Clicking a seal opens its dossier (not during an audience). */
  linked?: boolean;
}

export function SealList({ nations, world, atWar, linked = true }: Props) {
  if (nations.length === 0) return <span className="italic text-ink-faded">none</span>;
  return (
    <span className="flex flex-wrap gap-x-[0.7em] gap-y-[0.2em]">
      {nations.map((n) => {
        const body = (
          <>
            <WaxSeal colour={PROFILES[n].colour} emblem={PROFILES[n].emblem} size="1.35em" seed={n.length * 7} cracked={!isStanding(world, n)} />
            <span className="font-sc text-[0.84rem]">{PROFILES[n].name}</span>
            {atWar?.(n) && <span className="font-sc text-[0.72rem] text-ink-red">at war</span>}
          </>
        );
        return linked ? (
          <button key={n} type="button" onClick={() => openDossier(n)} className="inline-flex items-center gap-[0.3em] hover:text-wax" title={`${PROFILES[n].name}'s dossier`}>
            {body}
          </button>
        ) : (
          <span key={n} className="inline-flex items-center gap-[0.3em]">
            {body}
          </span>
        );
      })}
    </span>
  );
}
