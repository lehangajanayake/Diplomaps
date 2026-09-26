/** First-season notes in the Keeper's hand: open a dossier, hold an audience, ring the bell. */
import { AnimatePresence, motion } from 'motion/react';
import { dismissTutorial, tutorialSeen } from '../../store/flow';
import { useStore } from '../../store/worldStore';

const NOTES: Record<number, { text: string; where: string }> = {
  0: {
    text: 'Click any nation on the map to read its dossier: who rules it, what they want, and how they regard you.',
    where: 'left-[calc(var(--left-col)+6vw)] top-[calc(var(--top)+3vh)]',
  },
  1: {
    text: 'Request an audience. Speak freely: promise, flatter, warn, or lie. Every promise is written in your ledger, and the courts gossip.',
    where: 'right-[calc(var(--right-col)+3.2vw+min(34vw,470px))] bottom-[7vh]',
  },
  3: {
    text: 'You may hold three audiences each season. Answer any sealed letters, then ring the bell to end the season.',
    where: 'right-[calc(var(--right-col)+3vw)] bottom-[10vh]',
  },
};

export function Tutorial() {
  const step = useStore((s) => s.tutorialStep);
  const dismissed = useStore((s) => s.tutorialDismissed);
  const season = useStore((s) => s.world?.season ?? 1);
  const audience = useStore((s) => s.audience);
  const resolving = useStore((s) => s.resolving);
  const note = NOTES[step];
  const show = !dismissed && !tutorialSeen() && season === 1 && !audience && !resolving && !!note;
  return (
    <AnimatePresence>
      {show && note && (
        <motion.div
          key={step}
          className={`absolute z-30 w-[min(300px,24vw)] px-[1em] pb-[0.7em] pt-[1em] text-ink ${note.where}`}
          style={{ background: 'linear-gradient(170deg, #f3e7c6, #dfca9a)', boxShadow: '0 8px 18px rgb(0 0 0 / 0.55), inset 0 0 14px rgb(120 80 30 / 0.3)' }}
          initial={{ opacity: 0, y: -16, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: step % 2 ? 1.8 : -1.8 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          role="note"
        >
          <span className="absolute -top-[7px] left-1/2 h-[14px] w-[14px] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #d65a4a, #7c1f18 60%, #3a0b08)', boxShadow: '0 2px 3px rgb(0 0 0 / 0.5)' }} />
          <p className="font-hand text-[0.98rem] italic leading-snug">{note.text}</p>
          <div className="mt-[0.5em] flex justify-end">
            <button type="button" onClick={dismissTutorial} className="font-sc text-[0.8rem] text-ink-faded hover:text-wax">
              no more notes ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
