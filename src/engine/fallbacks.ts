/**
 * In-world text used whenever the AI is unavailable, slow or returns nonsense. The game must never
 * freeze or show an error: the rulers are "called away" and the chronicler writes from a template.
 */
import { CROSSING_PROFILE, PROFILES } from './nations.js';
import type { News } from './schema.js';
import { CROSSING, type NationId, type Owner } from './types.js';

const who = (o: Owner) => (o === CROSSING ? 'the Crossing' : PROFILES[o].name);
/** Names mid-sentence: "the Tarn", not "The Tarn". */
const mid = (o: Owner) => who(o).replace(/^The /, 'the ');
function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function fallbackAudienceReply(nation: NationId): string {
  const r = PROFILES[nation].ruler;
  return `A steward hurries in and whispers in ${r.name}'s ear. "Forgive me, Warden. Matters of state call me away. We will speak another season."`;
}

export function fallbackChronicle(news: readonly News[], seasonTitle: string): string[] {
  const lines: string[] = [];
  const add = (line: string) => {
    if (lines.length < 4 && !lines.includes(line)) lines.push(line);
  };
  for (const n of news) {
    switch (n.kind) {
      case 'war':
        add(`${who(n.nation)} declared war upon ${mid(n.target)}, and the beacons were lit along the border.`);
        break;
      case 'battle':
        add(
          n.captured
            ? `${who(n.attacker)} took ${n.region} from ${mid(n.defender)} by force of arms.`
            : `${who(n.attacker)} threw its soldiers at ${n.region}, and ${mid(n.defender)} threw them back.`,
        );
        break;
      case 'lie_caught':
        add(`In the courts of ${list(n.by.map(mid))}, it is said the Warden spoke falsely: "${n.what}".`);
        break;
      case 'peace':
        add(`${who(n.a)} and ${mid(n.b)} laid down their arms, for now.`);
        break;
      case 'alliance':
        if (n.accepted) add(`${who(n.a)} and ${mid(n.b)} sealed an alliance with wine and hostages.`);
        break;
      case 'cede':
        add(`${n.region} passed from ${mid(n.nation)} to ${mid(n.target)} without a sword being drawn.`);
        break;
      case 'passage':
        add(n.granted ? `The Warden opened the roads of the Crossing to the soldiers of ${mid(n.nation)}.` : `The Warden shut the passes against ${mid(n.nation)}.`);
        break;
      default:
        break;
    }
  }
  const mobilised = news.flatMap((n) => (n.kind === 'action' && n.action === 'mobilise' ? [n.nation] : []));
  if (mobilised.length) {
    const names = mobilised.map((n, i) => (i === 0 ? who(n) : mid(n)));
    add(`${list(names)} called more men to the banners.`);
  }
  const traders = news.flatMap((n) => (n.kind === 'action' && n.action === 'trade' ? [n.nation] : []));
  if (traders.length) add(`Wagons from ${list(traders.map(mid))} rolled through ${CROSSING_PROFILE.capitalName}, and the toll-chests grew heavy.`);
  if (lines.length === 0) add(`${seasonTitle} passed quietly. The roads were busy, the courts were watchful, and no one trusted the silence.`);
  if (lines.length < 2) add('In the taverns of the Crossing, travellers spoke in low voices of what the next season might bring.');
  return lines;
}

/** Verdicts for when the AI cannot be reached: each ruler's parting shot, by how the game went. */
const VERDICTS: Record<NationId, { won: string; lost: string; cold: string }> = {
  varrow: {
    won: 'Varrow does not praise toll-keepers. Varrow will make an exception, once.',
    lost: 'Varrow has seen stronger men fail at simpler things. Not many.',
    cold: 'Varrow remembers every word you said. Varrow is still counting the lies.',
  },
  kelm: {
    won: 'Your account closes in profit. I have audited it twice and found only charm.',
    lost: 'Your books do not balance, Warden. I have filed them under fiction.',
    cold: 'Noted. Every broken promise, with interest, in my own hand.',
  },
  sael: {
    won: 'Darling, you were wicked and it worked. Do come and scheme at my court.',
    lost: 'You tried so hard, darling. It was almost touching, wasn’t it?',
    cold: 'You lied to me, darling. Only I am allowed to do that.',
  },
  tarn: {
    won: 'Hm. The frog outlived the heron. The fen is almost impressed.',
    lost: 'The river does not care how clever the stone was.',
    cold: 'Still water hides the pike. You were not still enough.',
  },
  ostrin: {
    won: 'It is written that the meek shall inherit the road. You were not meek, child.',
    lost: 'The Lamp saw everything, child. It sighed.',
    cold: 'It is written: the liar’s lamp gutters first. Yours is smoking.',
  },
};

export function fallbackVerdict(nation: NationId, trust: number, suspicion: number, won: boolean): string {
  const v = VERDICTS[nation];
  if (suspicion >= 60 || trust <= -25) return v.cold;
  return won ? v.won : v.lost;
}
