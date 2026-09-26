/**
 * Incremental reader for the streamed audience JSON: {"mood": "...", "trust_delta": n, ..., "ends_audience": bool,
 * "reply": "..."}. Pulls out mood and ends_audience as soon as they appear and decodes the reply string as it
 * grows, so the ruler's words can be shown while they are still being written. The rest of the judgement is read
 * from the whole reply once it is complete.
 */
import { MOODS, type Mood } from '../src/engine/schema.js';

const ESCAPES: Record<string, string> = { n: '\n', t: ' ', r: '', '"': '"', '\\': '\\', '/': '/', b: '', f: '' };

export class ReplyParser {
  buf = '';
  mood: Mood | null = null;
  ends: boolean | null = null;
  reply = '';
  complete = false;
  private start = -1;
  private pos = 0;

  push(chunk: string): void {
    this.buf += chunk;
    if (!this.mood) {
      const m = /"mood"\s*:\s*"([a-z]+)"/.exec(this.buf);
      if (m && (MOODS as readonly string[]).includes(m[1]!)) this.mood = m[1] as Mood;
    }
    if (this.ends === null) {
      const m = /"ends_audience"\s*:\s*(true|false)/.exec(this.buf);
      if (m) this.ends = m[1] === 'true';
    }
    if (this.start < 0) {
      const m = /"reply"\s*:\s*"/.exec(this.buf);
      if (m) {
        this.start = m.index + m[0].length;
        this.pos = this.start;
      }
    }
    if (this.start >= 0 && !this.complete) this.decode();
  }

  get started(): boolean {
    return this.start >= 0;
  }

  private decode(): void {
    while (this.pos < this.buf.length) {
      const ch = this.buf[this.pos]!;
      if (ch === '\\') {
        if (this.pos + 1 >= this.buf.length) return;
        const next = this.buf[this.pos + 1]!;
        if (next === 'u') {
          if (this.pos + 6 > this.buf.length) return;
          const code = parseInt(this.buf.slice(this.pos + 2, this.pos + 6), 16);
          if (!Number.isNaN(code)) this.reply += String.fromCharCode(code);
          this.pos += 6;
          continue;
        }
        this.reply += ESCAPES[next] ?? next;
        this.pos += 2;
        continue;
      }
      if (ch === '"') {
        this.complete = true;
        this.pos += 1;
        return;
      }
      this.reply += ch;
      this.pos += 1;
    }
  }
}
