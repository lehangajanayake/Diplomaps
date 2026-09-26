/** Rendering structured game data into prompt text. All text here is built by the server. */
import { PROFILES } from '../../src/engine/nations.js';
import type { KnowledgeItem, News } from '../../src/engine/schema.js';
import type { NationId, Owner } from '../../src/engine/types.js';
import { VOICES } from './nations/index.js';

export const who = (o: Owner | null) => (!o ? 'no one' : o === 'crossing' ? 'the Crossing (the Warden)' : PROFILES[o].name);
export const ruler = (n: NationId) => PROFILES[n].ruler.name;

export function trustWord(t: number): string {
  if (t >= 60) return 'devoted';
  if (t >= 30) return 'friendly';
  if (t >= 10) return 'cordial';
  if (t > -10) return 'wary';
  if (t > -35) return 'cold';
  if (t > -60) return 'hostile';
  return 'implacable';
}

export function suspicionWord(s: number): string {
  if (s < 15) return 'does not suspect the Warden of anything';
  if (s < 40) return 'is a little suspicious of the Warden';
  if (s < 70) return 'suspects the Warden of meddling';
  if (s < 90) return 'openly accuses the Warden of meddling';
  return "is certain the Warden is behind the realm's troubles";
}

export function tensionWord(t: number): string {
  if (t < 20) return 'calm';
  if (t < 40) return 'uneasy';
  if (t < 60) return 'tense';
  if (t < 80) return 'grave: war may be declared';
  return 'on the brink of general war';
}

const WAR_CAUSE: Record<string, string> = {
  grudge: '',
  ally: ' to defend its ally',
  favour: ' (it is whispered the Warden asked it to)',
  words: ' after hearing alarming words from the Warden',
};

const LETTER_NEWS: Record<string, (nation: string, answer: string) => string> = {
  attack: (nation, answer) =>
    answer === 'tribute'
      ? `The Warden paid ${nation} tribute to turn its army back.`
      : answer === 'sellswords'
        ? `The Warden hired sellswords against ${nation}'s army.`
        : answer === 'favour'
          ? `The Warden called in a favour, and ${nation}'s army turned back to face a new enemy.`
          : `The Warden stood to fight ${nation}'s army.`,
  raid: (nation, answer) => (answer === 'pay' ? `The Warden paid off ${nation}'s foragers.` : `The Warden let ${nation}'s foragers burn a region rather than pay.`),
  passage: (nation, answer) => (answer === 'refuse' ? `The Warden refused ${nation}'s army passage.` : `The Warden granted ${nation}'s army passage through the Crossing.`),
  help: (nation, answer) => (answer === 'refuse' ? `The Warden refused ${nation}'s plea to close a pass to its enemy.` : `At ${nation}'s request, the Warden shut a pass to ${nation}'s enemy.`),
  spoils: (nation, answer) => (answer === 'land' ? `The Warden took a region from ${nation} as spoils of war.` : `The Warden took ${nation}'s gold as spoils of war.`),
  talks: (nation, answer) => (answer === 'host' ? `The Warden hosted peace talks for ${nation}.` : `The Warden declined to host ${nation}'s peace talks.`),
  trade: (nation, answer) => (answer === 'waive' ? `The Warden waived the toll on ${nation}'s caravans.` : `The Warden charged ${nation}'s caravans the full toll.`),
  last: (nation) => `The Warden received the last letter of the fallen ruler of ${nation}.`,
  angry: (nation, answer) =>
    answer === 'apologise' ? `The Warden sent apologies and gold to ${nation}'s angry court.` : `The Warden ignored ${nation}'s angry letter.`,
};

