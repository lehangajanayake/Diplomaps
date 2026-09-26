/** POST /api/ending: each ruler's one-line verdict on the Warden. */
import { fallbackVerdict } from '../../src/engine/fallbacks.js';
import { EndingAIOutputSchema, EndingRequestSchema, cleanText, type EndingAIResult } from '../../src/engine/schema.js';
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
    maxOutputTokens: 1400,
    timeoutMs: 20_000,
  });
  const won = request.outcome.result === 'victory';
  const verdicts: EndingAIResult['verdicts'] = {};
  for (const v of raw?.verdicts ?? []) {
    const line = cleanText(v.line, 220);
    if (line && !verdicts[v.nation]) verdicts[v.nation] = line;
  }
  let fallback = !raw;
  for (const n of request.nations) {
    if (verdicts[n.nation]) continue;
    verdicts[n.nation] = fallbackVerdict(n.nation, n.trust, n.suspicion, won);
    fallback = true;
  }
  return json({ verdicts, fallback } satisfies EndingAIResult);
}
