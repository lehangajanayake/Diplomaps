/**
 * Why things happened. Every event the player is shown carries a cause: a few plain words that finish
 * "…, because ___", and whether something the Warden did had a hand in it ("Your doing").
 *
 * Decisions whose reasons are gone by the end of the bell (a war declared, a war called off, an army
 * sent against the valley) are explained where they are made. Everything else is explained in one pass
 * over the season's events, from the world as it was when the bell rang and as it is after.
 */
import { CONFIG } from './config.js';
import { provokes, reassures } from './ledger.js';
import { nameOf } from './nations.js';
import { CROSSING, NATION_IDS, type Because, type GameEvent, type Holder, type NationId, type Owner, type War, type WarCause, type WorldState } from './types.js';
import { atWar, hasGrudge } from './world.js';
import { roadState, type RoadState } from './economy.js';

const who = (h: Holder) => nameOf(h);

/** "Varrow", "Varrow and Kelm", "Varrow, Kelm and Sael". */
const list = (ns: readonly NationId[]) => (ns.length < 3 ? ns.map(who).join(' and ') : `${ns.slice(0, -1).map(who).join(', ')} and ${who(ns.at(-1)!)}`);

const yours = (why: string): Because => ({ why, yours: true });
const theirs = (why: string): Because => ({ why, yours: false });

/** The Warden's words to `nation` about `target` this season and last that pushed it toward war. */
function stokingWords(w: WorldState, nation: NationId, target: NationId) {
  return w.player.ledger.filter(
    (e) => e.to === nation && e.about === target && e.season >= w.season - 1 && (provokes(e) || e.promiseKind === 'support_against'),
  );
}

/** A red line of `nation` that `by` crossed lately, if any. */
function crossedLine(w: WorldState, nation: NationId, by: Owner) {
  return [...w.nations[nation].redLineCrossings].reverse().find((c) => c.by === by && w.season - c.season <= CONFIG.military.redLineMemory);
}

/** Why `nation` declared war on `target`, decided when it did. */
export function warCause(w: WorldState, nation: NationId, target: NationId, cause: Exclude<WarCause, 'ally'>): Because {
  if (cause === 'favour') return yours(`you called in a favour from ${who(nation)}`);
  const words = stokingWords(w, nation, target);
  const said = words.find(provokes) ?? words[0];
  if (cause === 'words' && said) return yours(`you told ${who(nation)} “${said.what}”`);
  const line = crossedLine(w, nation, target);
  const grudge = line
    ? `${who(target)} crossed ${who(nation)}'s red line: ${line.what}`
    : hasGrudge(nation, target)
      ? `${who(nation)} has an old grudge against ${who(target)}`
      : w.nations[nation].trust[target] <= -40
        ? `${who(nation)} has come to hate ${who(target)}`
        : `${who(nation)} saw ${who(target)} as weak, with tension running high`;
  if (said) return yours(`${grudge}, and your words stoked it`);
  const allowed = crossedLine(w, nation, CROSSING);
  if (allowed) return yours(`${grudge}, after you ${allowed.what.replace(/^the Warden /, '')}`);
  return theirs(grudge);
}

/** Why `ally` joined the war on `aggressor`: it came to its friend's aid, so the first war's cause carries over. */
export function allyCause(ally: NationId, attacked: NationId, first: Because | undefined): Because {
  return { why: `${who(ally)} came to the aid of its ally ${who(attacked)}`, yours: first?.yours ?? false };
}

/** Why `nation` called off the war it planned on `target`, decided at the bell. */
export function standDownCause(w: WorldState, nation: NationId, target: NationId, passBarred: boolean): Because {
  if (passBarred) return yours(`your closed pass barred ${who(nation)}'s road to ${who(target)}`);
  const calmed = w.player.ledger.find((e) => e.to === nation && e.about === target && e.season >= w.season - 1 && reassures(e));
  if (calmed) return yours(`you told ${who(nation)} “${calmed.what}”`);
  const talked = w.player.ledger.some((e) => e.to === nation && e.season === w.season);
  return talked ? yours(`you spoke with ${who(nation)} and its anger cooled`) : theirs(`${who(nation)}'s anger cooled`);
}

/** Why `nation` means to march on the valley: its strongest reason, and every one the Warden gave it. */
export function attackReasons(w: WorldState, nation: NationId): Because {
  const a = CONFIG.attack;
  const n = w.nations[nation];
  const reasons: string[] = [];
  if (n.grievances > 0) reasons.push(`you refused or shut out its army`);
  if (n.trustPlayer <= a.hostileTrust) reasons.push(`it distrusts you`);
  if (w.map.regionIds.filter((id) => w.regions[id]!.owner === CROSSING).length > a.largeFrom) reasons.push(`your valley has grown large`);
  if (w.player.neutrality < a.lowNeutrality) reasons.push(`you have taken sides`);
  return yours(reasons.length ? reasons.slice(0, 2).join(' and ') : `it covets your valley`);
}

/** The cause a war was declared with, for the battles fought in it and the land it took. */
function warBecause(w: WorldState, a: Owner, b: Owner): Because | undefined {
  const war = w.wars.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  return war?.because;
}

