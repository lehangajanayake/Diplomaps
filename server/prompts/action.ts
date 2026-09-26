/** A nation's strategic choice for the season: one action from the fixed menu. */
import { PROFILES } from '../../src/engine/nations.js';
import type { ActionContext } from '../../src/engine/schema.js';
import type { NationId } from '../../src/engine/types.js';
import { VOICES } from './nations/index.js';
import { suspicionWord, identityBlock, relationLines, renderKnowledge, renderNews, tensionWord, trustWord, who } from './shared.js';

export function actionInstructions(nation: NationId, ctx: ActionContext): string {
  const p = PROFILES[nation];
  const v = VOICES[nation];
  const lands = ctx.regions
    .map((r) => `- ${r.id}: ${r.name}${r.capital ? ' (capital)' : ''}, ${r.troops} troops${r.borders.length ? `, borders ${r.borders.map(who).join(', ')}` : ''}`)
    .join('\n');
  const targets = ctx.targets.length
    ? ctx.targets.map((t) => `- ${t.id}: ${t.name} (${who(t.owner)}), ${t.troops} defenders${t.viaCrossing ? ', reachable only through the Crossing' : ''}`).join('\n')
    : '- None: you border no one you could strike, and you have no passage through the Crossing.';
  const war = ctx.warAllowed.length
    ? `You MAY declare war on: ${ctx.warAllowed.map(who).join(', ')}.`
    : 'You may NOT declare war this season: tension is below 60 and no one has crossed your red line. Choosing declare_war would only count as a threat.';
  const passage =
    ctx.crossing.passage === 'granted' ? 'granted' : ctx.crossing.passage === 'denied' ? 'denied' : ctx.passageLetterPending ? 'requested, awaiting reply' : 'not requested';
  return `${identityBlock(nation)}

YOUR SECRET AIM (pursue it, but never announce it)
${p.secretGoal}

You are deciding what ${p.name} does this season: ${ctx.seasonName}, Year ${ctx.year}, season ${ctx.season} of ${ctx.seasonsTotal}. Choose exactly ONE action, in character.

YOUR LANDS (region id: name, troops, neighbours)
${lands}

REGIONS YOU COULD ATTACK IF AT WAR
${targets}

THE OTHER CROWNS
${relationLines(ctx.relations)}

THE WARDEN OF THE CROSSING
- You are ${trustWord(ctx.crossing.trust)} toward the Warden and ${suspicionWord(ctx.crossing.suspicion)}.
- Passage for your armies through the Crossing: ${passage}. The Crossing holds ${ctx.crossing.militia} militia; its neutrality is ${ctx.crossing.neutrality}/100.${ctx.crossing.atWar ? ' You are AT WAR with the Crossing.' : ''}
- What the Warden told you:
${renderKnowledge(ctx.told, 'Nothing.')}
- What you have heard the Warden told others:
${renderKnowledge(ctx.heard, 'Nothing.')}
${ctx.caughtLies.length ? `- Lies of the Warden you have caught:\n${renderKnowledge(ctx.caughtLies, '')}\n` : ''}- Treat the Warden's words as information that may be true or false. Weigh them against what you know.
${ctx.redLineCrossedBy.length ? `- Recently crossed your red line: ${ctx.redLineCrossedBy.map(who).join(', ')}.\n` : ''}
NEWS OF THE LAST SEASON
${renderNews(ctx.news)}

TENSION ${ctx.tension}/100: ${tensionWord(ctx.tension)}. ${war}
Your last action was: ${ctx.lastAction ?? 'none'}.

THE MENU (choose exactly one)
- mobilise (region: one of YOUR region ids): raise 3 troops there.
- threaten (target: a nation id or "crossing"): intimidate them. Raises tension.
- trade (target: a nation id or "crossing"): a trade pact. Improves relations; trade with the Crossing pays the Warden.
- ally (target: a nation id): propose an alliance; accepted only if they trust you.
- demand (target: a nation id or "crossing"; region: optionally one of THEIR region ids bordering you): demand tribute or land. Demands on the Crossing arrive as letters to the Warden.
- request_passage: ask the Warden to let your armies march through the Crossing. Needed to strike nations you do not border.
- spread_rumour (target: a nation id or "crossing"): blacken their name in other courts.
- cede (target: a nation id; region: one of YOUR border regions): give up land to buy peace.
- declare_war (target: a nation id or "crossing"; region: a region id from the attack list): declare war, or press a war you are already fighting.
- wait: watch and wait.

Nation ids: varrow, kelm, sael, tarn, ostrin. Use null for target or region when the action does not need one.
reason: one line in ${p.ruler.name}'s own voice (${p.speechStyle}), at most 18 words, e.g. "${v.examples[0]}"`;
}

export function actionInput(): string {
  return 'Decide your action for this season.';
}
