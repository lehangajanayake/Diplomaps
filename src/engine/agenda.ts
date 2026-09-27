/**
 * The Warden's agenda: the next useful moves, chosen by code and ranked by urgency (danger first, then
 * letters, then the crisis, then chances for the ambition, then the bell). A nudge, not a quest log:
 * the table shows the first few. Also what the bell has to say before it is rung.
 */
import { CONFIG } from './config.js';
import { favourBlocked } from './favours.js';
import { cannotClaim, claimCost, offerableRegions } from './land.js';
import { sealedLetters } from './letters.js';
import { nameOf, PROFILES } from './nations.js';
import { needsPassage } from './policy.js';
import { NATION_IDS, UNCLAIMED, type LetterKind, type NationId, type RegionId, type WorldState } from './types.js';
import { isStanding, regionName } from './world.js';

export type AgendaAction = { kind: 'letter'; id: string } | { kind: 'dossier'; nation: NationId } | { kind: 'claim'; region: RegionId } | { kind: 'bell' };

export interface AgendaItem {
  /** Stable across the season, so an item that is done can be ticked off. */
  id: string;
  text: string;
  tone: 'danger' | 'warning' | 'chance' | 'info';
  action: AgendaAction;
}

/** How many items the table shows at once. */
export const AGENDA_SHOWN = 3;

const cap = (n: NationId) => nameOf(n, 'start');

const LETTER_ASKS: Partial<Record<LetterKind, string>> = {
  raid: 'raiders threaten your fields',
  passage: 'its army asks to cross',
  help: 'it asks you to shut a pass',
  spoils: 'it offers you the spoils',
  talks: 'it would talk peace',
  trade: 'its caravans ask a favour',
  angry: 'it is angry with you',
};

export function audiencesLeft(w: WorldState): number {
  return CONFIG.audiencesPerSeason - w.audiencesThisSeason.length;
}

const talkedTo = (w: WorldState, n: NationId) => w.audiencesThisSeason.includes(n);

