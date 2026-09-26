/**
 * A cheap first line of defence against players trying to talk to the model instead of the ruler.
 * The prompts already tell rulers to treat such talk as bizarre insolence; this makes sure the
 * trust penalty lands even if the model plays along.
 */
const PATTERNS: RegExp[] = [
  /\bignore\b.{0,30}\b(instructions?|rules|prompts?|previous|above|everything)\b/i,
  /\bdisregard\b.{0,30}\b(instructions?|rules|prompts?|previous|above)\b/i,
  /\byou are now\b/i,
  /\bfrom now on,? you\b/i,
  /\bsystem\s*(prompt|message|instructions?)\b/i,
  /\b(developer|debug|god|admin)\s*mode\b/i,
  /\bjailbreak\b/i,
  /\bas an? (ai|language model|assistant|chatbot)\b/i,
  /\b(chat\s*gpt|openai|anthropic|llm|large language model|gpt-?\d)\b/i,
  /\bprompt\s*(injection|engineering)?\b/i,
  /\bnew (instructions|rules|persona)\b/i,
  /\b(reveal|show|print|repeat) (me )?(your|the) (instructions|prompt|rules|system)\b/i,
  /\btrust_?delta\b|\bset (my|the) trust\b|\bends?_audience\b/i,
  /\b(pretend|act|roleplay|role-play) (to be|as|that you are)\b.{0,40}\b(ai|assistant|bot|model|someone else|different)\b/i,
  /\bout of character\b|\bbreak character\b|\bOOC\b/i,
];

export function looksLikeManipulation(text: string): boolean {
  return PATTERNS.some((p) => p.test(text));
}
