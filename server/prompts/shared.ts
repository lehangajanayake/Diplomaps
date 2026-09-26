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

export function blameWord(b: number): string {
  if (b < 15) return 'blames the Warden for nothing yet';
  if (b < 40) return 'suspects the Warden of meddling';
  if (b < 70) return 'resents the Warden';
  if (b < 90) return 'openly accuses the Warden';
  return 'is certain the Warden is behind the realm\'s troubles';
}

export function tensionWord(t: number): string {
  if (t < 20) return 'calm';
  if (t < 40) return 'uneasy';
  if (t < 60) return 'tense';
  if (t < 80) return 'grave: war may be declared';
  return 'on the brink of general war';
}

const ACTION_WORDS: Record<string, string> = {
  mobilise: 'mobilised troops',
  threaten: 'threatened',
  trade: 'sought trade with',
  ally: 'proposed an alliance to',
  demand: 'made demands of',
  request_passage: 'asked the Crossing for passage for its armies',
  spread_rumour: 'spread rumours about',
  cede: 'ceded land to',
  declare_war: 'declared war on',
  wait: 'waited',
};

export function renderNews(news: readonly News[]): string {
  if (news.length === 0) return '- Nothing of note.';
  return news
    .map((n) => {
      switch (n.kind) {
        case 'action': {
          const target = n.target ? ` ${who(n.target)}` : '';
          const region = n.region ? ` (at ${n.region})` : '';
          const reason = n.reason ? ` Their word: "${n.reason}"` : '';
          return `- ${who(n.nation)} ${ACTION_WORDS[n.action] ?? n.action}${n.action === 'mobilise' || n.action === 'request_passage' ? '' : target}${region}.${reason}`;
        }
        case 'battle':
          return `- Battle at ${n.region}: ${who(n.attacker)} attacked ${who(n.defender)} and ${n.captured ? 'took it' : 'was repulsed'}.`;
        case 'war':
          return `- ${who(n.nation)} declared war on ${who(n.target)}.`;
        case 'peace':
          return `- ${who(n.a)} and ${who(n.b)} made peace.`;
        case 'alliance':
          return n.accepted ? `- ${who(n.a)} and ${who(n.b)} formed an alliance.` : `- ${who(n.b)} rebuffed an alliance offered by ${who(n.a)}.`;
        case 'cede':
          return `- ${who(n.nation)} ceded ${n.region} to ${who(n.target)}.`;
        case 'lie_caught':
          return `- Scandal: ${n.by.map((b) => PROFILES[b].name).join(' and ')} caught the Warden in a lie ("${n.what}").`;
        case 'passage':
          return n.granted ? `- The Warden granted ${who(n.nation)} passage through the Crossing.` : `- The Warden denied ${who(n.nation)} passage.`;
        case 'tribute':
          return n.paid ? `- The Warden paid ${n.amount} gold in tribute to ${who(n.nation)}.` : `- The Warden refused ${who(n.nation)}'s demand for tribute.`;
        case 'land':
          return n.ceded ? `- The Warden ceded ${n.region} to ${who(n.nation)}.` : `- The Warden refused to cede ${n.region} to ${who(n.nation)}.`;
        case 'red_line':
          return `- ${who(n.by)} crossed ${who(n.nation)}'s red line.`;
        case 'rumour':
          return `- ${who(n.nation)} spread rumours about ${who(n.target)}${n.exposed ? ' and was found out' : ''}.`;
        case 'gossip':
          return `- ${who(n.from)} passed word of the Warden's promises to ${who(n.to)}.`;
        case 'audience':
          return `- The Warden held an audience with ${ruler(n.nation)} of ${who(n.nation)}.`;
        case 'gift':
          return `- The Warden sent ${n.gold} gold to ${who(n.nation)} as a gift.`;
        case 'sellswords':
          return `- The Warden hired sellswords to guard ${n.region}.`;
        default:
          return '';
      }
    })
    .filter(Boolean)
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
