/** Pull every promise and claim the Warden made out of an audience, as ledger data. */
import { PROFILES } from '../../src/engine/nations.js';
import type { ExtractRequest } from '../../src/engine/schema.js';
import { NATION_IDS, type NationId } from '../../src/engine/types.js';
import { transcript } from './shared.js';

export function extractInstructions(nation: NationId, prior: ExtractRequest['prior'], offerable: readonly string[]): string {
  const ids = NATION_IDS.map((n) => `"${n}" = ${PROFILES[n].name}`).join(', ');
  const priorText = prior.length
    ? prior
        .map((e) => `[${e.id}] to ${PROFILES[e.to].name}: ${e.type} "${e.what}"${e.promiseKind ? ` (${e.promiseKind}${e.topic ? `, topic: ${e.topic}` : ''}${e.about ? `, about ${PROFILES[e.about].name}` : ''})` : ''}`)
        .join('\n')
    : '(none)';
  return `You are the clerk of the Crossing's ledger. From the transcript of an audience between the Warden and ${PROFILES[nation].ruler.name} of ${PROFILES[nation].name}, record every PROMISE and every CLAIM the Warden made. Only the Warden's own words count; the ruler's words are context only. Do not invent entries. If the Warden made none, return an empty list.

A PROMISE is anything the Warden committed to do or not do, offered, or guaranteed (trade rights, alliance, support in war, passage, gold, land, secrecy, threats of harm).
A CLAIM is any assertion of fact about another nation or the world (troop movements, secret plans, alliances, insults, weakness).
Skip greetings, courtesies, flattery and praise of the ruler, questions, and opinions about a nation's character or tastes: they are not ledger entries. Record a promise or claim the Warden repeats only once.

For each entry:
- type: "promise" or "claim".
- what: a short ledger paraphrase, at most 14 words (e.g. "Exclusive river trade rights", "Ostrin is massing troops on Varrow's border").
- quote: the Warden's own words, at most 20 words.
- promise_kind (promises only, else null): exclusive (a right or favour given to this nation alone), support_against (help against a named nation), alliance, passage (letting their armies through the Crossing), deny_passage (keeping a named nation's armies out), gold, land, non_aggression, threat (a threat of harm to this ruler), other.
- topic (promises only, else ""): 1 to 3 lowercase words naming the thing promised, e.g. "river trade", "salt road", "passage".
- about: the nation the entry concerns, as an id, or null. For claims, the nation the claim is about. For support_against and deny_passage, the nation it is aimed at.
- claim_kind (claims only, else null): military_threat (massing troops, planning to attack), secret_alliance (plotting or allied with another nation), hostile_intent (hatred, insults, designs on land), weakness (its army is small, its treasury empty or its court divided; not remarks about its character or priorities), friendly_intent (wants peace or friendship), other.
- with_nation: for secret_alliance claims, the other party's id. For military_threat, hostile_intent or friendly_intent aimed at a nation other than ${PROFILES[nation].name} (e.g. "Kelm means to attack Sael"), that nation's id. Otherwise null.
- conflicts_with: ids from the earlier ledger below that this entry directly contradicts: the same exclusive thing promised to someone else, support promised to both sides of a quarrel, or passage promised to a nation the Warden also promised to keep out. Usually empty.

LAND OFFER: separately, record whether ${PROFILES[nation].ruler.name} (the ruler, not the Warden) firmly offered to give the Crossing one of their regions, or clearly agreed when the Warden asked for one. Vague hints, conditions still under discussion or refusals do not count. ${offerable.length ? `The regions ${PROFILES[nation].name} could give: ${offerable.join(', ')}.` : `${PROFILES[nation].name} has no region it could give; land_offer.offered must be false.`}

LEARNED: in at most 20 words, what the Warden learned of the ruler's wishes, fears or intentions from the ruler's own words (e.g. "Wants the salt road kept open; fears Varrow's riders"). Empty string if nothing.

Nation ids: ${ids}.

EARLIER LEDGER (promises and claims to other rulers):
${priorText}`;
}

export function extractInput(nation: NationId, turns: readonly { role: 'player' | 'ruler'; text: string }[]): string {
  return `TRANSCRIPT\n\n${transcript(nation, turns)}`;
}