function peaceCause(before: WorldState, e: Extract<GameEvent, { kind: 'peace' }>): Because {
  if (e.how === 'talks') return yours('you hosted peace talks in Wayhold');
  if (e.how === 'fallen') return theirs('one side has fallen');
  const war: War | undefined = before.wars.find((x) => (x.a === e.a && x.b === e.b) || (x.a === e.b && x.b === e.a));
  return theirs(war && war.quiet >= CONFIG.war.truceAfterQuiet ? 'neither side had fought for a season' : 'both sides were weary of war');
}

function commonEnemy(w: WorldState, a: NationId, b: NationId): NationId | undefined {
  return NATION_IDS.find((x) => x !== a && x !== b && atWar(w, a, x) && atWar(w, b, x));
}

/** Explain one event that was not explained where it happened. */
function explainOne(before: WorldState, after: WorldState, e: GameEvent, events: readonly GameEvent[]): Because | undefined {
  const place = (id: string) => after.map.regions[id]?.name ?? id;
  switch (e.kind) {
    case 'battle': {
      if (e.defender === CROSSING) {
        const intent = before.intents.find((i) => i.kind === 'attack' && i.nation === e.attacker);
        return intent?.kind === 'attack' && intent.because ? intent.because : yours(`${who(e.attacker)} turned on your valley`);
      }
      if (e.viaCrossing) {
        const forced = events.some((x) => x.kind === 'march' && x.nation === e.attacker && x.forced);
        return forced ? yours(`${who(e.attacker)} forced its way through your valley`) : yours(`you let ${who(e.attacker)}'s army through your valley`);
      }
      // A battle in a war the Warden set off carries that cause; otherwise it is simply the war.
      const war = warBecause(after, e.attacker, e.defender) ?? warBecause(before, e.attacker, e.defender);
      return war?.yours ? war : theirs(`${who(e.attacker)} and ${who(e.defender)} are at war`);
    }
    case 'collapse': {
      const war = warBecause(before, e.nation, e.by);
      return { why: `${who(e.by)} took its capital, ${place(e.region)}`, yours: war?.yours ?? false };
    }
    case 'march': {
      if (e.forced) return yours(`you refused ${who(e.nation)} passage, and it came anyway`);
      const sent = after.player.favours.some((f) => f.season === e.season && f.nation === e.nation && f.target === e.target);
      return yours(sent ? `you called in ${who(e.nation)}'s favour` : `you granted ${who(e.nation)} passage`);
    }
    case 'turned_back':
      return yours(`it was marching on ${who(e.target)}`);
    case 'burn': {
      const letter = before.letters.find((l) => l.kind === 'raid' && l.from === e.nation && l.region === e.region && l.season === e.season);
      return yours(letter?.choice ? `you would not pay ${who(e.nation)}'s raiders` : `you left ${who(e.nation)}'s raiders unanswered`);
    }
    case 'gain':
      switch (e.how) {
        case 'offer':
          return yours(`${who(e.from)} offered it to you in an audience`);
        case 'payment':
          return yours(`you asked ${who(e.from)} for land instead of gold`);
        case 'spoils':
          return yours(`${who(e.from)} shared the spoils of the war you started`);
        default:
          return yours('you claimed the ruins');
      }
    case 'cede':
      return e.nation === CROSSING ? yours(`you gave it to ${who(e.target)}`) : undefined;
    case 'peace':
      return peaceCause(before, e);
    case 'alliance': {
      const enemy = commonEnemy(after, e.a, e.b);
      return theirs(enemy ? `both are at war with ${who(enemy)}` : 'they trust each other');
    }
    case 'lie_caught':
      return yours(e.how ? e.how.charAt(0).toLowerCase() + e.how.slice(1) : 'word of your lie spread');
    case 'exposed':
      return yours(`${who(e.nation)} let slip that you asked for the war`);
    case 'red_line':
      return e.by === CROSSING ? yours(`you ${e.what.replace(/^the Warden /, '')}`) : theirs(`${who(e.by)} ${e.what}`);
    case 'move':
      return before.regions[e.to]?.owner !== after.regions[e.to]?.owner ? theirs(`the ruins lay empty beside ${who(e.nation)}`) : undefined;
    case 'income': {
      // Why tolls fell: roads that paid when the bell rang and pay no more. Passes the Warden shut first.
      const was = (n: NationId, state: RoadState) => roadState(before, n) === 'open' && roadState(after, n) === state;
      const shut = NATION_IDS.filter((n) => was(n, 'closed'));
      if (shut.length) return yours(`you closed the pass to ${list(shut)}`);
      const broken = NATION_IDS.filter((n) => was(n, 'broken') || was(n, 'gone'));
      if (broken.length) return theirs(`war broke the road${broken.length > 1 ? 's' : ''} to ${list(broken)}`);
      if (e.lost) return yours('raiders burned your fields');
      if (after.player.neutrality < before.player.neutrality) return yours('you took sides, and caravans avoid a partisan valley');
      return undefined;
    }
    default:
      return undefined;
  }
}

/** Give every event of the season that has no cause yet its cause. `before` is the world when the bell rang. */
export function explainEvents(before: WorldState, after: WorldState, events: GameEvent[]): GameEvent[] {
  return events.map((e) => {
    if (e.because) return e;
    const because = explainOne(before, after, e, events);
    return because ? { ...e, because } : e;
  });
}
