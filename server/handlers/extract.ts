/**
 * POST /api/extract: after an audience, the promises and claims the Warden made (as ledger data), any
 * land the ruler offered, and what the Warden learned of the ruler's wishes.
 */
import { cleanText, ExtractAISchema, ExtractRequestSchema, sanitizeExtraction, sanitizeLandOffer, type ExtractResult } from '../../src/engine/schema.js';
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
  const { nation, turns, prior, offerable } = parsed.data;
  if (!turns.some((t) => t.role === 'player')) return json({ entries: [], landOffer: null, learned: '', fallback: false } satisfies ExtractResult);
  const raw = await structured({
    label: `extract:${nation}`,
    model: MODELS.fast,
    effort: effortFor('fast'),
    instructions: extractInstructions(nation, prior, offerable),
    input: extractInput(nation, turns),
    schema: ExtractAISchema,
    schemaName: 'ledger_entries',
    maxOutputTokens: 1200,
    timeoutMs: 20_000,
  });
  const result: ExtractResult = raw
    ? {
        entries: sanitizeExtraction(raw, new Set(prior.map((p) => p.id))),
        landOffer: sanitizeLandOffer(raw.land_offer, offerable),
        learned: cleanText(raw.learned, 160),
        fallback: false,
      }
    : { entries: [], landOffer: null, learned: '', fallback: true };
  return json(result);
}
