/** A small leather handbook on the table: the rules on one page, and the tutorial again. */
import { openHandbook } from '../../store/flow';

export function HandbookBook() {
  return (
    <button type="button" onClick={openHandbook} className="group flex items-center gap-[0.4em]" title="The Warden's handbook: the rules, and the tutorial again">
      <svg viewBox="0 0 44 40" className="h-[4.2vh] min-h-[26px] w-auto transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden>
        <ellipse cx="22" cy="37" rx="18" ry="2.6" fill="#000" opacity="0.4" />
        <path d="M6 8 L34 5 L38 31 L10 34 Z" fill="#3f5a3a" stroke="#1c2a18" strokeWidth="1" />
        <path d="M10 34 L38 31 L38 33.5 L10 36.5 Z" fill="#e8d9b4" stroke="#7a6a4a" strokeWidth="0.6" />
        <path d="M14 13 L30 11.3 M15 17 L28 15.6" stroke="#c9a24a" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="22" cy="24" r="3.4" fill="none" stroke="#c9a24a" strokeWidth="1" />
      </svg>
      <span className="font-sc text-[0.72rem] tracking-[0.1em] text-parchment-300/80 group-hover:text-gold-bright">handbook</span>
    </button>
  );
}
