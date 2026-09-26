/** An opened letter: the request, the sender's own words, what each answer will cost, and two seals to choose. */
import { motion } from 'motion/react';
import { CONFIG } from '../../engine/config';
import { PROFILES } from '../../engine/nations';
import { NATION_IDS, type Letter, type WorldState } from '../../engine/types';
import { atWar } from '../../engine/world';
import { closeOverlay, decideLetter } from '../../store/flow';
import { SealButton } from '../common/SealButton';
import { WaxSeal } from '../common/WaxSeal';

function consequences(world: WorldState, letter: Letter): { grant: string[]; refuse: string[] } {
  const from = letter.from;
  const name = PROFILES[from].name;
  const grant: string[] = [];
  const refuse: string[] = [];
  if (letter.kind === 'passage') {
    grant.push(`${name} will be grateful.`, `Neutrality falls; the Crossing looks partisan.`, `Passage fee: +${CONFIG.economy.passageFee} gold each season.`);
    const enemies = NATION_IDS.filter((n) => n !== from && (atWar(world, n, from) || world.nations[n].trust[from] <= -30));
    if (enemies.length) grant.push(`${enemies.map((n) => PROFILES[n].name).join(', ')} will resent it.`);
    grant.push(`${name}'s armies could strike anyone who borders the Crossing.`);
    for (const n of NATION_IDS) {
      const rl = PROFILES[n].redLine;
      if (rl.kind === 'passage_to_enemy' && rl.about === from) grant.push(`This crosses ${PROFILES[n].name}'s red line.`);
    }
    refuse.push(`${name} will be offended.`, `Their trade through the Crossing slows: lower tolls.`);
    if (world.player.ledger.some((e) => e.to === from && e.promiseKind === 'passage' && !e.broken)) {
      refuse.push(`You promised ${name} passage. Refusing breaks that promise, and they will know.`);
    }
  } else if (letter.kind === 'tribute') {
    grant.push(`Pay ${letter.amount} gold.`, `${name} is placated.`, `Neutrality dips: you have been seen to bow.`);
    if (world.player.gold < letter.amount) grant.push(`Your treasury holds only ${world.player.gold} gold.`);
    refuse.push(`${name} is insulted.`, `Refusals add up: a hostile court may come for the tolls by force.`);
  } else {
    const region = letter.region ? world.map.regions[letter.region]?.name : 'a region';
    grant.push(`Lose ${region} to ${name} for good.`, `${name} is placated and tension eases.`, `Buying peace with land leads toward a puppet's fate.`);
    refuse.push(`${name} is angered, and may try to take ${region} by force.`);
  }
  return { grant, refuse };
}

export function LetterView({ world, letter }: { world: WorldState; letter: Letter }) {
  const p = PROFILES[letter.from];
  const { grant, refuse } = consequences(world, letter);
  const region = letter.region ? world.map.regions[letter.region]?.name : null;
  const body =
    letter.kind === 'passage'
      ? `${p.ruler.name}, ${p.ruler.title}, asks leave for the soldiers of ${p.name} to march through the valley of the Crossing.`
      : letter.kind === 'tribute'
        ? `${p.ruler.name}, ${p.ruler.title}, demands ${letter.amount} gold in tribute from the Crossing.`
        : `${p.ruler.name}, ${p.ruler.title}, demands that the Crossing cede ${region} to ${p.name}.`;
  const [grantLabel, refuseLabel] =
    letter.kind === 'passage' ? ['Grant passage', 'Refuse'] : letter.kind === 'tribute' ? [`Pay ${letter.amount} gold`, 'Refuse'] : [`Cede ${region}`, 'Refuse'];

  return (
    <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeOverlay}>
      <motion.article
        onClick={(e) => e.stopPropagation()}
        initial={{ scaleY: 0.08, y: 40, rotate: -2 }}
        animate={{ scaleY: 1, y: 0, rotate: -0.8 }}
        exit={{ scaleY: 0.1, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 17 }}
        className="parchment relative w-[min(620px,82vw)] origin-top px-[2.2em] pb-[1.4em] pt-[1.6em] text-ink"
        style={{ backgroundImage: 'linear-gradient(180deg, transparent 32.9%, rgb(90 60 25 / 0.14) 33.3%, transparent 33.8%, transparent 65.9%, rgb(90 60 25 / 0.12) 66.3%, transparent 66.8%)' }}
      >
        <div className="absolute -top-[1.4em] left-1/2 -translate-x-1/2 opacity-90">
          <WaxSeal colour={p.colour} emblem={p.emblem} size="3.6em" seed={11} />
        </div>
        <p className="font-hand text-[1.02rem] italic">To the Warden of the Crossing,</p>
        <p className="mt-[0.6em] font-body text-[1.02rem] leading-relaxed">{body}</p>
        {letter.reason && <p className="mt-[0.5em] font-hand text-[1rem] italic leading-relaxed text-ink-soft">“{letter.reason}”</p>}
        <p className="mt-[0.5em] text-right font-hand text-[0.95rem] italic">— {p.ruler.name}</p>

        <div className="mt-[1em] grid grid-cols-2 gap-[1.2em] border-t border-ink/20 pt-[0.8em]">
          <div>
            <SealButton label={grantLabel} onClick={() => decideLetter(letter.id, true)} colour="#3d5a3a" emblem="crossroads" seed={21} size="2.8em" />
            <ul className="mt-[0.4em] list-disc space-y-[0.1em] pl-[1.1em] font-body text-[0.82rem] leading-snug text-ink-soft">
              {grant.map((g, i) => (
                <li key={i} className={g.includes('red line') || g.includes('only') ? 'text-ink-red' : ''}>
                  {g}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SealButton label={refuseLabel} onClick={() => decideLetter(letter.id, false)} colour="#7c1f18" emblem="crossroads" seed={22} size="2.8em" />
            <ul className="mt-[0.4em] list-disc space-y-[0.1em] pl-[1.1em] font-body text-[0.82rem] leading-snug text-ink-soft">
              {refuse.map((g, i) => (
                <li key={i} className={g.includes('promise') ? 'text-ink-red' : ''}>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-[0.8em] text-center font-hand text-[0.8rem] italic text-ink-faded">Letters left unanswered when the season ends are taken as refusals.</p>
      </motion.article>
    </motion.div>
  );
}
