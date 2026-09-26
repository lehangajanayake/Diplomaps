/**
 * The audience hall. The table dims, the ruler appears in a gilded frame, and their words arrive like
 * handwriting. You write on a ruled parchment; four candles show how many messages remain.
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { sound } from '../../audio/sound';
import { CONFIG } from '../../engine/config';
import { greetingToneFor, suggestionsFor } from '../../engine/courtesy';
import { PROFILES } from '../../engine/nations';
import type { Mood } from '../../engine/schema';
import type { WorldState } from '../../engine/types';
import { exitAudience, leaveAudience, sendAudienceMessage } from '../../store/flow';
import { useStore, type AudienceState } from '../../store/worldStore';
import { Portrait } from '../common/Portrait';
import { SealButton } from '../common/SealButton';
import { trustWord } from '../hud/words';

const MOOD_WORD: Record<Mood, string> = {
  pleased: 'Pleased',
  warm: 'Warming to you',
  neutral: 'Guarded',
  wary: 'Wary',
  annoyed: 'Annoyed',
  angry: 'Angry',
};

function Candles({ used }: { used: number }) {
  return (
    <div className="flex items-end gap-[0.45em]" title={`${CONFIG.messagesPerAudience - used} of ${CONFIG.messagesPerAudience} messages left`}>
      {Array.from({ length: CONFIG.messagesPerAudience }, (_, i) => {
        const lit = i >= used;
        return (
          <svg key={i} viewBox="0 0 16 40" className="h-[2.2em] w-auto" aria-hidden>
            {lit && <ellipse cx="8" cy="7" rx="3.2" ry="6" fill="#ffc86a" style={{ transformOrigin: '8px 12px', animation: 'var(--animate-flame)' }} />}
            {lit && <circle cx="8" cy="8" r="8" fill="#ffb24a" opacity="0.25" />}
            {!lit && <path d="M8 12 C6 8 10 6 8 2" stroke="#8a7a6a" strokeWidth="0.8" fill="none" opacity="0.6" />}
            <path d="M8 13 L8 16" stroke="#1d130b" strokeWidth="1" />
            <rect x="4" y={lit ? 16 : 20} width="8" height={lit ? 20 : 16} rx="1.5" fill="#efe3c8" stroke="#9c8660" strokeWidth="0.6" />
            <rect x="2" y="36" width="12" height="3" rx="1" fill="#a88545" />
          </svg>
        );
      })}
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
  const cross = audience.mood === 'annoyed' || angry;
  const warm = audience.mood === 'pleased' || audience.mood === 'warm';
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center">
      <motion.div
        key={audience.moodTick}
        animate={angry && !reduce ? { x: [0, -7, 6, -4, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-[22rem]"
        style={{ perspective: 900 }}
      >
        <div className={`absolute -inset-[12%] rounded-full transition-opacity duration-1000 ${warm ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'radial-gradient(circle, rgb(255 196 110 / 0.45), transparent 65%)' }} />
        <div className="gilt-frame relative">
          <motion.div
            className="relative aspect-[5/6] overflow-hidden"
            animate={turnedAway ? { rotateY: 34, scale: 0.97, filter: 'brightness(0.32) saturate(0.6)' } : { rotateY: 0, scale: 1, filter: 'brightness(1) saturate(1)' }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          >
            <Portrait nation={audience.nation} className="h-full w-full" />
            <div className="pointer-events-none absolute inset-0 transition-colors duration-700" style={{ background: cross ? `rgb(150 20 10 / ${angry ? 0.32 : 0.16})` : 'transparent', mixBlendMode: 'multiply' }} />
            <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, transparent 50%, rgb(0 0 0 / 0.45))' }} />
          </motion.div>
        </div>
      </motion.div>
      <div className="brass-plate mt-[1.4vh] px-[1.4em] py-[0.35em] text-center">
        <div className="font-display text-[1.05rem] font-semibold tracking-[0.08em] text-[#2a1a08]">{p.ruler.name}</div>
        <div className="font-body text-[0.78rem] italic text-[#3b2a10]">{p.ruler.title}</div>
      </div>
      <div className={`mt-[0.8vh] font-sc text-[0.9rem] tracking-[0.12em] ${cross ? 'text-[#f08a5d]' : warm ? 'text-gold-bright' : 'text-parchment-300'}`}>
        {audience.calledAway ? 'Called away' : audience.endedByRuler ? 'Has turned away' : MOOD_WORD[audience.mood]}
      </div>
    </div>
  );
}

function Summary({ audience, world }: { audience: AudienceState; world: WorldState }) {
  const p = PROFILES[audience.nation];
  const r = audience.result;
  const first = p.ruler.name.split(' ')[0];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="border-t border-ink/25 pt-[0.8em]">
      <h3 className="font-sc text-[1rem] tracking-[0.08em] text-wax">
        {audience.calledAway ? `${first} is called away` : audience.endedByRuler ? `${first} ends the audience` : 'The audience is over'}
      </h3>
      {r ? (
        <div className="mt-[0.3em] space-y-[0.3em] font-body text-[0.9rem] leading-snug">
          <p>
            {first}&rsquo;s regard for you: <span className="italic">{trustWord(r.trustBefore)}</span> → <span className="italic">{trustWord(r.trustAfter)}</span>{' '}
            <span className={r.trustDelta >= 0 ? 'text-[#3d5a3a]' : 'text-ink-red'}>
              ({r.trustDelta >= 0 ? '+' : ''}
              {r.trustDelta})
            </span>
            {r.manipulation && <span className="text-ink-red"> Your strange words were taken as an insult.</span>}
          </p>
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
      <div className="mt-[0.8em] flex items-center justify-between">
        <SealButton label="Leave the hall" onClick={exitAudience} colour={p.colour} emblem={p.emblem} size="2.6em" seed={4} />
        <span className="font-hand text-[0.85rem] italic text-ink-faded">
          {CONFIG.audiencesPerSeason - world.audiencesThisSeason.length} audiences left this season
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
  useEffect(() => {
    if (!audience || !world || status !== 'awaiting' || audience.turns.length !== 1) return;
    const timer = window.setTimeout(() => sound.playGreeting(audience.nation, greetingToneFor(world, audience.nation)), 0);
    return () => window.clearTimeout(timer);
  }, [audience, world, status]);
  useEffect(() => () => sound.stopSpeech(), []);

  if (!audience || !world) return null;
  const p = PROFILES[audience.nation];
  const first = p.ruler.name.split(' ')[0];
  const used = audience.turns.filter((t) => t.role === 'player').length;
  const ideas = suggestionsFor(world, audience.nation);
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
      <div className="relative grid h-full grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] gap-[3vw] px-[5vw] py-[5vh]">
        <PortraitFrame audience={audience} />

        <div className="parchment relative flex min-h-0 flex-col px-[1.6em] pb-[1.1em] pt-[1.2em]">
          <header className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-display text-[1.3rem] font-semibold tracking-[0.1em]">An audience with {p.ruler.name}</h2>
              <p className="font-body text-[0.85rem] italic text-ink-soft">
                {p.name}, {p.epithet}
              </p>
            </div>
            <Candles used={used} />
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
              <div className="mt-[0.3em] flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex flex-wrap items-center gap-x-[0.7em] font-body text-[0.82rem] text-ink-soft">
                  <span className="font-sc text-ink">Ideas:</span>
                  {ideas.map((idea) => (
                    <button
                      key={idea.label}
                      type="button"
                      disabled={audience.status !== 'awaiting'}
                      onClick={() => {
                        setDraft(idea.text);
                        inputRef.current?.focus();
                      }}
                      className="italic underline decoration-ink/40 decoration-dotted underline-offset-2 hover:text-wax disabled:opacity-50"
                    >
                      {idea.label}
                    </button>
                  ))}
                </div>
                <SealButton label="Speak" onClick={send} disabled={audience.status !== 'awaiting' || !draft.trim()} colour="#7c1f18" size="2.5em" seed={8} />
              </div>
              <div className="mt-[0.4em] flex flex-wrap items-center justify-between gap-2 font-body text-[0.8rem] text-ink-soft">
<span />
                <button type="button" onClick={() => void leaveAudience()} disabled={audience.status !== 'awaiting'} className="font-sc text-ink-faded hover:text-wax disabled:opacity-40">
                  Take your leave
                </button>
              </div>
            </div>
          )}
        </div>
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
