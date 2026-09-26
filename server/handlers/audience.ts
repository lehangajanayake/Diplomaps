/**
 * POST /api/audience
 *   mode "reply":  streams the ruler's in-character reply as NDJSON (meta, delta..., done).
 *   mode "assess": after the audience, returns { trustDelta, endedEarly, manipulation, learned }.
 */
import { CONFIG } from '../../src/engine/config.js';
import { fallbackAudienceReply } from '../../src/engine/fallbacks.js';
import {
  AudienceAssessAISchema,
  AudienceReplyAISchema,
  AudienceRequestSchema,
  cleanText,
  sanitizeAssessment,
  type AudienceAssessment,
  type AudienceStreamEvent,
  type Mood,
} from '../../src/engine/schema.js';
import { guard, json, readJson } from '../http.js';
import { looksLikeManipulation } from '../manipulation.js';
import { MODELS, effortFor, streamStructured, structured } from '../openai.js';
import { synthesizeRulerSpeech } from '../elevenlabs.js';
import { assessInput, assessInstructions } from '../prompts/assess.js';
import { audienceInput, audienceInstructions } from '../prompts/audience.js';
import { ReplyParser } from '../replyParser.js';

const REPLY_TIMEOUT_MS = 25_000;
const ASSESS_TIMEOUT_MS = 20_000;

export async function handleAudience(req: Request): Promise<Response> {
  const blocked = guard(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (!body.ok) return json({ error: 'bad_json' }, 400);
  const parsed = AudienceRequestSchema.safeParse(body.value);
  if (!parsed.success) return json({ error: 'invalid_request' }, 400);
  const { mode, nation, turns, context, endedByRuler } = parsed.data;

  if (mode === 'assess') {
    const injection = turns.some((t) => t.role === 'player' && looksLikeManipulation(t.text));
    const raw = await structured({
      label: `assess:${nation}`,
      model: MODELS.fast,
      effort: effortFor('fast'),
      instructions: assessInstructions(nation, context),
      input: assessInput(nation, turns, endedByRuler),
      schema: AudienceAssessAISchema,
      schemaName: 'audience_assessment',
      maxOutputTokens: 700,
      timeoutMs: ASSESS_TIMEOUT_MS,
    });
    const result: AudienceAssessment = raw
      ? { ...sanitizeAssessment(raw), fallback: false }
      : { trustDelta: 0, endedEarly: endedByRuler, manipulation: false, learned: '', fallback: true };
    if (injection) {
      result.manipulation = true;
      result.trustDelta = Math.min(result.trustDelta, -6);
    }
    result.endedEarly = result.endedEarly || endedByRuler;
    return json(result);
  }

  const last = turns[turns.length - 1];
  if (!last || last.role !== 'player') return json({ error: 'invalid_request' }, 400);
  const playerTurn = turns.filter((t) => t.role === 'player').length;
  if (playerTurn > CONFIG.messagesPerAudience) return json({ error: 'invalid_request' }, 400);
  const suspicious = looksLikeManipulation(last.text);
  const instructions = audienceInstructions(nation, context, playerTurn, suspicious);
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
      let metaSent = false;
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
              send({ t: 'meta', mood: parser.mood ?? 'neutral', ends: parser.ends ?? false });
              metaSent = true;
            }
          },
        });
        if (result.ok && parser.complete) finished = true;
      }

      let mood: Mood = parser.mood ?? 'neutral';
      let ends = parser.ends ?? false;
      let reply = parser.reply;
      if (finished) {
        try {
          const full = AudienceReplyAISchema.safeParse(JSON.parse(parser.buf));
          if (full.success) {
            mood = full.data.mood;
            ends = full.data.ends_audience;
            reply = full.data.reply;
          }
        } catch {
          // keep what the incremental parser read
        }
      }
      reply = cleanText(reply, 900);
      if (reply) {
        const audio = await synthesizeRulerSpeech(nation, reply);
        if (audio) send({ t: 'audio', data: audio });
        send({ t: 'delta', text: reply });
        send({ t: 'done', mood, ends: ends || playerTurn >= CONFIG.messagesPerAudience, reply, fallback: false });
      } else {
        const text = fallbackAudienceReply(nation);
        if (!metaSent) send({ t: 'meta', mood: 'neutral', ends: true });
        send({ t: 'delta', text });
        send({ t: 'done', mood: 'neutral', ends: true, reply: text, fallback: true });
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
