/** The full chronicle: every season told at length by the chronicler, oldest first. */
import { motion } from 'motion/react';
import type { ChronicleEntry } from '../../engine/types';
import { closeOverlay } from '../../store/flow';

export function ChronicleBook({ entries }: { entries: ChronicleEntry[] }) {
  return (
    <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} onClick={closeOverlay}>
      <motion.article
        onClick={(e) => e.stopPropagation()}
        initial={{ scaleY: 0.1, y: 30 }}
        animate={{ scaleY: 1, y: 0 }}
        exit={{ scaleY: 0.1, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 110, damping: 17 }}
        className="parchment relative max-h-[80vh] w-[min(620px,82vw)] origin-top overflow-y-auto px-[2em] pb-[1.4em] pt-[1.5em] text-ink"
        role="dialog"
        aria-label="The full chronicle"
      >
        <h2 className="text-center font-display text-[1.3rem] font-semibold tracking-[0.14em]">THE CHRONICLE OF THE CROSSING</h2>
        <div className="mx-auto mb-[1em] mt-[0.3em] h-px w-1/2 bg-ink/40" />
        {entries.map((entry) => (
          <section key={entry.season} className="mb-[1em]">
            <h3 className="font-sc text-[0.95rem] tracking-[0.06em] text-wax">{entry.title}</h3>
            {entry.lines.length > 0 ? (
              entry.lines.map((line, i) => (
                <p key={i} className="mt-[0.3em] font-body text-[0.98rem] leading-relaxed">
                  {line}
                </p>
              ))
            ) : (
              <p className="mt-[0.3em] font-hand text-[0.95rem] italic text-ink-faded">The chronicler is still writing this season…</p>
            )}
          </section>
        ))}
        <button type="button" onClick={closeOverlay} className="absolute right-[1em] top-[0.8em] font-sc text-[0.85rem] text-ink-faded hover:text-wax">
          close ✕
        </button>
      </motion.article>
    </motion.div>
  );
}
