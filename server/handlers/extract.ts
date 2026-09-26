/** POST /api/extract: the promises and claims the Warden made in one audience, as ledger data. */
import { ExtractAISchema, ExtractRequestSchema, sanitizeExtraction, type ExtractResult } from '../../src/engine/schema.js';
import { guard, json, readJson } from '../http.js';
import { MODELS, effortFor, structured } from '../openai.js';
import { extractInput, extractInstructions } from '../prompts/extract.js';

export async function handleExtract(req: Request): Promise<Response> {
  const blocked = guard(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (!body.ok) return json({ error: 'bad_json' }, 400);
  const parsed = ExtractRequestSchema.safeParse(body.value);
  if (!parsed.success) return json({ error: 'invalid_request' }, 400);
  const { nation, turns, prior } = parsed.data;
  if (!turns.some((t) => t.role === 'player')) return json({ entries: [], fallback: false } satisfies ExtractResult);
  const raw = await structured({
    label: `extract:${nation}`,
    model: MODELS.fast,
    effort: effortFor('fast'),
    instructions: extractInstructions(nation, prior),
    input: extractInput(nation, turns),
    schema: ExtractAISchema,
    schemaName: 'ledger_entries',
    maxOutputTokens: 1200,
    timeoutMs: 20_000,
  });
  const result: ExtractResult = raw
    ? { entries: sanitizeExtraction(raw, new Set(prior.map((p) => p.id))), fallback: false }
    : { entries: [], fallback: true };
  return json(result);
}
