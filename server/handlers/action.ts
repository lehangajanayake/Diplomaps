/** POST /api/action: one nation's chosen action for the season. The browser calls all five in parallel. */
import { DEFAULT_REASON } from '../../src/engine/resolve.js';
import { ActionAISchema, ActionRequestSchema, cleanText, type ActionResult } from '../../src/engine/schema.js';
import { guard, json, readJson } from '../http.js';
import { MODELS, effortFor, structured } from '../openai.js';
import { actionInput, actionInstructions } from '../prompts/action.js';

const FALLBACK: ActionResult = { action: 'wait', target: null, region: null, reason: 'watches and waits', fallback: true };

export async function handleAction(req: Request): Promise<Response> {
  const blocked = guard(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (!body.ok) return json({ error: 'bad_json' }, 400);
  const parsed = ActionRequestSchema.safeParse(body.value);
  if (!parsed.success) return json({ error: 'invalid_request' }, 400);
  const { nation, context } = parsed.data;
  const raw = await structured({
    label: `action:${nation}`,
    model: MODELS.fast,
    effort: effortFor('fast'),
    instructions: actionInstructions(nation, context),
    input: actionInput(),
    schema: ActionAISchema,
    schemaName: 'nation_action',
    maxOutputTokens: 900,
    timeoutMs: 20_000,
  });
  if (!raw) return json(FALLBACK);
  const region = raw.region && /^r\d{1,3}$/.test(raw.region.trim()) ? raw.region.trim() : null;
  const result: ActionResult = {
    action: raw.action,
    target: raw.target,
    region,
    reason: cleanText(raw.reason, 140) || DEFAULT_REASON[raw.action],
    fallback: false,
  };
  return json(result);
}
