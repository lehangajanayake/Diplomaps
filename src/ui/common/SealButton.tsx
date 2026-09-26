/** A button pressed like a wax seal. Used for weighty choices: Begin, Request an audience, Grant, Refuse. */
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { SealEmblem } from './Emblem';
import { WaxSeal } from './WaxSeal';

interface Props {
  label: ReactNode;
  onClick: () => void;
  colour?: string;
  emblem?: SealEmblem;
  disabled?: boolean;
  size?: string;
  hint?: string;
  seed?: number;
  className?: string;
}

export function SealButton({ label, onClick, colour = '#7c1f18', emblem = 'crossroads', disabled, size = '3.2em', hint, seed = 5, className }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.95, y: 1 }}
      className={`group inline-flex items-center gap-[0.55em] disabled:cursor-not-allowed disabled:opacity-45 ${className ?? ''}`}
    >
      <WaxSeal colour={colour} emblem={emblem} size={size} seed={seed} />
      <span className="font-sc text-[1rem] tracking-[0.06em] text-ink group-hover:text-wax group-disabled:text-ink-faded">{label}</span>
    </motion.button>
  );
}
