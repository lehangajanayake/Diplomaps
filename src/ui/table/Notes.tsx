/** Small slips of paper that land on the table when something important happens. */
import { AnimatePresence, motion } from 'motion/react';
import { useStore } from '../../store/worldStore';
import { WaxSeal } from '../common/WaxSeal';

export function Notes() {
  const notes = useStore((s) => s.notes);
  return (
    <div className="pointer-events-none absolute bottom-[4.5vh] left-1/2 z-[60] flex w-[min(560px,50vw)] -translate-x-1/2 flex-col items-center gap-[0.6vh]">
      <AnimatePresence>
        {notes.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 24, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: n.id % 2 ? -1 : 1 }}
            exit={{ opacity: 0, y: 12 }}
            className="flex items-center gap-[0.6em] px-[1em] py-[0.5em] font-body text-[0.9rem] text-ink"
            style={{ background: 'linear-gradient(170deg, #f1e4c2, #dcc697)', boxShadow: '0 6px 16px rgb(0 0 0 / 0.55)' }}
            role="status"
          >
            <WaxSeal colour={n.tone === 'danger' ? '#8e2417' : n.tone === 'good' ? '#3d5a3a' : '#6a4a1a'} size="1.6em" seed={n.id} />
            <span className={n.tone === 'danger' ? 'text-ink-red' : ''}>{n.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
