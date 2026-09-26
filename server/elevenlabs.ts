import type { NationId } from '../src/engine/types.js';

const API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODEL = process.env.ELEVENLABS_MODEL?.trim() || 'eleven_multilingual_v2';

const VOICE_ENV: Record<NationId, string> = {
  varrow: 'ELEVENLABS_VOICE_VARROW',
  kelm: 'ELEVENLABS_VOICE_KELM',
  sael: 'ELEVENLABS_VOICE_SAEL',
  tarn: 'ELEVENLABS_VOICE_TARN',
  ostrin: 'ELEVENLABS_VOICE_OSTRIN',
};

const SPEED: Record<NationId, number> = {
  varrow: 0.9,
  kelm: 1.0,
  sael: 1.08,
  tarn: 0.82,
  ostrin: 0.92,
};

/** Generate a complete ruler reply. Returns base64 MP3 so the browser never sees the API key. */
export async function synthesizeRulerSpeech(nation: NationId, text: string): Promise<string | null> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env[VOICE_ENV[nation]]?.trim() || process.env.ELEVENLABS_VOICE_ID?.trim();
  if (!key) {
    console.error(`[elevenlabs] ${nation}: ELEVENLABS_API_KEY is not configured`);
    return null;
  }
  if (!voiceId) {
    console.error(`[elevenlabs] ${nation}: ${VOICE_ENV[nation]} or ELEVENLABS_VOICE_ID is not configured`);
    return null;
  }
  if (!text) {
    console.error(`[elevenlabs] ${nation}: received empty text`);
    return null;
  }

  try {
    const startedAt = Date.now();
    const response = await fetch(`${API_URL}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': key,
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: MODEL,
        voice_settings: {
          stability: 0.52,
          similarity_boost: 0.78,
          style: 0.25,
          use_speaker_boost: true,
          speed: SPEED[nation],
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500).replace(/\s+/g, ' ');
      console.error(`[elevenlabs] ${nation}: HTTP ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ''}`);
      return null;
    }
    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.length === 0) {
      console.error(`[elevenlabs] ${nation}: response contained no audio`);
      return null;
    }
    console.log(`[elevenlabs] ${nation}: generated ${audio.length} bytes in ${Date.now() - startedAt}ms`);
    return audio.toString('base64');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[elevenlabs] ${nation}: request failed - ${message.slice(0, 240)}`);
    return null;
  }
}
