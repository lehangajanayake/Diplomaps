/**
 * Typed wrappers around our own /api endpoints. The browser never talks to OpenAI directly and never
 * sends prompt text: only structured game data. Every call has its own safety timeout and falls back
 * to the same in-world defaults as the server, so the game can never hang on the network.
 */
import { fallbackAudienceReply, fallbackChronicle, fallbackVerdict } from '../engine/fallbacks';
import { seasonTitle } from '../engine/config';
import type {
  AudienceRequest,
  AudienceStreamEvent,
  EndingAIResult,
  EndingRequest,
  Exchange,
  ExtractRequest,
  ExtractResult,
  FlavourRequest,
  FlavourResult,
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

/** One exchange of an audience: the ruler's reply and how the Warden's words landed. */
export interface StreamedReply extends Exchange {
  reply: string;
  ends: boolean;
  fallback: boolean;
}

/** Stream a ruler's reply. `onEvent` sees meta and each delta as they arrive. */
export async function streamAudience(req: AudienceRequest, onEvent: (e: AudienceStreamEvent) => void): Promise<StreamedReply> {
  const nation = req.nation as NationId;
  const calm: Exchange = { mood: 'wary', trustDelta: 0, patienceCost: 1, insolent: false };
  // The ruler is "called away": nothing is judged, and the audience ends.
  const fallback = (): StreamedReply => {
    const reply = fallbackAudienceReply(nation);
    onEvent({ t: 'meta', mood: 'wary', ends: true });
    onEvent({ t: 'delta', text: reply });
    return { ...calm, patienceCost: 0, reply, ends: true, fallback: true };
  };
  let text = '';
  let mood: Mood = 'wary';
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
        } else if (event.t === 'delta') {
          text += event.text;
        } else if (event.t === 'done') {
          const { t: _t, ...reply } = event;
          return { ...reply, reply: event.reply || text };
        }
        onEvent(event);
      }
    }
    if (text) return { ...calm, mood, reply: text, ends, fallback: false };
    return fallback();
  } catch {
    if (text) return { ...calm, mood, reply: text, ends, fallback: false };
    return fallback();
  }
}

export function extractPromises(req: ExtractRequest): Promise<ExtractResult> {
  return postJson<ExtractResult>('/api/extract', req, 50_000, () => ({ entries: [], landOffer: null, learned: '', fallback: true }));
}

/** The chronicle of the season just ended, and the words on the letters that open the next. */
export function writeFlavour(req: FlavourRequest): Promise<FlavourResult> {
  return postJson<FlavourResult>('/api/flavour', req, 50_000, () => ({
    chronicle: fallbackChronicle(req.news, seasonTitle(req.season)),
    quotes: {},
    fallback: true,
  }));
}

export function writeEnding(req: EndingRequest): Promise<EndingAIResult> {
  return postJson<EndingAIResult>('/api/ending', req, 50_000, () => ({
    verdicts: Object.fromEntries(req.nations.map((n) => [n.nation, fallbackVerdict(n.nation, n.trust, n.suspicion, req.outcome.result === 'victory')])),
    fallback: true,
  }));
}
