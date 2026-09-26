/** POST /api/ending: each ruler's verdict on the Warden, and a historian's epilogue. */
import { fallbackEpilogue, fallbackVerdict } from '../../src/engine/fallbacks.js';
import { EndingAIOutputSchema, EndingRequestSchema, cleanText, type EndingAIResult } from '../../src/engine/schema.js';
import { NATION_IDS } from '../../src/engine/types.js';
import { guard, json, readJson } from '../http.js';
import { MODELS, effortFor, structured } from '../openai.js';
import { endingInput, endingInstructions } from '../prompts/ending.js';

export async function handleEnding(req: Request): Promise<Response> {
  const blocked = guard(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (!body.ok) return json({ error: 'bad_json' }, 400);
  const parsed = EndingRequestSchema.safeParse(body.value);
  if (!parsed.success) return json({ error: 'invalid_request' }, 400);
  const request = parsed.data;
  const raw = await structured({
    label: 'ending',
    model: MODELS.rich,
    effort: effortFor('rich'),
    instructions: endingInstructions(),
    input: endingInput(request),
    schema: EndingAIOutputSchema,
    schemaName: 'ending',
    maxOutputTokens: 1800,
    timeoutMs: 20_000,
  });
  const verdicts: EndingAIResult['verdicts'] = {};
  for (const v of raw?.verdicts ?? []) {
    const line = cleanText(v.line, 260);
    if (line && !verdicts[v.nation]) verdicts[v.nation] = line;
  }
  let fallback = !raw;
  for (const n of request.nations) {
    if (!verdicts[n.nation]) {
      verdicts[n.nation] = fallbackVerdict(n.nation, n.trust, n.suspicion);
      fallback = true;
    }
  }
  const epilogue = (raw && cleanText(raw.epilogue, 1100)) || fallbackEpilogue(request.ending.id);
  const result: EndingAIResult = { verdicts, epilogue, fallback: fallback || !raw?.epilogue };
  if (Object.keys(verdicts).length !== NATION_IDS.length) result.fallback = true;
  return json(result);
}
