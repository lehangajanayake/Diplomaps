/**
 * Words in an audience, with every region's name marked: hover a place a ruler (or the Warden) names to
 * see who holds it now, under its holder's seal.
 */
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PROFILES } from '../../engine/nations';
import { CROSSING, UNCLAIMED, type RegionId, type WorldState } from '../../engine/types';
import { ownerInk } from '../map/palette';
import { WaxSeal } from '../common/WaxSeal';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Who holds a region, in words: "Varrow", "your valley", "no one: ruins". */
function holderWords(world: WorldState, id: RegionId): string {
  const owner = world.regions[id]!.owner;
  if (owner === CROSSING) return 'your valley, the Crossing';
  if (owner === UNCLAIMED) return 'no one: ruins, free to claim';
  return PROFILES[owner].name;
}

/** The note that says who holds a place, drawn above everything and kept on screen. */
function HolderNote({ world, id, text, at }: { world: WorldState; id: RegionId; text: string; at: DOMRect }) {
  const owner = world.regions[id]!.owner;
  const nation = owner !== CROSSING && owner !== UNCLAIMED ? PROFILES[owner] : null;
  const capital = world.map.regions[id]!.capital;
  const width = 280;
  const left = Math.min(Math.max(8, at.left + at.width / 2 - width / 2), window.innerWidth - width - 8);
  return createPortal(
    <span
      role="tooltip"
      className="pointer-events-none fixed z-[80] flex items-center gap-[0.45em] border border-ink/30 px-[0.6em] py-[0.3em] font-body text-[0.9rem] leading-snug text-ink shadow-lg"
      style={{ left, bottom: window.innerHeight - at.top + 6, maxWidth: width, background: 'linear-gradient(170deg, #f3e7c6, #e3d0a4)' }}
    >
      <WaxSeal colour={nation ? nation.colour : owner === CROSSING ? '#8a6a26' : '#8a8272'} emblem={nation ? nation.emblem : 'crossroads'} size="1.5em" seed={id.length} />
      <span>
        <span className="font-sc">{text}</span>
        {capital ? ' (a capital)' : ''} is held by <span className="font-sc">{holderWords(world, id)}</span>.
      </span>
    </span>,
    document.body,
  );
}

function Place({ world, id, text }: { world: WorldState; id: RegionId; text: string }) {
  const [at, setAt] = useState<DOMRect | null>(null);
  const show = (e: { currentTarget: HTMLElement }) => setAt(e.currentTarget.getBoundingClientRect());
  return (
    <span
      className="cursor-help whitespace-nowrap underline decoration-dotted decoration-2 underline-offset-[3px]"
      style={{ textDecorationColor: ownerInk(world.regions[id]!.owner) }}
      tabIndex={0}
      onMouseEnter={show}
      onFocus={show}
      onMouseLeave={() => setAt(null)}
      onBlur={() => setAt(null)}
    >
      {text}
      {at && <HolderNote world={world} id={id} text={text} at={at} />}
    </span>
  );
}

export function PlaceText({ world, text }: { world: WorldState; text: string }) {
  // Longest names first, so "High Redpeak" is found before a shorter name inside it.
  const { pattern, byName } = useMemo(() => {
    const byName = new Map(world.map.regionIds.map((id) => [world.map.regions[id]!.name.toLowerCase(), id] as const));
    const names = [...byName.keys()].sort((a, b) => b.length - a.length).map(escape);
    return { pattern: names.length ? new RegExp(`\\b(${names.join('|')})\\b`, 'gi') : null, byName };
  }, [world.map]);
  if (!pattern) return <>{text}</>;
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) => {
        const id = i % 2 === 1 ? byName.get(part.toLowerCase()) : undefined;
        return id ? <Place key={i} world={world} id={id} text={part} /> : <span key={i}>{part}</span>;
      })}
    </>
  );
}
