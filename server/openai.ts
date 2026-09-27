/**
 * The only place the OpenAI SDK is used. Responses API, Zod structured outputs, streaming.
 * Every call: a timeout, one retry, output tokens capped, usage logged. Returns null on failure so
 * each handler can fall back to something in-world. The API key is never logged.
 */
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ZodType } from 'zod';

export type Effort = 'none' | 'minimal' | 'low' | 'medium' | 'high';
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export const MODELS = {
  get fast(): string {
    return process.env.MODEL_FAST?.trim() || 'gpt-5.6-luna';
  },
  get rich(): string {
    return process.env.MODEL_RICH?.trim() || 'gpt-5.6-terra';
  },
};

/** Reasoning effort per kind of call. Override every call with AI_REASONING=none|low|medium. */
export function effortFor(kind: 'chat' | 'fast' | 'rich'): Effort {
  const env = process.env.AI_REASONING?.trim() as Effort | undefined;
  if (env && ['none', 'minimal', 'low', 'medium', 'high'].includes(env)) return env;
  return kind === 'chat' ? 'none' : 'low';
}

let client: OpenAI | null = null;
let clientKey = '';

export function aiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY?.trim();
}

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  if (!client || clientKey !== key) {
    client = new OpenAI({ apiKey: key, maxRetries: 0 });
    clientKey = key;
  }
  return client;
}

/* ------------------------------------------------------------------ */
/* Usage and cost log                                                  */
/* ------------------------------------------------------------------ */

/** Prices per million tokens (USD), from the OpenAI model pages. Unknown models are logged without cost. */
const PRICES: Record<string, { input: number; cached: number; output: number }> = {
  'gpt-5.6-luna': { input: 0.2, cached: 0.02, output: 1.2 },
  'gpt-5.6-terra': { input: 2, cached: 0.2, output: 12 },
  'gpt-5.6-sol': { input: 5, cached: 0.5, output: 30 },
};

interface Usage {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: { cached_tokens?: number } | null;
  output_tokens_details?: { reasoning_tokens?: number } | null;
}

export const usageTotals = { calls: 0, failures: 0, input: 0, cached: 0, output: 0, reasoning: 0, cost: 0 };

export class AIQuotaError extends Error {
  constructor() {
    super('OpenAI credits or quota exhausted');
    this.name = 'AIQuotaError';
  }
}

function logUsage(label: string, model: string, usage: Usage | null | undefined, ms: number, note = ''): void {
  if (!usage) {
    console.log(`[ai] ${label.padEnd(20)} ${model} no usage reported ${ms}ms ${note}`);
    return;
  }
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  const reasoning = usage.output_tokens_details?.reasoning_tokens ?? 0;
  const price = PRICES[model];
  const cost = price ? ((usage.input_tokens - cached) * price.input + cached * price.cached + usage.output_tokens * price.output) / 1_000_000 : 0;
  usageTotals.calls += 1;
  usageTotals.input += usage.input_tokens;
  usageTotals.cached += cached;
  usageTotals.output += usage.output_tokens;
  usageTotals.reasoning += reasoning;
  usageTotals.cost += cost;
  console.log(
    `[ai] ${label.padEnd(20)} ${model} in=${usage.input_tokens} (cached ${cached}) out=${usage.output_tokens} (reasoning ${reasoning}) ${ms}ms ~$${cost.toFixed(5)}${note ? ` ${note}` : ''}` +
      ` | session: ${usageTotals.calls} calls, in=${usageTotals.input}, out=${usageTotals.output}, ~$${usageTotals.cost.toFixed(4)}`,
  );
}

function describeError(err: unknown): string {
  if (err instanceof OpenAI.APIError) return `${err.status ?? ''} ${err.name}: ${err.message}`.slice(0, 300);
  if (err instanceof Error) return `${err.name}: ${err.message}`.slice(0, 300);
  return String(err).slice(0, 300);
}

function isQuotaError(err: unknown): boolean {
  return err instanceof OpenAI.APIError && (err.code === 'insufficient_quota' || /quota|credit|billing/i.test(err.message));
}

/**
 * A small circuit breaker: after several failures in a row (timeouts, outages), skip calls for a short
 * while and fall back at once, so a stalled API costs the player seconds rather than minutes.
 */
const breaker = { failures: 0, openUntil: 0 };
const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 45_000;

function circuitOpen(label: string): boolean {
  if (Date.now() < breaker.openUntil) {
    console.log(`[ai] ${label.padEnd(20)} skipped: circuit open after repeated failures`);
    return true;
  }
  return false;
}

function recordOutcome(ok: boolean): void {
  if (ok) {
    breaker.failures = 0;
    return;
  }
  breaker.failures += 1;
  if (breaker.failures >= BREAKER_THRESHOLD) {
    breaker.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
    breaker.failures = 0;
    console.log(`[ai] circuit opened for ${BREAKER_COOLDOWN_MS / 1000}s: the API keeps failing`);
  }
}

