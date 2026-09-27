/**
 * The audience hall. The table dims, the ruler appears in a gilded frame with a candle of patience
 * burning beside them, their words arrive like handwriting, and the spymaster's note lies open beside
 * the conversation: what they want, who they love and hate, and what you have promised whom.
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { sound } from '../../audio/sound';
import { CONFIG } from '../../engine/config';
import { approachesFor } from '../../engine/audience';
import { favourBlocked } from '../../engine/favours';
import { PROFILES } from '../../engine/nations';
import type { Mood } from '../../engine/schema';
import type { NationId, WorldState } from '../../engine/types';
import { friendsAndEnemies } from '../../engine/world';
import { exitAudience, leaveAudience, openFavour, sendAudienceMessage } from '../../store/flow';
import { useStore, type AudienceState } from '../../store/worldStore';
import { FloatingDelta } from '../common/FloatingDelta';
import { Portrait } from '../common/Portrait';
import { SealButton } from '../common/SealButton';
import { SealList } from '../common/SealList';
import { TrustNeedle } from '../common/TrustNeedle';
import { trustWord } from '../hud/words';

const MOOD_WORD: Record<Mood, string> = { pleased: 'Pleased', wary: 'Wary', angry: 'Angry' };

/** A tall candle beside the portrait: the ruler's patience, burning down with every exchange. */
function PatienceCandle({ patience, max }: { patience: number; max: number }) {
  const reduce = useReducedMotion();
  const left = Math.max(0, patience) / Math.max(1, max);
  const top = 26 + (1 - left) * 118;
  const lit = patience > 0;
  return (
    <div className="flex flex-col items-center" title={`Patience: ${patience} of ${max}`} data-patience={patience}>
      <svg viewBox="0 0 40 170" className="h-[34vh] min-h-[160px] w-auto overflow-visible" aria-hidden>
        {lit && <circle cx="20" cy={top - 12} r="18" fill="#ffb24a" opacity="0.22" />}
        {lit ? (
          <ellipse cx="20" cy={top - 11} rx="4.4" ry="9" fill="#ffc86a" style={reduce ? undefined : { transformOrigin: `20px ${top - 4}px`, animation: 'var(--animate-flame)' }} />
        ) : (
          <path d={`M20 ${top - 2} C17 ${top - 10} 23 ${top - 16} 19 ${top - 26}`} stroke="#8a7a6a" strokeWidth="1.2" fill="none" opacity="0.7" />
        )}
        <path d={`M20 ${top} L20 ${top - 5}`} stroke="#1d130b" strokeWidth="1.4" strokeLinecap="round" />
        <rect x="11" y={top} width="18" height={150 - top} rx="2.5" fill="#efe3c8" stroke="#9c8660" strokeWidth="0.8" />
        {Array.from({ length: max - 1 }, (_, i) => (
          <path key={i} d={`M11 ${26 + ((i + 1) / max) * 118} H14`} stroke="#9c8660" strokeWidth="0.7" opacity="0.7" />
        ))}
        <path d="M4 150 H36 L32 158 H8 Z" fill="#a88545" stroke="#5e4418" strokeWidth="0.8" />
      </svg>
      <span className="mt-[0.3vh] font-sc text-[0.78rem] tracking-[0.1em] text-parchment-300">Patience</span>
    </div>
  );
}

function InkText({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((ch, i) => (
        <span key={i} className="ink-char">
          {ch}
        </span>
      ))}
    </>
  );
}

