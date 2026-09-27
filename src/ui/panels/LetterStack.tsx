/** This season's letters lying on the table: sealed ones waiting to be opened, answered ones showing the answer. */
import { motion } from 'motion/react';
import { nameOf, PROFILES } from '../../engine/nations';
import { letterAnswers } from '../../engine/letters';
import type { Letter, LetterKind, WorldState } from '../../engine/types';
import { WaxSeal } from '../common/WaxSeal';

const KIND_LABEL: Record<LetterKind, string> = {
  attack: 'An army marches on you',
  threat: 'An army at your border',
  raid: 'Raiders at the border',
  passage: 'Asks to march through',
  help: 'Asks you to shut a pass',
  spoils: 'Offers you the spoils',
  talks: 'Would talk peace',
  trade: 'Caravans on the road',
  last: 'A last letter',
  angry: 'An angry letter',
};

/** The more letters on the table, the tighter they overlap, so the chronicle above keeps its room. */
const STACKING = ['', 'gap-[1vh]', 'gap-[1vh]', '[&>*+*]:-mt-[1.3vh]', '[&>*+*]:-mt-[2.6vh]'];

export function LetterStack({ world, letters, onOpen }: { world: WorldState; letters: Letter[]; onOpen: (id: string) => void }) {
  return (
    <div className={`relative flex flex-col ${STACKING[Math.min(letters.length, 4)]}`} data-tutorial="letters">
      {letters.map((letter, i) => {
        const nation = PROFILES[letter.from];
        const chosen = letter.choice ? letterAnswers(world, letter).find((a) => a.id === letter.choice) : undefined;
        return (
          <motion.button
            key={letter.id}
            type="button"
            initial={{ opacity: 0, y: -30, rotate: -12 }}
            animate={{ opacity: 1, y: 0, rotate: i % 2 ? 2.5 : -3 }}
            whileHover={{ y: -4, rotate: 0, zIndex: 5, transition: { duration: 0.2 } }}
            transition={{ delay: 0.15 * i, type: 'spring', stiffness: 120, damping: 14 }}
            onClick={() => onOpen(letter.id)}
            data-letter-id={letter.id}
            aria-label={`Letter from ${nameOf(letter.from)}: ${chosen ? `your answer, ${chosen.label}. Open to change it.` : KIND_LABEL[letter.kind]}`}
            className={`relative flex items-center gap-[0.6em] px-[0.8em] py-[0.55em] text-left text-ink ${chosen ? 'opacity-80' : ''}`}
            style={{
              background: 'linear-gradient(160deg, #efe0bb 0%, #dcc697 60%, #cdb483 100%)',
              boxShadow: '0 6px 14px rgb(0 0 0 / 0.55), inset 0 0 14px rgb(120 80 30 / 0.35)',
            }}
          >
            <span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(135deg, transparent 49.4%, rgb(90 60 25 / 0.25) 50%, transparent 50.6%), linear-gradient(45deg, transparent 49.4%, rgb(90 60 25 / 0.18) 50%, transparent 50.6%)' }} />
            <WaxSeal colour={nation.colour} emblem={nation.emblem} size="2.4em" seed={letter.id.length + i} cracked={letter.kind === 'last'} />
            <span className="relative leading-tight">
              <span className="block font-sc text-[0.82rem]">From {nameOf(letter.from)}</span>
              {chosen ? (
                <span className="block font-hand text-[0.74rem] italic text-[#3d5a3a]">Your answer: {chosen.label}</span>
              ) : (
                <span className="block font-hand text-[0.74rem] italic text-ink-faded">{KIND_LABEL[letter.kind]}</span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
