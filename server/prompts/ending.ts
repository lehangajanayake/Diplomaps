/** The ending: one verdict per ruler in their own voice, and a historian's epilogue. */
import { ENDING_TEXT } from '../../src/engine/endings.js';
import { PROFILES } from '../../src/engine/nations.js';
import type { EndingRequest } from '../../src/engine/schema.js';
import { VOICES } from './nations/index.js';
import { blameWord, renderNews, trustWord } from './shared.js';

export function endingInstructions(): string {
  return `The game of Diplomaps is over. The player was the Warden of the Crossing, the ruler of the small neutral valley through which every road between five rival crowns runs.
Write:
1. verdicts: exactly one line per ruler (five in all), at most 30 words each, spoken by that ruler in their own voice and verbal quirk, judging the Warden. Reflect how they feel (trust, blame), what they know (lies caught, promises, gifts) and how their realm fared.
2. epilogue: 3 to 5 sentences by a historian writing a century later, in Year 715, about the Warden's reign and how it ended. Measured, scholarly, a little wry. Use the ending's title naturally.
Keep every ruler in character. No modern idiom.`;
}

export function endingInput(req: EndingRequest): string {
  const ending = ENDING_TEXT[req.ending.id];
  const rulers = req.nations
    .map((n) => {
      const p = PROFILES[n.nation];
      const v = VOICES[n.nation];
      return `- ${n.nation}: ${p.ruler.name}, ${p.ruler.title}. Voice: ${p.speechStyle} Example: "${v.examples[0]}"
  Feels ${trustWord(n.trust)} toward the Warden (${n.trust}) and ${blameWord(n.blame)}. Regions ${n.regionsStart} -> ${n.regionsEnd}.${n.atWarWithCrossing ? ' At war with the Crossing.' : ''}
  Audiences: ${n.audiences}. Promises received: ${n.promises}. Lies told to them: ${n.liesTold}. Lies they caught: ${n.liesCaught}. Gifts: ${n.gifts} gold.`;
    })
    .join('\n');
  return `ENDING: ${ending.title}: ${ending.subtitle} (reached in season ${req.ending.season}).
THE WARDEN: ${req.stats.gold} gold at the end (${req.stats.goldEarned} earned in tolls). Lies told: ${req.stats.liesTold}, caught: ${req.stats.liesCaught}. Wars started across the realm: ${req.stats.warsStarted}; battles: ${req.stats.battles}. Crossing regions lost: ${req.stats.regionsLost}. Final tension: ${req.stats.tension}/100.
THE RULERS:
${rulers}
KEY EVENTS:
${renderNews(req.highlights)}`;
}
