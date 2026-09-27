/**
 * POST /api/audience: one exchange of a live audience. Streams the ruler's in-character reply as NDJSON
 * (meta, delta..., done). With the reply the ruler judges the Warden's words (mood, trust, and the
 * patience they cost); when patience runs out, the ruler ends the audience.
 */
import { CONFIG } from '../../src/engine/config.js';
import { fallbackAudienceReply } from '../../src/engine/fallbacks.js';
import { AudienceReplyAISchema, AudienceRequestSchema, cleanText, sanitizeExchange, type AudienceStreamEvent, type Exchange } from '../../src/engine/schema.js';
import { guard, json, readJson } from '../http.js';
import { looksLikeManipulation } from '../manipulation.js';
import { MODELS, effortFor, streamStructured } from '../openai.js';
import { synthesizeRulerSpeech } from '../elevenlabs.js';
import { audienceInput, audienceInstructions } from '../prompts/audience.js';
import { ReplyParser } from '../replyParser.js';

const REPLY_TIMEOUT_MS = 25_000;

export async function handleAudience(req: Request): Promise<Response> {
  const blocked = guard(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (!body.ok) return json({ error: 'bad_json' }, 400);
  const parsed = AudienceRequestSchema.safeParse(body.value);
  if (!parsed.success) return json({ error: 'invalid_request' }, 400);
  const { nation, turns, context, patience } = parsed.data;

  const last = turns[turns.length - 1];
  if (!last || last.role !== 'player') return json({ error: 'invalid_request' }, 400);
  const exchange = turns.filter((t) => t.role === 'player').length;
  if (exchange > CONFIG.audience.maxExchanges) return json({ error: 'invalid_request' }, 400);
  const insolentWords = looksLikeManipulation(last.text);
  const instructions = audienceInstructions(nation, context, { patience, exchange, suspicious: insolentWords });
  const input = audienceInput(turns);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (e: AudienceStreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          open = false;
        }
      };
      // Without narration the reply inks itself in as it is written; with it, the words wait for the voice.
      const streamWords = !CONFIG.narrationEnabled;
      let metaSent = false;
      let emitted = '';
      let parser = new ReplyParser();
      let finished = false;
      for (let attempt = 0; attempt < 2 && !finished; attempt++) {
        parser = new ReplyParser();
        const result = await streamStructured({
          label: `audience:${nation}`,
          model: MODELS.fast,
          effort: effortFor('chat'),
          instructions,
          input,
          schema: AudienceReplyAISchema,
          schemaName: 'ruler_reply',
          maxOutputTokens: 600,
          timeoutMs: REPLY_TIMEOUT_MS,
          attempt,
          onText: (chunk) => {
            parser.push(chunk);
            if (!metaSent && (parser.started || (parser.mood && parser.ends !== null))) {
              send({ t: 'meta', mood: parser.mood ?? 'wary', ends: parser.ends ?? false });
              metaSent = true;
            }
            if (streamWords && metaSent && parser.reply.length > emitted.length && parser.reply.startsWith(emitted)) {
              send({ t: 'delta', text: parser.reply.slice(emitted.length) });
              emitted = parser.reply;
            }
          },
        });
        if (result.quotaExceeded) {
          send({ t: 'error', error: 'ai_credits_exhausted' });
          if (open) controller.close();
          return;
        }
        if (result.ok && parser.complete) finished = true;
        else if (emitted.length > 0) break; // words already shown; do not start the reply again
      }

      // The judgement comes from the whole reply; a reply cut short counts as a fair, plain exchange.
      let judged: Exchange = sanitizeExchange({ mood: parser.mood ?? 'wary', trust_delta: 0, patience_cost: 1, insolent: false }, insolentWords);
      let ends = parser.ends ?? false;
      let reply = parser.reply;
      if (finished) {
        try {
          const full = AudienceReplyAISchema.safeParse(JSON.parse(parser.buf));
          if (full.success) {
            judged = sanitizeExchange(full.data, insolentWords);
            ends = full.data.ends_audience;
            reply = full.data.reply;
          }
        } catch {
          // keep what the incremental parser read
        }
      }
      reply = cleanText(reply, 700);
      if (reply) {
        const outOfPatience = patience - judged.patienceCost <= 0 || exchange >= CONFIG.audience.maxExchanges;
        const speech = CONFIG.narrationEnabled ? await synthesizeRulerSpeech(nation, reply) : { audio: null, quotaExceeded: false };
        if (speech.quotaExceeded) send({ t: 'error', error: 'elevenlabs_credits_exhausted' });
        if (speech.audio) send({ t: 'audio', data: speech.audio });
        if (reply.length > emitted.length && reply.startsWith(emitted)) send({ t: 'delta', text: reply.slice(emitted.length) });
        send({ t: 'done', ...judged, ends: ends || outOfPatience, reply, fallback: false });
      } else {
        const text = fallbackAudienceReply(nation);
        if (!metaSent) send({ t: 'meta', mood: 'wary', ends: true });
        send({ t: 'delta', text });
        send({ t: 'done', mood: 'wary', trustDelta: 0, patienceCost: 0, insolent: false, ends: true, reply: text, fallback: true });
      }
      if (open) controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
