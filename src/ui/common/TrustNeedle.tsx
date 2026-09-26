/** A small inked dial: the needle leans left toward hatred and right toward trust, and swings when it changes. */
import { motion } from 'motion/react';

export function TrustNeedle({ value, className }: { value: number; className?: string }) {
  const angle = Math.max(-100, Math.min(100, value)) * 0.8;
  return (
    <svg viewBox="-12 -11.5 24 13" className={className} role="img" aria-label={`Trust ${Math.round(value)}`}>
      <path d="M-10 0 A10 10 0 0 1 10 0" fill="none" stroke="#3b2b1d" strokeWidth={1} opacity={0.7} />
      <path d="M-10 0 A10 10 0 0 1 -6.4 -7.7" fill="none" stroke="#8e2417" strokeWidth={2.4} />
      <path d="M6.4 -7.7 A10 10 0 0 1 10 0" fill="none" stroke="#3d5a3a" strokeWidth={2.4} />
      <path d="M0 -10.4 V-8.6" stroke="#3b2b1d" strokeWidth={0.8} />
      <motion.path
        d="M0 0 L0 -9"
        stroke="#21160e"
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={false}
        animate={{ rotate: angle }}
        transition={{ type: 'spring', stiffness: 70, damping: 9 }}
        style={{ originX: 0.5, originY: 1 }}
      />
      <circle r={1.7} fill="#21160e" />
    </svg>
  );
}
