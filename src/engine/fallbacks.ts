/**
 * In-world text used whenever the AI is unavailable, slow or returns nonsense. The game must never
 * freeze or show an error: the rulers are "called away" and the chronicler writes from a template.
 */
import { ENDING_TEXT } from './endings.js';
import { CROSSING_PROFILE, PROFILES } from './nations.js';
import type { News } from './schema.js';
import { CROSSING, type EndingId, type NationId, type Owner } from './types.js';

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

const VERDICTS: Record<NationId, { warm: string; cool: string; cold: string }> = {
  varrow: {
    warm: 'Varrow names the Warden a friend. Varrow does not say that twice.',
    cool: 'Varrow watched the Warden sell roads. Varrow was not impressed, and not insulted.',
    cold: 'Varrow remembers every word the Warden spoke. Varrow will come for the rest.',
  },
  kelm: {
    warm: 'The Warden\'s account with Kelm closes in credit. A rare thing. Noted, with approval.',
    cool: 'The Warden\'s account stands at nil: no profit, no loss. Kelm expected more.',
    cold: 'Noted. The Warden\'s debts to Kelm will be collected, with interest.',
  },
  sael: {
    warm: 'Oh, darling, you were wonderful. Wicked, but wonderful. Shall we do it again?',
    cool: 'You were pleasant enough, darling. Pleasant is so forgettable, isn\'t it?',
    cold: 'You played me for a fool, darling. How brave. How very short-lived, don\'t you think?',
  },
  tarn: {
    warm: 'The Warden came to the fen with open hands. The fen remembers.',
    cool: 'Hm. The river runs on. So does the Warden.',
    cold: 'Still water hides the pike. The Warden should watch the water.',
  },
  ostrin: {
    warm: 'It is written, child: the keeper of the road shall be blessed. You were.',
    cool: 'The Lamp saw you, child. It neither warmed nor burned you.',
    cold: 'It is written: the liar\'s lamp gutters first. Yours is already smoking, child.',
  },
};

export function fallbackVerdict(nation: NationId, trust: number, suspicion: number): string {
  const v = VERDICTS[nation];
  if (suspicion >= 60 || trust <= -25) return v.cold;
  if (trust >= 30 && suspicion < 40) return v.warm;
  return v.cool;
}

const EPILOGUES: Record<EndingId, string> = {
  spider:
    'Historians still argue whether the Warden of the Crossing started the wars of 614 or merely profited from them. The ledgers of Wayhold show only tolls, and very large ones. No letter survives that proves a lie, which is, perhaps, the most damning evidence of all.',
  peacemaker:
    'For six seasons the five crowns circled one another and never struck. Later chroniclers credit the patient diplomacy of the Warden of the Crossing, who met every ruler and broke faith with none. It was, they note, the last such peace for a generation.',
  kingmaker:
    'The rise of a single great crown over its neighbours is usually told as a tale of generals. In this case the chroniclers point instead to a valley toll-keeper who chose a side early and held the gates open at the right moment.',
  merchant:
    'The Warden of the Crossing is remembered less for statecraft than for arithmetic. Every road ran through the valley, and every wagon paid. Wayhold grew fat on the fears of its neighbours, and never quite had to take a side.',
  puppet:
    'The peace the Warden bought was real, but so was its price. Province by province, the Crossing\'s independence was signed away to keep the armies from its gates, and within a generation the valley was a governorship.',
  survivor:
    'The Warden\'s reign is a footnote in most histories: a small kingdom that neither conquered nor was conquered. In a realm that burned so often, historians have come to see that as no small achievement.',
  ashes:
    'Wayhold fell in the reign of the Warden of the Crossing, and with it the old freedom of the valley roads. The chroniclers are unkind: the Warden, they say, tried to play every side and was caught between them.',
  unmasked:
    'By the end, every court in the realm had caught the Warden of the Crossing in a lie. The valley that had lived on trust found it had spent it all, and the five crowns remembered the name only as a warning.',
  grand_peace:
    'The Grand Peace of Wayhold is still taught to young diplomats as a miracle of the craft: five hostile crowns, one small valley, and a Warden who somehow persuaded them all to sign. Few believe it could be done again.',
};

export function fallbackEpilogue(ending: EndingId): string {
  return EPILOGUES[ending] ?? ENDING_TEXT[ending].subtitle;
}
