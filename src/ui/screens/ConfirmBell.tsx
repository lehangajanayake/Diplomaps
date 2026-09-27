/** Before the bell rings on something urgent left undone: one line, and the choice to ring anyway. */
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { cancelRing, confirmRing } from '../../store/flow';
import { useStore } from '../../store/worldStore';
import { SealButton } from '../common/SealButton';

export function ConfirmBell() {
  const warning = useStore((s) => s.confirmBell);
  useEffect(() => {
    if (!warning) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelRing();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [warning]);
  return (
    <AnimatePresence>
      {warning && (
        <motion.div className="absolute inset-0 z-[48] flex items-center justify-center bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={cancelRing}>
          <motion.article
            onClick={(e) => e.stopPropagation()}
            className="parchment w-[min(460px,80vw)] px-[1.6em] pb-[1em] pt-[1.1em] text-center text-ink"
            initial={{ y: 20, rotate: -1, opacity: 0 }}
            animate={{ y: 0, rotate: -0.5, opacity: 1 }}
            exit={{ opacity: 0 }}
            role="alertdialog"
            aria-label="Ring the bell?"
          >
            <h2 className="font-display text-[1.2rem] font-semibold tracking-[0.06em]">Ring the bell now?</h2>
            <p className="mt-[0.4em] font-body text-[1.05rem] leading-snug">{warning}</p>
            <div className="mt-[0.9em] flex items-center justify-center gap-[1.6em]">
              <SealButton label="Not yet" onClick={cancelRing} colour="#3f5a3a" seed={61} size="2.4em" />
              <SealButton label="Ring anyway" onClick={confirmRing} colour="#7c1f18" seed={62} size="2.4em" />
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
