/**
 * The Warden's agenda: a small note pinned to the corner of the map with the next few useful moves,
 * most urgent first. Each opens what it names; the matching object on the table glows. Moves done
 * this season stay on the note, ticked off, until the season turns.
 */
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { agenda, AGENDA_SHOWN, wordItems, WORDS_SHOWN, type AgendaItem } from '../../engine/agenda';
import type { WorldState } from '../../engine/types';
import { dismissPromise, followAgenda } from '../../store/flow';
import { useStore } from '../../store/worldStore';
import { AgendaGlow } from './AgendaGlow';

const MARK: Record<AgendaItem['tone'], { glyph: string; colour: string; label: string }> = {
  danger: { glyph: '⚔', colour: 'text-ink-red', label: 'Danger' },
  warning: { glyph: '!', colour: 'text-wax', label: 'Warning' },
  chance: { glyph: '✦', colour: 'text-[#3d5a3a]', label: 'A chance' },
  info: { glyph: '•', colour: 'text-ink-soft', label: 'Next' },
};

/** The object on the table an agenda item is about, as a CSS selector; null when it has none (ruins on the map). */
function glowTarget(item: AgendaItem): string | null {
  switch (item.action.kind) {
    case 'letter':
      return `[data-letter-id="${item.action.id}"]`;
    case 'dossier':
      return `[data-court="${item.action.nation}"]`;
    case 'bell':
      return '[data-tutorial="bell"]';
    default:
      return null;
  }
}

/** Items shown this season that are no longer needed at all (not merely outranked): done, so ticked off. */
function useTicked(season: number, shown: AgendaItem[], all: AgendaItem[]): AgendaItem[] {
  const seen = useStore((s) => s.agendaSeen);
  useEffect(() => {
    const current = seen.season === season ? seen.items : [];
    const fresh = shown.filter((i) => !current.some((c) => c.id === i.id));
    if (fresh.length > 0 || seen.season !== season) useStore.setState({ agendaSeen: { season, items: [...current, ...fresh] } });
  }, [season, shown, seen]);
  const current = seen.season === season ? seen.items : [];
  return current.filter((c) => !all.some((i) => i.id === c.id) && c.action.kind !== 'bell');
}

export function Agenda({ world }: { world: WorldState }) {
  const items = useMemo(() => agenda(world), [world]);
  const shown = useMemo(() => items.slice(0, AGENDA_SHOWN), [items]);
  const done = useTicked(world.season, shown, items).slice(-2);
  const [hover, setHover] = useState<AgendaItem | null>(null);
  const quiet = useStore((s) => !!s.selectedNation || !!s.overlay || !!s.audience || s.tutorialStep !== null || s.crisisOpen || !!s.summary || s.resolving);
  const words = useMemo(() => wordItems(world).slice(0, WORDS_SHOWN), [world]);
  const glowing = hover ?? shown[0] ?? null;
  return (
    <>
      <motion.aside
        className="absolute right-[1.6%] top-[2.2%] z-[15] w-[27%] min-w-[230px] max-w-[340px] rotate-[0.8deg] px-[0.8em] pb-[0.5em] pt-[0.45em] text-ink"
        style={{
          background: 'linear-gradient(170deg, #f3e7c6, #e3d0a4)',
          boxShadow: '0 3px 8px rgb(0 0 0 / 0.45), inset 0 0 14px rgb(120 80 30 / 0.3)',
        }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        aria-label="The Warden's agenda"
        data-tutorial="agenda"
      >
        {/* A brass pin holds the note to the map. */}
        <span className="absolute -top-[0.35em] left-1/2 h-[0.8em] w-[0.8em] -translate-x-1/2 rounded-full border border-[#4a3310] bg-[#c9a24a] shadow" aria-hidden />
        <h2 className="text-center font-sc text-[0.78rem] tracking-[0.14em] text-ink-soft">Your agenda</h2>
        <ul className="mt-[0.15em] space-y-[0.1em]">
          {shown.map((item) => {
            const m = MARK[item.tone];
            const clickable = item.action.kind !== 'bell';
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => followAgenda(item.action)}
                  onMouseEnter={() => setHover(item)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(item)}
                  onBlur={() => setHover(null)}
                  className={`group flex w-full items-baseline gap-[0.45em] px-[0.25em] py-[0.12em] text-left font-body text-[0.9rem] leading-snug transition-colors hover:bg-[rgb(120_80_30/0.12)] focus-visible:outline-2 focus-visible:outline-wax ${clickable ? '' : 'cursor-default'}`}
                  title={clickable ? 'Open it' : 'The bell stands at the bottom right of the table.'}
                >
                  <span className={`w-[0.9em] shrink-0 text-center font-bold ${m.colour}`} aria-label={m.label}>
                    {m.glyph}
                  </span>
                  <span className={`${item.tone === 'danger' ? 'text-ink-red' : ''} ${clickable ? 'group-hover:underline decoration-ink/30 underline-offset-2' : ''}`}>{item.text}</span>
                </button>
              </li>
            );
          })}
          {done.map((item) => (
            <li key={`done-${item.id}`} className="flex items-baseline gap-[0.45em] px-[0.25em] font-body text-[0.84rem] leading-snug text-ink-faded">
              <span className="w-[0.9em] shrink-0 text-center text-[#3d5a3a]" aria-label="Done">
                ✓
              </span>
              <span className="line-through decoration-ink/40">{item.text}</span>
            </li>
          ))}
        </ul>
        {words.length > 0 && (
          <>
            <h3 className="mt-[0.3em] border-t border-ink/20 pt-[0.2em] text-center font-sc text-[0.72rem] tracking-[0.14em] text-ink-soft">Your word</h3>
            <ul className="space-y-[0.1em]">
              {words.map((wd) => (
                <li key={wd.id} className="flex items-baseline gap-[0.2em]">
                  <button
                    type="button"
                    onClick={() => followAgenda(wd.action)}
                    className="group flex flex-1 items-baseline gap-[0.45em] px-[0.25em] py-[0.12em] text-left font-body text-[0.86rem] leading-snug hover:bg-[rgb(120_80_30/0.12)] focus-visible:outline-2 focus-visible:outline-wax"
                    title="Open it"
                  >
                    <span className="w-[0.9em] shrink-0 text-center text-wax" aria-hidden>
                      ✎
                    </span>
                    <span className="group-hover:underline decoration-ink/30 underline-offset-2">{wd.text}</span>
                  </button>
                  {wd.dismissable && (
                    <button
                      type="button"
                      onClick={() => dismissPromise(wd.entry)}
                      className="shrink-0 px-[0.2em] font-sc text-[0.74rem] text-ink-faded hover:text-wax"
                      title="Strike this reminder off the agenda (the ledger keeps it)"
                      aria-label={`Strike off: ${wd.text}`}
                    >
                      done ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </motion.aside>
      {!quiet && glowing && <AgendaGlow selector={glowTarget(glowing)} strong={glowing === hover} />}
    </>
  );
}
