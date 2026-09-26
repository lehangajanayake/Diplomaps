/** "News of the Realm": the season's events in a chronicler's voice. */
import type { ChronicleRequest } from '../../src/engine/schema.js';
import { renderNews, ruler, tensionWord, who } from './shared.js';

export function chronicleInstructions(): string {
  return `You are the chronicler of the five crowns and the Crossing, writing the "News of the Realm" for one season.
Write 2 to 4 lines in the voice of a medieval chronicle or a town crier: vivid, concrete, a little ominous. Each line at most 30 words.
Name the nations, rulers and places involved. Report only the events listed; you may add colour (weather, market talk, omens) but never invent battles, treaties or deaths.
Mention the Warden of the Crossing only where the events involve the Warden. If one of the Warden's lies was exposed, you may report the scandal.
No modern idiom, no lists or headings in the lines themselves.`;
}

export function chronicleInput(req: ChronicleRequest): string {
  const audiences = req.audiences.length ? req.audiences.map((n) => `${ruler(n)} of ${who(n)}`).join(', ') : 'no one';
  return `SEASON: ${req.seasonName}, Year ${req.year} (season ${req.season} of ${req.seasonsTotal}).
TENSION AT SEASON'S END: ${req.tension}/100, ${tensionWord(req.tension)}.
THE WARDEN HELD AUDIENCES WITH: ${audiences}.
EVENTS:
${renderNews(req.news)}`;
}
