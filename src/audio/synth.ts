/**
 * Quiet procedural stand-ins for the optional audio files, so the room is never completely silent.
 * Any real file dropped into /public/audio replaces its stand-in automatically.
 */
export type SoundName = 'ambient' | 'paper' | 'quill' | 'bell' | 'drums' | 'doors' | 'coins';

function noise(len: number, rate: number, brown = false): Float32Array {
  const out = new Float32Array(len);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      out[i] = last * 3.5;
    } else out[i] = white;
  }
  void rate;
  return out;
}

function envelope(i: number, rate: number, attack: number, decay: number): number {
  const t = i / rate;
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / decay);
}

/** Simple one-pole filters, enough to shape noise into rustles and scratches. */
function lowpass(data: Float32Array, rate: number, cutoff: number): Float32Array {
  const out = new Float32Array(data.length);
  const a = Math.exp((-2 * Math.PI * cutoff) / rate);
  let y = 0;
  for (let i = 0; i < data.length; i++) {
    y = (1 - a) * data[i]! + a * y;
    out[i] = y;
  }
  return out;
}

function highpass(data: Float32Array, rate: number, cutoff: number): Float32Array {
  const low = lowpass(data, rate, cutoff);
  return data.map((v, i) => v - low[i]!);
}

export function synthesize(ctx: BaseAudioContext, name: SoundName): AudioBuffer {
  const rate = ctx.sampleRate;
  const make = (seconds: number, fill: (data: Float32Array) => void) => {
    const buffer = ctx.createBuffer(1, Math.floor(seconds * rate), rate);
    fill(buffer.getChannelData(0));
    return buffer;
  };
  switch (name) {
    case 'bell':
      return make(3.2, (d) => {
        const partials: [number, number, number][] = [
          [1, 1, 1.4],
          [2.76, 0.5, 0.9],
          [5.4, 0.28, 0.5],
          [8.93, 0.12, 0.3],
          [0.5, 0.3, 2.2],
        ];
        const f = 587;
        for (let i = 0; i < d.length; i++) {
          const t = i / rate;
          let v = 0;
          for (const [m, amp, dec] of partials) v += amp * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t / dec);
          d[i] = v * 0.22 * Math.min(1, t / 0.004);
        }
      });
    case 'drums':
      return make(1.1, (d) => {
        for (const start of [0, 0.28]) {
          const s0 = Math.floor(start * rate);
          for (let i = 0; i < 0.45 * rate && s0 + i < d.length; i++) {
            const t = i / rate;
            const freq = 58 + 40 * Math.exp(-t / 0.05);
            d[s0 + i]! += Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / 0.13) * (start ? 0.55 : 0.8);
          }
        }
      });
    case 'paper':
      return make(0.5, (d) => {
        const n = lowpass(highpass(noise(d.length, rate), rate, 900), rate, 5000);
        for (let i = 0; i < d.length; i++) {
          const t = i / rate;
          const wobble = 0.6 + 0.4 * Math.sin(2 * Math.PI * 23 * t) * Math.sin(2 * Math.PI * 7 * t);
          d[i] = n[i]! * envelope(i, rate, 0.04, 0.14) * wobble * 0.5;
        }
      });
    case 'quill':
      return make(0.7, (d) => {
        const n = highpass(noise(d.length, rate), rate, 2500);
        const strokes = [0.02, 0.14, 0.22, 0.37, 0.45, 0.58];
        for (const s of strokes) {
          const s0 = Math.floor(s * rate);
          const len = Math.floor((0.05 + Math.random() * 0.05) * rate);
          for (let i = 0; i < len && s0 + i < d.length; i++) d[s0 + i] = n[s0 + i]! * Math.sin((Math.PI * i) / len) * 0.18;
        }
      });
    case 'doors':
      return make(1.4, (d) => {
        const n = lowpass(noise(d.length, rate, true), rate, 220);
        for (let i = 0; i < d.length; i++) {
          const t = i / rate;
          const creak = t < 0.6 ? Math.sin(2 * Math.PI * (140 + 60 * Math.sin(t * 9)) * t) * 0.05 * Math.sin((Math.PI * t) / 0.6) : 0;
          const thud = t > 0.62 ? Math.sin(2 * Math.PI * 48 * (t - 0.62)) * Math.exp(-(t - 0.62) / 0.12) * 0.7 : 0;
          d[i] = creak + thud + n[i]! * 0.25 * (t > 0.62 ? Math.exp(-(t - 0.62) / 0.2) : 0);
        }
      });
    case 'coins':
      return make(0.9, (d) => {
        const hits = [0, 0.09, 0.17, 0.3, 0.41];
        for (const h of hits) {
          const s0 = Math.floor(h * rate);
          const f = 2600 + Math.random() * 1800;
          for (let i = 0; i < 0.4 * rate && s0 + i < d.length; i++) {
            const t = i / rate;
            d[s0 + i]! += (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.5 * t)) * Math.exp(-t / 0.07) * 0.12;
          }
        }
      });
    case 'ambient':
    default:
      return make(30, (d) => {
        const room = lowpass(noise(d.length, rate, true), rate, 400);
        const gustPoints = new Float32Array(31);
        gustPoints[0] = 0.5 + Math.random() * 0.5;
        for (let i = 1; i < gustPoints.length - 1; i++) gustPoints[i] = 0.5 + Math.random() * 0.5;
        gustPoints[gustPoints.length - 1] = gustPoints[0]!;
        for (let i = 0; i < d.length; i++) {
          const t = i / rate;
          const position = Math.min(29.999, t);
          const segment = Math.floor(position);
          const progress = position - segment;
          const smoothProgress = progress * progress * (3 - 2 * progress);
          const gust = gustPoints[segment]! + (gustPoints[segment + 1]! - gustPoints[segment]!) * smoothProgress;
          d[i] = room[i]! * gust * 0.05;
        }
        // Fade the loop seam.
        const fade = Math.floor(0.05 * rate);
        for (let i = 0; i < fade; i++) {
          d[i]! *= i / fade;
          d[d.length - 1 - i]! *= i / fade;
        }
      });
  }
}
