/** A small inked stamp marking something the Warden's own actions brought about. */
export function YourDoing({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block -rotate-2 whitespace-nowrap border border-wax/70 px-[0.35em] font-sc text-[0.72rem] leading-[1.35] tracking-[0.08em] text-wax ${className}`}
      title="Something you did helped bring this about."
    >
      Your doing
    </span>
  );
}

/** "…because you let Varrow's army through." in small italic, with the stamp when it was the Warden's doing. */
export function BecauseLine({ why, yours, className = '' }: { why: string; yours?: boolean; className?: string }) {
  return (
    <span className={`block font-body text-[0.9rem] italic leading-snug text-ink-soft ${className}`}>
      because {why}. {yours && <YourDoing className="not-italic" />}
    </span>
  );
}
