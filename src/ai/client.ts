/**
 * Typed wrappers around our own /api endpoints. The browser never talks to OpenAI directly and never
 * sends prompt text: only structured game data. Every call has its own safety timeout and falls back
 * to the same in-world defaults as the server, so the game can never hang on the network.
 */
import { fallbackAudienceReply, fallbackChronicle, fallbackEpilogue, fallbackVerdict } from '../engine/fallbacks';
import { seasonTitle } from '../engine/config';
import type {
  ActionRequest,
  ActionResult,
  AudienceAssessment,
  AudienceRequest,
  AudienceStreamEvent,
  ChronicleRequest,
  ChronicleResult,
  EndingAIResult,
  EndingRequest,
  ExtractRequest,
  ExtractResult,
  Mood,
} from '../engine/schema';
import type { NationId } from '../engine/types';

export interface Health {
  ok: boolean;
  ai: boolean;
  models?: { fast: string; rich: string };
}

async function postJson<T>(path: string, body: unknown, timeoutMs: number, fallback: () => T): Promise<T> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return fallback();
    return (await res.json()) as T;
  } catch {
    return fallback();
  }
}

export async function fetchHealth(): Promise<Health> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, ai: false };
    return (await res.json()) as Health;
  } catch {
    return { ok: false, ai: false };
  }
}

export interface StreamedReply {
  reply: string;
  mood: Mood;
  ends: boolean;
  fallback: boolean;
}

/** Stream a ruler's reply. `onEvent` sees meta and each delta as they arrive. */
export async function streamAudience(
  req: AudienceRequest,
  onEvent: (e: AudienceStreamEvent) => void,
): Promise<StreamedReply> {
  const nation = req.nation as NationId;
  const fallback = (): StreamedReply => {
    const reply = fallbackAudienceReply(nation);
    onEvent({ t: 'meta', mood: 'neutral', ends: true });
    onEvent({ t: 'delta', text: reply });
    return { reply, mood: 'neutral', ends: true, fallback: true };
  };
  let text = '';
  let mood: Mood = 'neutral';
  let ends = false;
  try {
    const res = await fetch('/api/audience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(65_000),
    });
    if (!res.ok || !res.body) return fallback();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl = buffer.indexOf('\n');
      while (nl >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        nl = buffer.indexOf('\n');
        if (!line) continue;
        let event: AudienceStreamEvent;
        try {
          event = JSON.parse(line) as AudienceStreamEvent;
        } catch {
          continue;
        }
        if (event.t === 'meta') {
          mood = event.mood;
          ends = event.ends;
          onEvent(event);
        } else if (event.t === 'delta') {
          text += event.text;
          onEvent(event);
        } else if (event.t === 'done') {
          return { reply: event.reply || text, mood: event.mood, ends: event.ends, fallback: event.fallback };
        }
      }
    }
    if (text) return { reply: text, mood, ends, fallback: false };
    return fallback();
  } catch {
    if (text) return { reply: text, mood, ends, fallback: false };
    return fallback();
  }
}

export function assessAudience(req: AudienceRequest): Promise<AudienceAssessment> {
  return postJson<AudienceAssessment>('/api/audience', req, 50_000, () => ({
    trustDelta: 0,
    endedEarly: !!req.endedByRuler,
    manipulation: false,
    learned: '',
    fallback: true,
  }));
}

export function extractPromises(req: ExtractRequest): Promise<ExtractResult> {
  return postJson<ExtractResult>('/api/extract', req, 50_000, () => ({ entries: [], fallback: true }));
}

export function chooseAction(req: ActionRequest): Promise<ActionResult> {
  return postJson<ActionResult>('/api/action', req, 50_000, () => ({
    action: 'wait',
    target: null,
    region: null,
    reason: 'watches and waits',
    fallback: true,
  }));
}

export function writeChronicle(req: ChronicleRequest): Promise<ChronicleResult> {
  return postJson<ChronicleResult>('/api/chronicle', req, 50_000, () => ({
    lines: fallbackChronicle(req.news, seasonTitle(req.season)),
    fallback: true,
  }));
}

export function writeEnding(req: EndingRequest): Promise<EndingAIResult> {
  return postJson<EndingAIResult>('/api/ending', req, 50_000, () => ({
    verdicts: Object.fromEntries(req.nations.map((n) => [n.nation, fallbackVerdict(n.nation, n.trust, n.blame)])),
    epilogue: fallbackEpilogue(req.ending.id),
    fallback: true,
  }));
}