/** Models that rejected the reasoning parameter; we stop sending it to them. */
const noReasoning = new Set<string>();

function rejectsReasoning(err: unknown): boolean {
  return err instanceof OpenAI.APIError && err.status === 400 && /reasoning/i.test(err.message);
}

interface BaseOptions {
  label: string;
  model: string;
  effort: Effort;
  instructions: string;
  input: string | ChatMessage[];
  schemaName: string;
  maxOutputTokens: number;
  timeoutMs: number;
}

function params<T>(o: BaseOptions & { schema: ZodType<T> }, attempt: number) {
  const effort: Effort = attempt === 0 ? o.effort : 'none';
  return {
    model: o.model,
    instructions: o.instructions,
    input: o.input,
    max_output_tokens: Math.round(o.maxOutputTokens * (attempt === 0 ? 1 : 1.5)),
    store: false,
    text: { format: zodTextFormat(o.schema, o.schemaName) },
    ...(noReasoning.has(o.model) ? {} : { reasoning: { effort } }),
  };
}

/** A structured call: parsed and validated by Zod, or null after one retry. */
export async function structured<T>(o: BaseOptions & { schema: ZodType<T> }): Promise<T | null> {
  const c = getClient();
  if (!c) {
    console.log(`[ai] ${o.label.padEnd(20)} skipped: no OPENAI_API_KEY configured`);
    return null;
  }
  if (circuitOpen(o.label)) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = Date.now();
    try {
      const response = await c.responses.parse(params(o, attempt), { signal: AbortSignal.timeout(o.timeoutMs) });
      logUsage(o.label, o.model, response.usage, Date.now() - t0, attempt ? '(retry)' : '');
      if (response.status === 'completed' && response.output_parsed) {
        recordOutcome(true);
        return response.output_parsed as T;
      }
      console.log(`[ai] ${o.label} attempt ${attempt + 1}: ${response.status}${response.incomplete_details ? ` (${response.incomplete_details.reason})` : ''}`);
    } catch (err) {
      if (isQuotaError(err)) throw new AIQuotaError();
      if (rejectsReasoning(err) && !noReasoning.has(o.model)) {
        noReasoning.add(o.model);
        attempt--;
        continue;
      }
      console.log(`[ai] ${o.label} attempt ${attempt + 1} failed after ${Date.now() - t0}ms: ${describeError(err)}`);
      if (circuitOpen(o.label)) break;
    }
  }
  usageTotals.failures += 1;
  recordOutcome(false);
  return null;
}

/**
 * Stream a structured response, handing each raw JSON text delta to `onText`.
 * Resolves with ok=false if the stream failed or ended incomplete.
 */
export async function streamStructured<T>(
  o: BaseOptions & { schema: ZodType<T>; onText: (chunk: string) => void; attempt: number },
): Promise<{ ok: boolean; text: string; quotaExceeded?: boolean }> {
  const c = getClient();
  if (!c) {
    console.log(`[ai] ${o.label.padEnd(20)} skipped: no OPENAI_API_KEY configured`);
    return { ok: false, text: '' };
  }
  if (circuitOpen(o.label)) return { ok: false, text: '' };
  const t0 = Date.now();
  let text = '';
  let usage: Usage | null | undefined = null;
  let ok = false;
  for (let tries = 0; tries < 2; tries++) {
    try {
      const stream = await c.responses.create({ ...params(o, o.attempt), stream: true }, { signal: AbortSignal.timeout(o.timeoutMs) });
      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
          text += event.delta;
          o.onText(event.delta);
        } else if (event.type === 'response.completed') {
          usage = event.response.usage;
          ok = true;
        } else if (event.type === 'response.incomplete') {
          usage = event.response.usage;
          console.log(`[ai] ${o.label} stream incomplete: ${event.response.incomplete_details?.reason ?? 'unknown'}`);
        } else if (event.type === 'response.failed' || event.type === 'error') {
          console.log(`[ai] ${o.label} stream failed: ${event.type}`);
        }
      }
      break;
    } catch (err) {
      if (isQuotaError(err)) return { ok: false, text: '', quotaExceeded: true };
      if (rejectsReasoning(err) && !noReasoning.has(o.model) && text.length === 0) {
        noReasoning.add(o.model);
        continue;
      }
      console.log(`[ai] ${o.label} stream error after ${Date.now() - t0}ms: ${describeError(err)}`);
      break;
    }
  }
  logUsage(o.label, o.model, usage, Date.now() - t0, o.attempt ? '(retry)' : '');
  if (!ok) usageTotals.failures += 1;
  recordOutcome(ok);
  return { ok, text };
}
