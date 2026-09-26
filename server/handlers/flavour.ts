/** POST /api/flavour: the chronicle of the season just ended, and a line in each sender's voice for new letters. */
import { seasonTitle } from '../../src/engine/config.js';
import { fallbackChronicle } from '../../src/engine/fallbacks.js';
import { FlavourAISchema, FlavourRequestSchema, cleanText, sanitizeLines, type FlavourResult } from '../../src/engine/schema.js';
import { guard, json, readJson } from '../http.js';
import { MODELS, effortFor, structured } from '../openai.js';
import { flavourInput, flavourInstructions } from '../prompts/flavour.js';

export async function handleFlavour(req: Request): Promise<Response> {
  const blocked = guard(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (!body.ok) return json({ error: 'bad_json' }, 400);
  const parsed = FlavourRequestSchema.safeParse(body.value);
  if (!parsed.success) return json({ error: 'invalid_request' }, 400);
  const request = parsed.data;
  const raw = await structured({
    label: `flavour:s${request.season}`,
    model: MODELS.rich,
    effort: effortFor('rich'),
    instructions: flavourInstructions(),
    input: flavourInput(request),
    schema: FlavourAISchema,
    schemaName: 'flavour',
    maxOutputTokens: 1400,
    timeoutMs: 20_000,
  });
  const chronicle = raw ? sanitizeLines(raw.chronicle, 2, 4, 240) : null;
  const known = new Set(request.letters.map((l) => l.id));
  const quotes: Record<string, string> = {};
  for (const q of raw?.letters ?? []) {
    const line = cleanText(q.quote, 200);
    if (line && known.has(q.id) && !quotes[q.id]) quotes[q.id] = line;
  }
  const result: FlavourResult = {
    chronicle: chronicle ?? fallbackChronicle(request.news, seasonTitle(request.season)),
    quotes,
    fallback: !chronicle,
  };
  return json(result);
}