export function renderNews(news: readonly News[]): string {
  if (news.length === 0) return '- Nothing of note.';
  return news
    .map((n) => {
      switch (n.kind) {
        case 'battle':
          return `- Battle at ${n.region}: ${who(n.attacker)} attacked ${who(n.defender)} and ${n.captured ? 'took it' : 'was repulsed'}.`;
        case 'war':
          return `- ${who(n.nation)} declared war on ${who(n.target)}${WAR_CAUSE[n.cause] ?? ''}.`;
        case 'stand_down':
          return `- ${who(n.nation)} called off a planned war on ${who(n.target)}.`;
        case 'peace':
          return n.how === 'fallen' ? '' : `- ${who(n.a)} and ${who(n.b)} made peace${n.how === 'talks' ? ' at talks hosted by the Warden' : ''}.`;
        case 'alliance':
          return `- ${who(n.a)} and ${who(n.b)} formed an alliance.`;
        case 'collapse':
          return `- ${who(n.nation)} COLLAPSED: its capital fell to ${who(n.by)} and its remaining lands lie in ruins.`;
        case 'march':
          return n.forced
            ? `- ${who(n.nation)}'s army forced its way through the Crossing to attack ${who(n.target)}, trampling the Warden's fields.`
            : `- The Warden let ${who(n.nation)}'s army march through the Crossing to attack ${who(n.target)}.`;
        case 'turned_back':
          return `- The Warden's closed pass turned back ${who(n.nation)}'s army, bound for ${who(n.target)}.`;
        case 'pass':
          return `- The Warden ${n.state === 'closed' ? 'closed' : 'reopened'} the pass to ${who(n.nation)}.`;
        case 'favour':
          return `- The Warden called in a favour: ${who(n.nation)} is to declare war on ${who(n.target)} at the season's end.`;
        case 'exposed':
          return `- Scandal: ${who(n.target)} learned that the Warden secretly asked ${who(n.nation)} to go to war against it.`;
        case 'burn':
          return `- Foragers from ${who(n.nation)} burned ${n.region}, in the Crossing.`;
        case 'gain':
          return n.how === 'claim' || n.from === 'unclaimed'
            ? `- The Warden claimed the ruins of ${n.region} for the Crossing.`
            : `- ${who(n.from)} ${n.how === 'spoils' ? 'gave the Warden' : 'ceded to the Warden'} ${n.region}${n.how === 'payment' ? ' as payment' : n.how === 'spoils' ? ' as spoils of war' : ''}.`;
        case 'cede':
          return `- ${who(n.nation)} ceded ${n.region} to ${who(n.target)}.`;
        case 'lie_caught':
          return `- Scandal: ${n.by.map((b) => PROFILES[b].name).join(' and ')} caught the Warden in a lie ("${n.what}").`;
        case 'letter':
          return `- ${(LETTER_NEWS[n.letterKind] ?? (() => ''))(PROFILES[n.nation].name, n.answer)}`;
        case 'red_line':
          return `- ${who(n.by)} crossed ${who(n.nation)}'s red line.`;
        case 'gossip':
          return `- ${who(n.from)} passed word of the Warden's promises to ${who(n.to)}.`;
        case 'audience':
          return `- The Warden held an audience with ${ruler(n.nation)} of ${who(n.nation)}.`;
        default:
          return '';
      }
    })
    .filter((line) => line && line !== '- ')
    .join('\n');
}

export function renderKnowledge(items: readonly KnowledgeItem[], empty: string): string {
  if (items.length === 0) return `- ${empty}`;
  return items
    .map((k) => {
      const source = k.heardFrom ? ` (heard from ${PROFILES[k.heardFrom].name})` : '';
      const to = ` to ${PROFILES[k.to].name}`;
      const caught = k.caught ? ' [KNOWN TO BE A LIE]' : '';
      return `- Season ${k.season}: the Warden ${k.type === 'promise' ? 'promised' : 'claimed'}${to}: "${k.what}"${source}${caught}`;
    })
    .join('\n');
}

export function identityBlock(nation: NationId): string {
  const p = PROFILES[nation];
  const v = VOICES[nation];
  const grudges = p.grudges.map((g) => `- Grudge against ${PROFILES[g.against].name}: ${g.reason}`).join('\n');
  const friends = p.friends.map((f) => `- Friendly with ${PROFILES[f.with].name}: ${f.reason}`).join('\n');
  return `You are ${p.ruler.name}, ${p.ruler.title}, ruler of ${p.name}, ${p.epithet}.

WHO YOU ARE
${p.personality}
${v.voice}

HOW YOU SPEAK
- ${p.speechStyle}
- For example: ${v.examples.map((e) => `"${e}"`).join(' / ')}
- Things that please you: ${v.pleases.join('; ')}.
- Things that offend you: ${v.offends.join('; ')}.

YOUR RED LINE
"${p.redLine.text}"

YOUR GRUDGES AND FRIENDS
${grudges}${friends ? `\n${friends}` : ''}`;
}

export function relationLines(relations: readonly { nation: NationId; trust: number; allied: boolean; atWar: boolean; troops: number; regions: number; borders: boolean }[]): string {
  return relations
    .map(
      (r) =>
        `- ${PROFILES[r.nation].name} (${ruler(r.nation)}): you are ${trustWord(r.trust)} toward them (${r.trust})${r.allied ? ', ALLIED' : ''}${r.atWar ? ', AT WAR' : ''}; ${r.troops} troops in ${r.regions} regions${r.borders ? '; shares a border with you' : ''}.`,
    )
    .join('\n');
}

/** A transcript for the scribe-style prompts (assessment, extraction). */
export function transcript(nation: NationId, turns: readonly { role: 'player' | 'ruler'; text: string }[]): string {
  return turns.map((t) => `${t.role === 'player' ? 'WARDEN' : ruler(nation).toUpperCase()}: ${t.text}`).join('\n\n');
}
