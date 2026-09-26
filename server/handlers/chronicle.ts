/** POST /api/chronicle: 2-4 lines of "News of the Realm" for the season just ended. */
import { seasonTitle } from '../../src/engine/config.js';
import { fallbackChronicle } from '../../src/engine/fallbacks.js';
import { ChronicleAISchema, ChronicleRequestSchema, sanitizeLines, type ChronicleResult } from '../../src/engine/schema.js';
import { guard, json, readJson } from '../http.js';
import { MODELS, effortFor, structured } from '../openai.js';
import { chronicleInput, chronicleInstructions } from '../prompts/chronicle.js';

export async function handleChronicle(req: Request): Promise<Response> {
  const blocked = guard(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (!body.ok) return json({ error: 'bad_json' }, 400);
  const parsed = ChronicleRequestSchema.safeParse(body.value);
  if (!parsed.success) return json({ error: 'invalid_request' }, 400);
  const request = parsed.data;
  const raw = await structured({
    label: `chronicle:s${request.season}`,
    model: MODELS.rich,
    effort: effortFor('rich'),
    instructions: chronicleInstructions(),
    input: chronicleInput(request),
    schema: ChronicleAISchema,
    schemaName: 'chronicle',
    maxOutputTokens: 900,
    timeoutMs: 20_000,
  });
  const lines = raw ? sanitizeLines(raw.lines, 2, 4, 240) : null;
  const result: ChronicleResult = lines
    ? { lines, fallback: false }
    : { lines: fallbackChronicle(request.news, seasonTitle(request.season)), fallback: true };
  return json(result);
}
