/**
 * The first game's tutorial: the table darkens around one thing at a time and a card says what it is,
 * in one sentence. Every step can be skipped.
 */
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { endTutorial, nextTutorialStep } from '../../store/flow';
import { TUTORIAL } from '../../store/intro';
import { useStore } from '../../store/worldStore';

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const PAD = 8;

/** Where the step's target sits on screen, followed while it slides into place. */
function useTargetBox(target: string | null): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    if (!target) return;
    let frame = 0;
    const measure = () => {
      const el = document.querySelector(`[data-tutorial="${target}"]`);
      const r = el?.getBoundingClientRect();
      const next = r && r.width > 0 ? { left: r.left - PAD, top: r.top - PAD, width: r.width + PAD * 2, height: Math.max(r.height, 12) + PAD * 2 } : null;
      setBox((prev) => (prev && next && Math.abs(prev.left - next.left) + Math.abs(prev.top - next.top) + Math.abs(prev.width - next.width) + Math.abs(prev.height - next.height) < 1 ? prev : next));
      frame = window.requestAnimationFrame(measure);
    };
    frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);
  return box;
}

/** Put the card beside the spotlight: below it if there is room, otherwise above, and always on screen. */
function cardPosition(box: Box | null): { left: number; top: number } {
  const w = 380;
  const h = 150;
  if (!box) return { left: window.innerWidth / 2 - w / 2, top: window.innerHeight / 2 - h / 2 };
  const below = box.top + box.height + 14;
  const top = below + h < window.innerHeight ? below : Math.max(12, box.top - h - 14);
  const left = Math.min(Math.max(12, box.left + box.width / 2 - w / 2), window.innerWidth - w - 12);
  return { left, top };
}

export function Tutorial() {
  const step = useStore((s) => s.tutorialStep);
  const current = step === null ? null : TUTORIAL[step];
  const box = useTargetBox(current?.target ?? null);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') nextTutorialStep();
      else if (e.key === 'Escape') endTutorial();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  if (step === null || !current) return null;
  const last = step === TUTORIAL.length - 1;
  const pos = cardPosition(box);
  return (
    <div className="absolute inset-0 z-[70]" role="dialog" aria-label="Tutorial" aria-live="polite">
      {/* The dark around the spotlight also stops clicks reaching the table while the tutorial speaks. */}
      <div className="absolute inset-0" />
      {box ? (
        <motion.div
          className="pointer-events-none fixed rounded-[10px] ring-2 ring-gold-bright/80"
          style={{ boxShadow: '0 0 0 9999px rgb(8 4 2 / 0.64), 0 0 24px 4px rgb(255 200 110 / 0.35)' }}
          animate={{ left: box.left, top: box.top, width: box.width, height: box.height }}
          initial={false}
          transition={{ type: 'spring', stiffness: 170, damping: 24 }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[rgb(8_4_2/0.64)]" />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="parchment fixed w-[380px] px-[1.2em] pb-[0.8em] pt-[0.9em] text-ink shadow-[0_12px_28px_rgb(0_0_0/0.6)]"
          style={{ left: pos.left, top: pos.top }}
          initial={{ opacity: 0, y: 10, rotate: -0.8 }}
          animate={{ opacity: 1, y: 0, rotate: -0.8 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          data-tutorial-card={step + 1}
        >
          <p className="font-sc text-[0.78rem] tracking-[0.14em] text-ink-faded">
            {step + 1} of {TUTORIAL.length}
          </p>
          <p className="mt-[0.2em] font-body text-[1.2rem] font-medium leading-snug">{current.text}</p>
          <div className="mt-[0.7em] flex items-center justify-between">
            <button type="button" onClick={endTutorial} className="font-sc text-[0.85rem] text-ink-faded hover:text-wax">
              Skip the tutorial
            </button>
            <button type="button" onClick={nextTutorialStep} className="font-sc text-[1rem] tracking-[0.06em] text-wax hover:underline">
              {last ? 'Begin the game ›' : 'Next ›'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