function PortraitFrame({ audience }: { audience: AudienceState }) {
  const p = PROFILES[audience.nation];
  const reduce = useReducedMotion();
  const turnedAway = audience.endedByRuler || audience.calledAway;
  const angry = audience.mood === 'angry';
  const pleased = audience.mood === 'pleased';
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center">
      <div className="flex w-full items-end justify-center gap-[1.2vw]">
        <motion.div
          key={audience.moodTick}
          animate={angry && !reduce ? { x: [0, -7, 6, -4, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-[17rem]"
          style={{ perspective: 900 }}
        >
          <div className={`absolute -inset-[12%] rounded-full transition-opacity duration-1000 ${pleased ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'radial-gradient(circle, rgb(255 196 110 / 0.45), transparent 65%)' }} />
          <div className="gilt-frame relative">
            <motion.div
              className="relative aspect-[5/6] overflow-hidden"
              animate={turnedAway ? { rotateY: 34, scale: 0.97, filter: 'brightness(0.32) saturate(0.6)' } : { rotateY: 0, scale: 1, filter: 'brightness(1) saturate(1)' }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            >
              <Portrait nation={audience.nation} className="h-full w-full" />
              <div className="pointer-events-none absolute inset-0 transition-colors duration-700" style={{ background: angry ? 'rgb(150 20 10 / 0.3)' : 'transparent', mixBlendMode: 'multiply' }} />
              <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, transparent 50%, rgb(0 0 0 / 0.45))' }} />
            </motion.div>
          </div>
        </motion.div>
        <PatienceCandle patience={audience.patience} max={audience.patienceMax} />
      </div>
      <div className="brass-plate mt-[1.4vh] px-[1.4em] py-[0.35em] text-center">
        <div className="font-display text-[1.05rem] font-semibold tracking-[0.08em] text-[#2a1a08]">{p.ruler.name}</div>
        <div className="font-body text-[0.78rem] italic text-[#3b2a10]">{p.ruler.title}</div>
      </div>
      <div className={`mt-[0.8vh] font-sc text-[0.9rem] tracking-[0.12em] ${angry ? 'text-[#f08a5d]' : pleased ? 'text-gold-bright' : 'text-parchment-300'}`}>
        {audience.calledAway ? 'Called away' : audience.endedByRuler ? 'Has turned away' : MOOD_WORD[audience.mood]}
      </div>
    </div>
  );
}

/** Promises in the ledger, as a short list: "To Kelm: exclusive river trade rights". */
function Promises({ world, to }: { world: WorldState; to: readonly NationId[] }) {
  const promises = world.player.ledger.filter((e) => e.type === 'promise' && to.includes(e.to)).slice(-3);
  if (promises.length === 0) return <p className="italic text-ink-faded">none</p>;
  return (
    <ul className="space-y-[0.15em]">
      {promises.map((e) => (
        <li key={e.id} className={e.caught ? 'text-ink-faded line-through decoration-ink-red' : ''}>
          {to.length > 1 && <span className="font-sc text-[0.78rem] text-ink-soft">{PROFILES[e.to].name}: </span>}
          {e.what}
        </li>
      ))}
    </ul>
  );
}

/** What the Warden's spymaster knows of this ruler, open beside the conversation throughout. */
function SpymasterNote({ world, audience }: { world: WorldState; audience: AudienceState }) {
  const nation = audience.nation;
  const p = PROFILES[nation];
  const trust = world.nations[nation].trustPlayer;
  const { friends, enemies } = friendsAndEnemies(world, nation);
  return (
    <aside className="parchment relative flex min-h-0 flex-col overflow-y-auto px-[1.1em] py-[0.9em] font-body text-[0.84rem] leading-snug text-ink" aria-label="The spymaster's note" data-tutorial="spymaster">
      <h3 className="text-center font-display text-[0.9rem] font-semibold tracking-[0.12em]">THE SPYMASTER&rsquo;S NOTE</h3>
      <div className="mx-auto mb-[0.6em] mt-[0.2em] h-px w-2/3 bg-ink/35" />
      <div className="relative flex items-center gap-[0.6em]">
        <TrustNeedle value={trust} className="h-[2.4em] w-[3.9em]" />
        <FloatingDelta value={Math.round(trust)} on="parchment" className="left-[1.9em] top-0" />
        <span>
          <span className="font-sc text-ink-soft">Trust</span> <span className="italic">{trustWord(trust).toLowerCase()}</span> ({Math.round(trust)})
        </span>
      </div>
      <p className="mt-[0.6em]">
        <span className="font-sc text-ink-soft">Seems to want </span>
        <span className="font-hand text-[0.95rem] italic">{p.hint}</span>
      </p>
      <p className="mt-[0.5em] font-sc text-ink-soft">Friends</p>
      <SealList nations={friends} world={world} linked={false} />
      <p className="mt-[0.4em] font-sc text-ink-soft">Enemies</p>
      <SealList nations={enemies} world={world} linked={false} />
      <p className="mt-[0.6em] font-sc text-ink-soft">Your promises to {p.name}</p>
      <Promises world={world} to={[nation]} />
      <p className="mt-[0.5em] font-sc text-ink-soft">Your promises to their enemies</p>
      <Promises world={world} to={enemies} />
      <AnimatePresence>
        {audience.warning && (
          <motion.p
            key={audience.warning}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-[0.7em] border-l-2 border-ink-red pl-[0.6em] font-body text-[0.9rem] font-medium text-ink-red"
            role="alert"
          >
            ⚠ {audience.warning}
          </motion.p>
        )}
      </AnimatePresence>
    </aside>
  );
}

function Summary({ audience, world }: { audience: AudienceState; world: WorldState }) {
  const p = PROFILES[audience.nation];
  const r = audience.result;
  const first = p.ruler.short;
  const delta = r ? Math.round(r.trustAfter - r.trustBefore) : 0;
  const left = CONFIG.audiencesPerSeason - world.audiencesThisSeason.length;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="border-t border-ink/25 pt-[0.8em]">
      <h3 className="font-sc text-[1rem] tracking-[0.08em] text-wax">
        {audience.calledAway ? `${first} is called away` : audience.endedByRuler ? `${first} ends the audience` : 'The audience is over'}
      </h3>
      {r ? (
        <div className="mt-[0.3em] space-y-[0.3em] font-body text-[0.9rem] leading-snug">
          <p>
            {first}&rsquo;s regard for you: <span className="italic">{trustWord(r.trustBefore)}</span> → <span className="italic">{trustWord(r.trustAfter)}</span>{' '}
            <span className={delta >= 0 ? 'text-[#3d5a3a]' : 'text-ink-red'}>
              ({delta >= 0 ? '+' : ''}
              {delta})
            </span>
            {audience.insolent && <span className="text-ink-red"> Your strange words were taken as an insult.</span>}
          </p>
          {r.offer && (
            <p className="text-[#3d5a3a]">
              <span className="font-sc">Land promised: </span>
              {r.offer} joins your valley when the season ends, if {p.name} still trusts you.
            </p>
          )}
          {r.learned && (
            <p>
              <span className="font-sc text-ink-soft">You learned: </span>
              {r.learned}
            </p>
          )}
          {r.entries.length > 0 ? (
            <div>
              <span className="font-sc text-ink-soft">Written in your ledger:</span>
              <ul className="ml-[1.1em] list-disc">
                {r.entries.map((e) => (
                  <li key={e.id}>
                    <span className="font-sc text-[0.8rem]">{e.type}</span> “{e.what}”
                    {e.type === 'claim' && e.truth === false && <span className="italic text-ink-red"> (a lie)</span>}
                    {e.conflictsWith.length > 0 && <span className="italic text-ink-red"> (contradicts an earlier promise)</span>}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="italic text-ink-faded">You made no promises and no claims. Nothing was written in the ledger.</p>
          )}
          {r.caught.map((c, i) => (
            <p key={i} className="text-ink-red">
              Caught: {c}.
            </p>
          ))}
          {r.fallback && <p className="font-hand text-[0.85rem] italic text-ink-faded">The court scribe could not be found; the audience changed little.</p>}
        </div>
      ) : (
        <p className="mt-[0.3em] font-body italic text-ink-faded">Nothing was said, and nothing was written.</p>
      )}
      <div className="mt-[0.8em] flex items-center justify-between gap-[1em]">
        <SealButton label="Leave the hall" onClick={() => exitAudience()} colour={p.colour} emblem={p.emblem} size="2.6em" seed={4} />
        {!favourBlocked(world, audience.nation) && (
          <SealButton
            label="Call in a favour"
            onClick={() => exitAudience(() => openFavour(audience.nation))}
            colour="#7c1f18"
            emblem="swords"
            size="2.6em"
            seed={9}
            hint={`${p.name} trusts you enough to go to war on your word.`}
          />
        )}
        <span className="font-hand text-[0.85rem] italic text-ink-faded">
          {left} {left === 1 ? 'audience' : 'audiences'} left this season
        </span>
      </div>
    </motion.div>
  );
}

export function AudienceScene() {
  const audience = useStore((s) => s.audience);
  const world = useStore((s) => s.world);
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const turns = audience?.turns.length ?? 0;
  const streamLen = audience?.streamText.length ?? 0;
  const status = audience?.status;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, streamLen, status]);
  useEffect(() => {
    if (status === 'awaiting') inputRef.current?.focus();
  }, [status]);
  useEffect(() => () => sound.stopSpeech(), []);

  if (!audience || !world) return null;
  const p = PROFILES[audience.nation];
  const first = p.ruler.short;
  const approaches = approachesFor(world, audience.nation);
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void sendAudienceMessage(text);
  };

  return (
    <motion.div className="absolute inset-0 z-50 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`Audience with ${p.ruler.name}`}>
      <div className="absolute inset-0 bg-[#060302]/80" />
      <div className="audience-hall absolute inset-0" style={{ ['--nation' as string]: p.colourDark }} />
      <div className="relative grid h-full grid-cols-[minmax(0,0.62fr)_minmax(0,1fr)_minmax(0,0.5fr)] gap-[2vw] px-[3vw] py-[5vh]">
        <PortraitFrame audience={audience} />

        <div className="parchment relative flex min-h-0 flex-col px-[1.6em] pb-[1.1em] pt-[1.2em]">
          <header>
            <h2 className="font-display text-[1.3rem] font-semibold tracking-[0.1em]">An audience with {p.ruler.name}</h2>
            <p className="font-body text-[0.85rem] italic text-ink-soft">
              {p.name}, {p.epithet}
            </p>
          </header>
          <div className="my-[0.5em] h-px bg-ink/25" />

          <div ref={logRef} className="min-h-0 flex-1 space-y-[0.7em] overflow-y-auto pr-[0.4em]">
            {audience.turns.map((t, i) =>
              t.role === 'ruler' ? (
                <div key={i}>
                  <div className="font-sc text-[0.8rem] tracking-[0.1em] text-wax">{first}</div>
                  <p className="font-body text-[1.02rem] leading-relaxed">{t.text}</p>
                </div>
              ) : (
                <div key={i} className="pl-[1.6em]">
                  <div className="font-sc text-[0.8rem] tracking-[0.1em] text-ink-soft">You</div>
                  <p className="font-hand text-[0.98rem] italic leading-relaxed text-ink-soft">{t.text}</p>
                </div>
              ),
            )}
            {audience.status === 'speaking' && (
              <div>
                <div className="font-sc text-[0.8rem] tracking-[0.1em] text-wax">{first}</div>
                {audience.streamText ? (
                  <p className="font-body text-[1.02rem] leading-relaxed">
                    <InkText text={audience.streamText} />
                    <span className="quill-caret" aria-hidden />
                  </p>
                ) : (
                  <p className="animate-pulse font-hand text-[0.95rem] italic text-ink-faded">{first} considers your words…</p>
                )}
              </div>
            )}
            {audience.status === 'closing' && <p className="animate-pulse font-hand italic text-ink-faded">The court scribe writes your words into the ledger…</p>}
            {audience.status === 'closed' && <Summary audience={audience} world={world} />}
          </div>

          {(audience.status === 'awaiting' || audience.status === 'speaking') && (
            <div className="mt-[0.7em] border-t border-ink/25 pt-[0.6em]">
              <div className="mb-[0.35em] flex flex-wrap items-center gap-x-[0.7em] gap-y-[0.2em] font-body text-[0.84rem] text-ink-soft" data-tutorial="approaches">
                <span className="font-sc text-ink">Try:</span>
                {approaches.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    disabled={audience.status !== 'awaiting'}
                    onClick={() => {
                      setDraft(a.text);
                      inputRef.current?.focus();
                    }}
                    className="italic underline decoration-ink/40 decoration-dotted underline-offset-2 hover:text-wax disabled:opacity-50"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <div className="ruled relative">
                <textarea
                  ref={inputRef}
                  value={draft}
                  maxLength={600}
                  rows={3}
                  disabled={audience.status !== 'awaiting'}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={audience.status === 'awaiting' ? `Speak, Warden. Promise, flatter, warn or lie; ${first} will remember.` : ''}
                  className="w-full resize-none bg-transparent font-hand text-[1.02rem] leading-[1.9em] text-ink outline-none placeholder:italic placeholder:text-ink-faded/80"
                  aria-label={`Your words to ${p.ruler.name}`}
                />
              </div>
              <div className="mt-[0.3em] flex items-center justify-between gap-4">
                <button type="button" onClick={() => void leaveAudience()} disabled={audience.status !== 'awaiting'} className="font-sc text-[0.85rem] text-ink-faded hover:text-wax disabled:opacity-40">
                  Take your leave
                </button>
                <SealButton label="Speak" onClick={send} disabled={audience.status !== 'awaiting' || !draft.trim()} colour="#7c1f18" size="2.5em" seed={8} />
              </div>
            </div>
          )}
        </div>

        <SpymasterNote world={world} audience={audience} />
      </div>
      <Doors closing={audience.leaving} />
    </motion.div>
  );
}

/** Two oak doors: they swing open as the audience begins and close when you leave. */
function Doors({ closing }: { closing: boolean }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <AnimatePresence>
      <motion.div key="doors" className="pointer-events-none absolute inset-0 flex" aria-hidden>
        {[0, 1].map((side) => (
          <motion.div
            key={side}
            className="oak-door h-full w-1/2"
            initial={{ x: 0 }}
            animate={{ x: closing ? 0 : side === 0 ? '-101%' : '101%' }}
            transition={{ duration: closing ? 0.8 : 1.1, ease: [0.6, 0, 0.3, 1], delay: closing ? 0 : 0.1 }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