/** Every useful next move this season, most urgent first. */
export function agenda(w: WorldState): AgendaItem[] {
  const items: AgendaItem[] = [];
  const unanswered = sealedLetters(w);
  const letterFrom = (n: NationId, kinds: LetterKind[]) => unanswered.find((l) => l.from === n && kinds.includes(l.kind));
  const talk = audiencesLeft(w) > 0;

  // Danger: armies against the valley.
  for (const i of w.intents) {
    if (i.kind !== 'attack' && i.kind !== 'threat') continue;
    const letter = letterFrom(i.nation, [i.kind]);
    const place = regionName(w, i.region);
    if (letter) {
      items.push({
        id: `army-${i.nation}`,
        text: i.kind === 'attack' ? `${cap(i.nation)} strikes ${place} at the bell. Answer its letter.` : `${cap(i.nation)}'s army masses at your border. Answer its letter.`,
        tone: 'danger',
        action: { kind: 'letter', id: letter.id },
      });
    } else if (i.kind === 'threat' && talk && !talkedTo(w, i.nation)) {
      items.push({ id: `army-talk-${i.nation}`, text: `Talk ${nameOf(i.nation)} down before its army strikes ${place}.`, tone: 'danger', action: { kind: 'dossier', nation: i.nation } });
    }
  }

  // Wars being planned: the Warden has a season to stop them, or to profit.
  for (const i of w.intents) {
    if (i.kind !== 'war' || talkedTo(w, i.nation) || !talk) continue;
    const through = needsPassage(w, i.nation, i.target) && w.player.passes[i.nation] === 'open';
    items.push({
      id: `war-${i.nation}`,
      text: through ? `${cap(i.nation)} means to march through your valley on ${nameOf(i.target)}. Talk to ${nameOf(i.nation)}, or close its pass.` : `${cap(i.nation)} means to attack ${nameOf(i.target)}. Talk to ${nameOf(i.nation)} before the bell.`,
      tone: 'warning',
      action: { kind: 'dossier', nation: i.nation },
    });
  }

  // Letters waiting for an answer.
  for (const l of unanswered) {
    if (l.kind === 'attack' || l.kind === 'threat' || l.kind === 'last') continue;
    items.push({ id: `letter-${l.id}`, text: `Answer ${nameOf(l.from)}'s letter: ${LETTER_ASKS[l.kind] ?? 'it waits on your table'}.`, tone: 'info', action: { kind: 'letter', id: l.id } });
  }

  // The crisis, when nothing more pressing names a court to talk to.
  const crisisNation = w.crisis?.nations[0];
  if (crisisNation && talk && isStanding(w, crisisNation) && !talkedTo(w, crisisNation) && !items.some((x) => 'nation' in x.action && x.action.nation === crisisNation)) {
    items.push({ id: `crisis-${crisisNation}`, text: `Talk to ${nameOf(crisisNation)} about this season's crisis.`, tone: 'info', action: { kind: 'dossier', nation: crisisNation } });
  }

  // Chances for the ambition.
  const friendly = NATION_IDS.filter((n) => isStanding(w, n)).sort((a, b) => w.nations[b].trustPlayer - w.nations[a].trustPlayer);
  const favour = friendly.find((n) => !favourBlocked(w, n));
  if (favour && (w.player.ambition === 'spider' || w.intents.some((i) => (i.kind === 'attack' || i.kind === 'threat') && i.nation !== favour))) {
    items.push({ id: `favour-${favour}`, text: `${cap(favour)} trusts you enough to go to war on your word.`, tone: 'chance', action: { kind: 'dossier', nation: favour } });
  }
  if (w.player.ambition === 'kingdom' && talk) {
    const giver = friendly.find((n) => offerableRegions(w, n).length > 0 && !talkedTo(w, n));
    if (giver) items.push({ id: `land-${giver}`, text: `${cap(giver)} trusts you enough to give you land. Ask ${PROFILES[giver].ruler.short} in an audience.`, tone: 'chance', action: { kind: 'dossier', nation: giver } });
    const ruin = w.map.regionIds.find((id) => w.regions[id]!.owner === UNCLAIMED && cannotClaim(w, id) === null);
    if (ruin) items.push({ id: `claim-${ruin}`, text: `Claim the ruins of ${regionName(w, ruin)} for ${claimCost(w)} gold.`, tone: 'chance', action: { kind: 'claim', region: ruin } });
  }

  // Nothing left that matters: ring the bell.
  if (!items.some((x) => x.tone === 'danger' || x.tone === 'warning' || x.action.kind === 'letter')) {
    items.push({ id: 'bell', text: talk ? 'When you have talked enough, ring the bell.' : 'Ring the bell to end the season.', tone: 'info', action: { kind: 'bell' } });
  }
  return items;
}

/** What is left to do, for the bell: "1 letter unanswered · 1 audience left". */
export function bellNote(w: WorldState): string | undefined {
  const letters = sealedLetters(w).length;
  const talks = audiencesLeft(w);
  const parts = [
    ...(letters ? [`${letters} ${letters === 1 ? 'letter' : 'letters'} unanswered`] : []),
    ...(talks ? [`${talks} ${talks === 1 ? 'audience' : 'audiences'} left`] : []),
  ];
  return parts.length ? parts.join(' · ') : undefined;
}

/** Something urgent still undone, worth a word before the bell is rung; null when all is in hand. */
export function bellWarning(w: WorldState): string | null {
  for (const i of w.intents) {
    if (i.kind !== 'attack' && i.kind !== 'threat') continue;
    const letter = sealedLetters(w).find((l) => l.from === i.nation && l.kind === i.kind);
    if (letter) {
      return i.kind === 'attack'
        ? `${cap(i.nation)}'s army strikes ${regionName(w, i.region)} at this bell, and you have not answered its letter.`
        : `${cap(i.nation)}'s army is at your border, and you have not answered its letter.`;
    }
  }
  return null;
}
