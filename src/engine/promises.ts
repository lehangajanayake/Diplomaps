/**
 * The Warden's word. Some promises the code can check at the bell: letting a court's army through, and
 * keeping a court's army out. Those are marked kept or broken,
 * and the court reacts. The rest stay as reminders the Warden can strike off. Nothing here judges: it
 * says what was said, when it falls due, and what follows.
 */
import { CONFIG } from './config.js';
import { nameOf } from './nations.js';
import { adjustSuspicion, adjustTrustPlayer } from './tension.js';
import type { GameEvent, LedgerEntry, NationId, PromiseKind, WorldState } from './types.js';
import { isStanding } from './world.js';

/**
 * Promise kinds the bell can check. Gold is not among them: no answer pays a court a sum of the Warden's
 * choosing, so a promise of gold stays a reminder rather than being judged by a payment that was not it.
 */
const CHECKABLE: ReadonlySet<PromiseKind> = new Set(['passage', 'deny_passage']);

/** Letter answers that let an army through the valley. */
const LET_THROUGH = new Set(['grant', 'land']);

export function checkable(e: LedgerEntry): boolean {
  return e.type === 'promise' && !!e.promiseKind && CHECKABLE.has(e.promiseKind) && (e.promiseKind !== 'deny_passage' || !!e.about);
}

export type WordStatus = 'kept' | 'broken' | 'watching' | 'reminder';

export function wordStatus(e: LedgerEntry): WordStatus {
  if (e.kept) return 'kept';
  if (e.broken) return 'broken';
  return checkable(e) ? 'watching' : 'reminder';
}

/** When a promise falls due, in a few words, and what follows from keeping it or not; for claims, what follows if it is found out. */
export function wordNote(e: LedgerEntry): { due: string | null; follows: string } {
  const to = nameOf(e.to);
  const To = nameOf(e.to, 'start');
  if (e.type === 'claim') {
    if (e.truth === false) return { due: null, follows: `It is not true: if ${to} finds out, its trust in you will drop sharply.` };
    if (e.truth === true) return { due: null, follows: 'It is true, as things stand.' };
    return { due: null, follows: 'No one can prove it either way yet.' };
  }
  switch (e.promiseKind) {
    case 'passage':
      return { due: `When ${to}'s army next asks to cross`, follows: `Refuse it, or close the pass to ${to}, and ${to}'s trust will drop sharply.` };
    case 'deny_passage':
      return {
        due: `Whenever ${nameOf(e.about!)}'s army comes`,
        follows: `Let ${nameOf(e.about!)} through and ${to}'s trust will drop sharply. Keep the pass to ${nameOf(e.about!)} closed and ${to} will see it.`,
      };
    default:
      return { due: null, follows: `${To} will remember whether you keep it.` };
  }
}

function settleWord(w: WorldState, e: LedgerEntry, kept: boolean, events: GameEvent[]): void {
  if (kept) {
    e.kept = true;
    adjustTrustPlayer(w, e.to, CONFIG.trust.keptPromise);
  } else {
    e.broken = true;
    adjustTrustPlayer(w, e.to, CONFIG.trust.brokenPromise);
    adjustSuspicion(w, e.to, CONFIG.suspicion.brokenPromise);
  }
  events.push({
    kind: 'promise',
    season: w.season,
    entry: e.id,
    nation: e.to,
    outcome: kept ? 'kept' : 'broken',
    because: { why: `you promised ${nameOf(e.to)} “${e.what}”`, yours: true },
  });
}

/**
 * At the bell, once armies have marched or been turned back and letters are settled: every promise the
 * code can check that this season decided is marked kept or broken, and its court reacts.
 */
export function checkPromises(w: WorldState, events: GameEvent[]): void {
  const answered = (from: NationId, kinds: string[], answers: Set<string>) =>
    w.letters.some((l) => l.season === w.season && l.from === from && kinds.includes(l.kind) && answers.has(l.answer ?? ''));
  const marched = (n: NationId) => events.some((e) => e.kind === 'march' && e.nation === n && !e.forced);
  const turnedBack = (n: NationId) => events.some((e) => e.kind === 'turned_back' && e.nation === n);
  for (const e of w.player.ledger) {
    if (!checkable(e) || e.kept || e.broken || e.season > w.season || !isStanding(w, e.to)) continue;
    switch (e.promiseKind) {
      case 'passage':
        if (marched(e.to) || answered(e.to, ['passage'], LET_THROUGH)) settleWord(w, e, true, events);
        else if (turnedBack(e.to) || answered(e.to, ['passage'], new Set(['refuse']))) settleWord(w, e, false, events);
        break;
      case 'deny_passage': {
        const enemy = e.about!;
        if (marched(enemy) || answered(enemy, ['passage'], LET_THROUGH)) settleWord(w, e, false, events);
        else if (turnedBack(enemy) || w.player.passes[enemy] === 'closed') settleWord(w, e, true, events);
        break;
      }
      default:
        break;
    }
  }
}

/** Promises still open: the ones the bell will check, and reminders not yet struck off, newest first. */
export function openWords(w: WorldState): LedgerEntry[] {
  return w.player.ledger.filter((e) => e.type === 'promise' && !e.kept && !e.broken && !e.dismissed && isStanding(w, e.to)).reverse();
}

/** The open promise this letter answer would break, if any: letting `from`'s army through, or turning it away. */
export function wordBrokenBy(w: WorldState, from: NationId, lets: boolean): LedgerEntry | undefined {
  return openWords(w).find((e) => (lets ? e.promiseKind === 'deny_passage' && e.about === from : e.promiseKind === 'passage' && e.to === from));
}

/** Strike a reminder off the agenda. Promises the bell checks cannot be struck off. */
export function dismissWord(world: WorldState, id: string): WorldState {
  const e = world.player.ledger.find((x) => x.id === id);
  if (!e || checkable(e) || e.dismissed) return world;
  return { ...world, player: { ...world.player, ledger: world.player.ledger.map((x) => (x.id === id ? { ...x, dismissed: true } : x)) } };
}
