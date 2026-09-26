/** After the bell: what the season did to you first, then what it did to the realm. */
import { AnimatePresence, motion } from 'motion/react';
import { seasonTitle } from '../../engine/config';
import type { SummaryLine } from '../../engine/types';
import { continueAfterSummary } from '../../store/flow';
import { useStore } from '../../store/worldStore';
import { Arrow } from '../common/Arrow';
import { SealButton } from '../common/SealButton';

function Lines({ title, lines }: { title: string; lines: SummaryLine[] }) {
  return (
    <section className="text-left">
      <h3 className="font-sc text-[0.95rem] tracking-[0.1em] text-wax">{title}</h3>
      <ul className="mt-[0.3em] space-y-[0.25em]">
        {lines.map((l, i) => (
          <motion.li
            key={i}
            className="flex items-baseline gap-[0.5em] font-body text-[1.05rem] leading-snug"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.12 }}
          >
            <Arrow tone={l.tone} />
            <span>{l.text}</span>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

export function WhatChanged() {
  const summary = useStore((s) => s.summary);
  return (
    <AnimatePresence>
      {summary && (
        <motion.div
          key={summary.season}
          className="absolute inset-0 z-[45] flex items-center justify-center bg-black/35"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.article
            initial={{ y: 40, rotate: 2, opacity: 0 }}
            animate={{ y: 0, rotate: 0.5, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 110, damping: 16 }}
            className="parchment w-[min(560px,58vw)] px-[2em] pb-[1.3em] pt-[1.3em] text-center text-ink"
            role="dialog"
            aria-label="What changed this season"
          >
            <p className="font-sc text-[0.85rem] tracking-[0.18em] text-ink-faded">The end of {seasonTitle(summary.season)}</p>
            <h2 className="mt-[0.2em] font-display text-[1.5rem] font-semibold tracking-[0.06em]">What changed</h2>
            <div className="mt-[0.8em] grid gap-[1em] sm:grid-cols-2">
              <Lines title="Affects you" lines={summary.you.length ? summary.you : [{ text: 'Nothing touched the Crossing', tone: 'neutral' }]} />
              <Lines title="Across the realm" lines={summary.realm} />
            </div>
            <div className="mt-[1.1em] flex justify-center">
              <SealButton label="Continue" onClick={continueAfterSummary} seed={14} size="2.8em" />
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
