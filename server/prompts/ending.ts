/** The ending: each ruler's one-line verdict on the Warden, a light roast in their own voice. */
import { AMBITION } from '../../src/engine/ambitions.js';
import { PROFILES } from '../../src/engine/nations.js';
import type { EndingRequest } from '../../src/engine/schema.js';
import { VOICES } from './nations/index.js';
import { renderNews, suspicionWord, trustWord } from './shared.js';

export function endingInstructions(): string {
  return `The game of Diplomaps is over. The player was the Warden of the Crossing, the small neutral valley through which every road between five rival crowns runs.
Write verdicts: exactly one line per ruler (five in all), spoken by that ruler in their own voice and verbal habit, judging the Warden.
- Each verdict is a light roast: witty, a little affectionate or a little savage, and SPECIFIC to something the Warden actually did (a promise, a lie, a war they started, land they took, gold they hoarded, a pass they closed).
- The tone to aim for: "You sold the same bridge to three kings. I'd hire you in a heartbeat."
- At most 25 words each. No two verdicts about the same deed.
- A ruler whose nation fell speaks from exile. A ruler who caught the Warden lying says so.
Keep every ruler in character. Period voice, no modern idiom.`;
}

function outcomeLine(req: EndingRequest): string {
  const o = req.outcome;
  const goal = AMBITION[o.ambition];
  if (o.reason === 'ashes') return `The Warden's capital, Wayhold, fell in season ${o.season}. The Crossing was conquered.`;
  if (o.reason === 'unmasked') return `In season ${o.season} three courts became certain the Warden was lying to them all. The Warden was unmasked and lost.`;
  const verdict = o.result === 'victory' ? 'and achieved it' : 'and fell short';
  return `The Warden chose the ambition ${goal.title} ("${goal.goal}") ${verdict}: ${o.progress.value} of ${o.progress.target}.`;
}

export function endingInput(req: EndingRequest): string {
  const rulers = req.nations
    .map((n) => {
      const p = PROFILES[n.nation];
      const v = VOICES[n.nation];
      return `- ${n.nation}: ${p.ruler.name}, ${p.ruler.title} of ${p.name}. Voice: ${p.speechStyle} Example: "${v.examples[0]}"
  Feels ${trustWord(n.trust)} toward the Warden (${n.trust}) and ${suspicionWord(n.suspicion)}. Regions ${n.regionsStart} -> ${n.regionsEnd}${n.fallen ? ' (THE NATION FELL)' : ''}.${n.attackedCrossing ? ' Attacked the Crossing.' : ''}
  Audiences: ${n.audiences}. Promises received: ${n.promises}. Lies told to them: ${n.liesTold}. Lies they caught: ${n.liesCaught}.`;
    })
    .join('\n');
  const d = req.deeds;
  const words = req.words.length
    ? req.words
        .map((x) => `- To ${PROFILES[x.to].name}, the Warden ${x.type === 'promise' ? 'promised' : 'claimed'}: "${x.what}"${x.lie ? (x.caught ? ' [A LIE, CAUGHT]' : ' [A LIE, NEVER CAUGHT]') : ''}`)
        .join('\n')
    : '- The Warden promised and claimed nothing of note.';
  return `OUTCOME: ${outcomeLine(req)}
THE WARDEN'S DEEDS: ended with ${d.gold} gold (${d.goldEarned} earned in tolls); ruled ${d.regionsStart} regions at the start and ${d.regionsEnd} at the end; started ${d.warsInstigated} wars between nations; brokered ${d.peacesBrokered} peaces. Final tension ${d.tension}/100.
THE WARDEN'S WORDS:
${words}
THE RULERS:
${rulers}
KEY EVENTS:
${renderNews(req.highlights)}`;
}
