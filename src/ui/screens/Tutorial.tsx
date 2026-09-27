/**
 * The first game's tutorial: a spotlight on one thing and a card with one sentence. Steps the player
 * reads darken the table and wait for "Next"; steps the player does (open a dossier, hold an audience,
 * answer a letter, ring the bell) leave the table live and move on by themselves once done. Every step
 * can be skipped.
 */
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { endTutorial, nextTutorialStep } from '../../store/flow';
import { TUTORIAL } from '../../store/intro';
import { useStore } from '../../store/worldStore';
import { useTargetBox, type Box } from '../common/useTargetBox';

const CARD_W = 380;
const CARD_H = 150;

/**
 * Put the card beside the spotlight, always on screen: below it when the player reads, above it when the
 * player acts (what they need next, like an audience's text box, is usually below), else the other side.
 */
function cardPosition(box: Box | null, doing: boolean): { left: number; top: number } {
  if (!box) {
    return doing
      ? { left: window.innerWidth - CARD_W - 24, top: window.innerHeight - CARD_H - 24 }
      : { left: window.innerWidth / 2 - CARD_W / 2, top: window.innerHeight / 2 - CARD_H / 2 };
  }
  const below = box.top + box.height + 14;
  const above = box.top - CARD_H - 14;
  const fitsBelow = below + CARD_H < window.innerHeight;
  const top = doing ? (above >= 12 ? above : fitsBelow ? below : 12) : fitsBelow ? below : Math.max(12, above);
  const left = Math.min(Math.max(12, box.left + box.width / 2 - CARD_W / 2), window.innerWidth - CARD_W - 12);
  return { left, top };
}

export function Tutorial() {
  const step = useStore((s) => s.tutorialStep);
  const goal = useStore((s) => s.tutorialGoal);
  const current = step === null ? null : TUTORIAL[step];
  const visible = useStore((s) => !!current && (current.when?.(s) ?? true));
  const done = useStore((s) => !!current?.done?.(s));
  const target = useStore((s) => (current && goal ? current.target(s, goal) : null));
  const text = useStore((s) => (current && goal ? current.text(s, goal) : ''));
  const box = useTargetBox(visible ? target : null);
  const doing = !!current?.done;

  // A step the player does moves on as soon as it is done.
  useEffect(() => {
    if (done) nextTutorialStep();
  }, [done, step]);

  useEffect(() => {
    if (step === null || !visible) return;
    const onKey = (e: KeyboardEvent) => {
      // Keys belong to the table while the player is doing something (typing in an audience, say).
      if (doing) return;
      if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') nextTutorialStep();
      else if (e.key === 'Escape') endTutorial();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, visible, doing]);

  if (step === null || !current || !goal || !visible) return null;
  const last = step === TUTORIAL.length - 1;
  const pos = cardPosition(box, doing);
  return (
    <div className={`absolute inset-0 z-[70] ${doing ? 'pointer-events-none' : ''}`} role="dialog" aria-label="Tutorial" aria-live="polite">
      {/* While the tutorial speaks, the dark around the spotlight stops clicks reaching the table. */}
      {!doing && <div className="absolute inset-0" />}
      {box ? (
        <motion.div
          className={`pointer-events-none fixed rounded-[10px] ring-2 ${doing ? 'ring-gold-bright tutorial-pulse' : 'ring-gold-bright/80'}`}
          style={{ boxShadow: `0 0 0 9999px rgb(8 4 2 / ${doing ? 0.35 : 0.64}), 0 0 24px 4px rgb(255 200 110 / 0.35)` }}
          animate={{ left: box.left, top: box.top, width: box.width, height: box.height }}
          initial={false}
          transition={{ type: 'spring', stiffness: 170, damping: 24 }}
        />
      ) : (
        !doing && <div className="pointer-events-none absolute inset-0 bg-[rgb(8_4_2/0.64)]" />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="parchment pointer-events-auto fixed px-[1.2em] pb-[0.8em] pt-[0.9em] text-ink shadow-[0_12px_28px_rgb(0_0_0/0.6)]"
          style={{ left: pos.left, top: pos.top, width: CARD_W }}
          initial={{ opacity: 0, y: 10, rotate: -0.8 }}
          animate={{ opacity: 1, y: 0, rotate: -0.8 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          data-tutorial-card={step + 1}
        >
          <p className="font-sc text-[0.78rem] tracking-[0.14em] text-ink-faded">
            {step + 1} of {TUTORIAL.length}
            {doing && <span className="ml-[0.6em] text-wax">· your move</span>}
          </p>
          <p className="mt-[0.2em] font-body text-[1.15rem] font-medium leading-snug">{text}</p>
          <div className="mt-[0.7em] flex items-center justify-between">
            <button type="button" onClick={endTutorial} className="font-sc text-[0.85rem] text-ink-faded hover:text-wax">
              Skip the tutorial
            </button>
            <button type="button" onClick={nextTutorialStep} className={`font-sc tracking-[0.06em] hover:underline ${doing ? 'text-[0.88rem] text-ink-faded' : 'text-[1rem] text-wax'}`}>
              {last ? 'Finish ›' : doing ? 'Skip this step ›' : 'Next ›'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
