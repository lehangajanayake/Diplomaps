/**
 * The answers to a letter: each one its own bounded slip, clickable as a whole, with its own seal colour
 * and at most three effects (the rest behind "+N more"). The chosen answer is marked, and it can be
 * changed until the bell rings.
 */
import { fallbackAnswer, letterAnswers } from '../../engine/letters';
import { effectsOf, effectText, keyEffects, type Effect } from '../../engine/outcome';
import type { Letter, WorldState } from '../../engine/types';
import { decideLetter } from '../../store/flow';
import { EffectChip } from '../common/EffectChip';
import { WaxSeal } from '../common/WaxSeal';

/** Muted wax colours, one per answer, so no two choices share a seal. The default answer's seal is plain. */
const SEALS = ['#7c1f18', '#2f4a5c', '#3d5a3a', '#6b4a7a'];
const PLAIN_SEAL = '#6b5a44';

function MoreEffects({ effects }: { effects: Effect[] }) {
  const words = effects.map(effectText).join(', ');
  return (
    <span className="group/more relative whitespace-nowrap font-body text-[0.84rem] italic text-ink-faded underline decoration-dotted underline-offset-2" title={words}>
      +{effects.length} more
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-[0.3em] hidden w-max max-w-[18em] -translate-x-1/2 flex-col gap-[0.1em] whitespace-normal border border-ink/30 bg-parchment-100 px-[0.6em] py-[0.35em] not-italic shadow-lg group-hover/more:flex">
        {effects.map((e, i) => (
          <EffectChip key={i} effect={e} />
        ))}
      </span>
    </span>
  );
}

export function LetterOptions({ world, letter }: { world: WorldState; letter: Letter }) {
  const all = letterAnswers(world, letter);
  const answers = all.filter((a) => !a.hidden);
  const fallback = all.find((a) => a.id === fallbackAnswer(letter));
  const chosen = answers.find((a) => a.id === letter.choice);
  let seal = 0;
  return (
    <>
      <ul className="mt-[1em] space-y-[0.5em]">
        {answers.map((a) => {
          const effects = effectsOf(world, a.outcome);
          const { key, more } = keyEffects(effects, letter.from);
          const isChosen = a.id === letter.choice;
          const colour = a.id === fallbackAnswer(letter) ? PLAIN_SEAL : SEALS[seal++ % SEALS.length]!;
          return (
            <li key={a.id}>
              <button
                type="button"
                disabled={!!a.blocked}
                aria-pressed={isChosen}
                aria-label={`${a.label}${isChosen ? ' (your answer)' : ''}: ${effects.length ? effects.map(effectText).join(', ') : 'nothing changes'}${a.blocked ? `. ${a.blocked}` : ''}`}
                onClick={() => decideLetter(letter.id, a.id)}
                className="group flex w-full items-center gap-[0.7em] px-[0.6em] py-[0.45em] text-left transition-colors hover:bg-[rgb(120_80_30/0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wax disabled:cursor-not-allowed disabled:opacity-55"
              >
                <WaxSeal colour={colour} emblem="crossroads" size="2.2em" seed={a.id.length + 20} />
                <span className="min-w-0 flex-1">
                  <span className="font-sc text-[1.02rem] tracking-[0.03em] group-enabled:group-hover:text-wax">{a.label}</span>
                  <span className="mt-[0.1em] flex flex-wrap gap-x-[0.9em] gap-y-[0.15em]">
                    {key.map((e, i) => (
                      <EffectChip key={i} effect={e} />
                    ))}
                    {more.length > 0 && <MoreEffects effects={more} />}
                    {effects.length === 0 && <span className="font-body text-[0.84rem] italic text-ink-faded">Nothing changes.</span>}
                  </span>
                  {a.blocked && <span className="block font-body text-[0.84rem] italic text-ink-red">{a.blocked}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {chosen ? (
        <p className="mt-[0.7em] text-center font-hand text-[0.9rem] italic text-ink-soft">
          Your answer: “{chosen.label}”. It is sealed when the bell rings; until then you can change it.
        </p>
      ) : (
        fallback &&
        answers.length > 1 && (
          <p className="mt-[0.7em] text-center font-hand text-[0.9rem] italic text-ink-faded">
            Left unanswered, it becomes “{fallback.label}”{fallback.hidden && fallback.outcome.notes?.length ? ` (${fallback.outcome.notes.join(', ')})` : ''} when the bell rings.
          </p>
        )
      )}
    </>
  );
}
