/**
 * A nation's dossier: a parchment sheet slid onto the table over the map (never over the chronicle).
 * Who they are, how they regard you, their red line, what you have learned, and the way into an audience.
 */
import { motion } from 'motion/react';
import { CONFIG, seasonTitle } from '../../engine/config';
import { isLie } from '../../engine/ledger';
import { PROFILES } from '../../engine/nations';
import type { NationId, WorldState } from '../../engine/types';
import { allied, atWar, regionsOf, totalTroops } from '../../engine/world';
import { canHoldAudience, openDossier, setPassage, startAudience } from '../../store/flow';
import { InkGauge } from '../common/InkGauge';
import { Portrait } from '../common/Portrait';
import { SealButton } from '../common/SealButton';
import { WaxSeal } from '../common/WaxSeal';
import { blameWord, trustWord } from '../hud/words';

const ACTION_PAST: Record<string, string> = {
  mobilise: 'mobilised troops',
  threaten: 'made threats',
  trade: 'sought trade',
  ally: 'sought an alliance',
  demand: 'made demands',
  request_passage: 'asked for passage',
  spread_rumour: 'spread rumours',
  cede: 'ceded land',
  declare_war: 'went to war',
  wait: 'watched and waited',
};

export function Dossier({ world, nation }: { world: WorldState; nation: NationId }) {
  const p = PROFILES[nation];
  const n = world.nations[nation];
  const blocked = canHoldAudience(world, nation);
  const last = n.lastAction;
  const lies = world.player.ledger.filter((e) => e.to === nation);
  const caught = world.player.ledger.filter((e) => e.caughtBy.includes(nation) && isLie(e));
  const passage = world.player.passage[nation];
  const relations = (['grudges', 'friends'] as const).map((k) =>
    k === 'grudges' ? p.grudges.map((g) => PROFILES[g.against].name) : p.friends.map((f) => PROFILES[f.with].name),
  );
  const wars = [...Object.keys(PROFILES)].filter((o) => o !== nation && atWar(world, nation, o as NationId)).map((o) => PROFILES[o as NationId].name);
  const allies = [...Object.keys(PROFILES)].filter((o) => o !== nation && allied(world, nation, o as NationId)).map((o) => PROFILES[o as NationId].name);

  return (
    <motion.aside
      key={nation}
      initial={{ x: '110%', rotate: 4, opacity: 0.6 }}
      animate={{ x: 0, rotate: -0.6, opacity: 1 }}
      exit={{ x: '115%', rotate: 5, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 110, damping: 18 }}
      className="parchment absolute bottom-[3vh] right-[calc(var(--right-col)+2.2vw)] top-[calc(var(--top)+1vh)] z-30 flex w-[min(34vw,470px)] min-w-[330px] flex-col overflow-hidden"
      aria-label={`Dossier on ${p.name}`}
    >
      <div className="flex-1 overflow-y-auto px-[1.3em] pb-[0.8em] pt-[1em]">
        <div className="flex items-start gap-[0.8em]">
          <WaxSeal colour={p.colour} emblem={p.emblem} size="3.3em" seed={nation.length * 7} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[1.45rem] font-semibold leading-none tracking-[0.12em]">{p.name.toUpperCase()}</h2>
            <p className="mt-1 font-body text-[0.86rem] italic text-ink-soft">{p.epithet}</p>
          </div>
          <button type="button" onClick={() => openDossier(null)} className="font-sc text-[0.85rem] text-ink-faded hover:text-wax" aria-label="Set the dossier aside">
            set aside ✕
          </button>
        </div>

        <div className="mt-[0.8em] flex gap-[0.9em]">
          <div className="relative h-[7.2em] w-[6em] shrink-0 overflow-hidden rounded-[50%] border-[3px] border-[#6b4f23] shadow-[0_2px_6px_rgb(0_0_0/0.45)]">
            <Portrait nation={nation} className="h-full w-full" />
          </div>
          <div className="min-w-0">
            <p className="font-sc text-[1.02rem] leading-tight">{p.ruler.name}</p>
            <p className="font-body text-[0.8rem] italic leading-snug text-ink-soft">{p.ruler.title}</p>
            <p className="mt-[0.35em] font-body text-[0.84rem] leading-snug">{p.personality}</p>
          </div>
        </div>
        <p className="mt-[0.4em] font-body text-[0.8rem] leading-snug text-ink-soft">
          <span className="font-sc text-ink">Manner:</span> {p.speechStyle}
        </p>

        <div className="my-[0.6em] h-px bg-ink/25" />
        <div className="space-y-[0.2em]">
          <InkGauge label="Trust" value={n.trustPlayer} min={-100} max={100} word={trustWord(n.trustPlayer)} />
          <InkGauge label="Blame" value={n.blame} min={0} max={100} word={blameWord(n.blame)} tone="red" />
        </div>

        <blockquote className="mt-[0.6em] border-l-2 border-wax/70 pl-[0.7em] font-hand text-[0.9rem] italic leading-snug text-ink">
          <span className="not-italic font-sc text-[0.72rem] tracking-[0.1em] text-wax">Red line · </span>
          “{p.redLine.text}”
        </blockquote>

        <dl className="mt-[0.6em] grid grid-cols-[auto_1fr] gap-x-[0.8em] gap-y-[0.15em] font-body text-[0.82rem]">
          <dt className="font-sc text-ink-soft">Grudges</dt>
          <dd>{relations[0]!.join(', ') || 'none'}</dd>
          <dt className="font-sc text-ink-soft">Friends</dt>
          <dd>{[...new Set([...relations[1]!, ...allies])].join(', ') || 'none'}</dd>
          {wars.length > 0 && (
            <>
              <dt className="font-sc text-wax">At war</dt>
              <dd className="text-wax">{wars.join(', ')}</dd>
            </>
          )}
          <dt className="font-sc text-ink-soft">Strength</dt>
          <dd>
            {regionsOf(world, nation).length} regions · {totalTroops(world, nation)} troops
          </dd>
          <dt className="font-sc text-ink-soft">Passage</dt>
          <dd className="flex flex-wrap items-center gap-x-2">
            <span>{passage === 'granted' ? 'granted through the Crossing' : passage === 'denied' ? 'denied' : 'never requested'}</span>
            {passage === 'granted' ? (
              <button type="button" className="font-sc text-[0.78rem] text-wax underline decoration-dotted" onClick={() => setPassage(nation, false)}>
                revoke
              </button>
            ) : (
              <button type="button" className="font-sc text-[0.78rem] text-wax underline decoration-dotted" onClick={() => setPassage(nation, true)}>
                grant
              </button>
            )}
          </dd>
        </dl>

        <h3 className="mt-[0.7em] font-sc text-[0.86rem] tracking-[0.08em] text-wax">What you have learned</h3>
        <ul className="mt-[0.2em] space-y-[0.25em] font-body text-[0.82rem] leading-snug">
          {last && (
            <li>
              <span className="font-sc text-ink-soft">Last season:</span> {ACTION_PAST[last.action] ?? last.action}
              {last.target ? ` (${last.target === 'crossing' ? 'the Crossing' : PROFILES[last.target].name})` : ''}. <span className="italic">“{last.reason}”</span>
            </li>
          )}
          {n.learned.slice(-3).map((l, i) => (
            <li key={i}>
              <span className="font-sc text-ink-soft">{seasonTitle(l.season)}:</span> {l.text}
            </li>
          ))}
          {lies.length > 0 && (
            <li>
              You have made {lies.filter((e) => e.type === 'promise').length} promises and {lies.filter((e) => e.type === 'claim').length} claims to{' '}
              {p.ruler.name.split(' ')[0]}.
            </li>
          )}
          {caught.length > 0 && <li className="text-ink-red">They have caught {caught.length === 1 ? 'one of your lies' : `${caught.length} of your lies`}.</li>}
          {!last && n.learned.length === 0 && lies.length === 0 && <li className="italic text-ink-faded">Nothing yet. An audience would tell you more.</li>}
        </ul>
      </div>

      <div className="border-t border-ink/20 bg-[rgb(120_80_30/0.08)] px-[1.3em] py-[0.7em]">
        {blocked ? (
          <p className="font-hand text-[0.9rem] italic text-ink-faded">{blocked}</p>
        ) : (
          <SealButton
            label="Request an audience"
            onClick={() => startAudience(nation)}
            colour={p.colour}
            emblem={p.emblem}
            seed={nation.length * 3}
            hint={`A private audience: up to ${CONFIG.messagesPerAudience} messages. Everything you promise is written in your ledger.`}
          />
        )}
      </div>
    </motion.aside>
  );
}
