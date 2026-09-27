/** The Warden's handbook: the whole game on one illustrated page, and the tutorial again. */
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { CONFIG } from '../../engine/config';
import { closeOverlay, replayPrologue, replayTutorial } from '../../store/flow';
import { BeatIcon } from '../common/BeatIcon';
import { SealButton } from '../common/SealButton';
import { GateIcon } from './PassControl';

const icon = 'h-[1.5em] w-[1.5em] shrink-0 text-ink';

function Speech() {
  return (
    <svg viewBox="-8 -8 16 16" className={icon} aria-hidden>
      <path d="M-6.5 -5 H6.5 V3 H-1 L-4.5 6 V3 H-6.5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function Letter() {
  return (
    <svg viewBox="-8 -8 16 16" className={icon} aria-hidden>
      <path d="M-7 -4.5 H7 V5 H-7 Z M-7 -4.5 L0 1 L7 -4.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cy={1.4} r={1.6} fill="#8e2417" />
    </svg>
  );
}

function Bell() {
  return (
    <svg viewBox="-8 -8 16 16" className={icon} aria-hidden>
      <path d="M-5 3 C-5 -5 5 -5 5 3 L6.5 4.5 H-6.5 Z M0 -6 V-4.3 M-1.4 6 A1.4 1.4 0 0 0 1.4 6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

const RULES: { icon: ReactNode; text: string }[] = [
  { icon: <BeatIcon kind="gain" className={icon} />, text: `You rule the Crossing, a small valley every road runs through. Achieve your ambition in ${CONFIG.seasons} seasons.` },
  { icon: <Speech />, text: 'Talk to rulers. Promise, warn or lie: they remember, and they gossip.' },
  { icon: <Letter />, text: 'Answer letters with one click. Unanswered letters take their default.' },
  { icon: <BeatIcon kind="war" className={icon} />, text: `Call in a favour: a nation that trusts you ${CONFIG.favours.minTrust} or more goes to war on your word.` },
  { icon: <GateIcon closed className={icon} />, text: "Close a pass to stop a nation's armies and caravans. It costs you tolls and its trust." },
  { icon: <BeatIcon kind="capture" className={icon} />, text: 'Claim ruins beside your valley. Land makes you rich and strong, and makes you a target.' },
  { icon: <Bell />, text: 'Ring the bell to end the season and see what changed.' },
  { icon: <BeatIcon kind="collapse" className={icon} />, text: 'You lose if Wayhold falls, or if three courts are sure you lie.' },
];

export function Handbook() {
  return (
    <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} onClick={closeOverlay}>
      <motion.article
        onClick={(e) => e.stopPropagation()}
        initial={{ rotateY: -60, scale: 0.85, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        exit={{ rotateY: 50, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 16 }}
        className="parchment relative w-[min(560px,84vw)] px-[2em] pb-[1.3em] pt-[1.4em] text-ink"
        role="dialog"
        aria-label="The Warden's handbook"
      >
        <h2 className="text-center font-display text-[1.3rem] font-semibold tracking-[0.14em]">THE WARDEN&rsquo;S HANDBOOK</h2>
        <div className="mx-auto mb-[0.8em] mt-[0.3em] h-px w-1/2 bg-ink/40" />
        <ul className="space-y-[0.55em]">
          {RULES.map((r) => (
            <li key={r.text} className="flex items-start gap-[0.8em] font-body text-[1rem] leading-snug">
              {r.icon}
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-[1em] flex items-center justify-between">
          <span className="flex flex-wrap gap-x-[1.2em] gap-y-[0.4em]">
            <SealButton label="Replay the prologue" onClick={replayPrologue} colour="#8a6a26" seed={82} size="2.4em" />
            <SealButton label="Replay the tutorial" onClick={replayTutorial} colour="#3f5a3a" seed={81} size="2.4em" />
          </span>
          <button type="button" onClick={closeOverlay} className="font-sc text-[0.9rem] text-ink-faded hover:text-wax">
            close ✕
          </button>
        </div>
      </motion.article>
    </motion.div>
  );
}
