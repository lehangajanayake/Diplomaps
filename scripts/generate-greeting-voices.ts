import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from 'vite';
import { greetingText, type GreetingTone } from '../src/engine/courtesy.js';
import { NATION_IDS, type NationId } from '../src/engine/types.js';

const root = process.cwd();
const env = loadEnv('development', root, '');
const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || env.ELEVENLABS_API_KEY?.trim();
const model = process.env.ELEVENLABS_MODEL?.trim() || env.ELEVENLABS_MODEL?.trim() || 'eleven_multilingual_v2';
const outputDir = path.join(root, 'public', 'audio', 'greetings');
const voiceEnv: Record<NationId, string> = {
  varrow: 'ELEVENLABS_VOICE_VARROW',
  kelm: 'ELEVENLABS_VOICE_KELM',
  sael: 'ELEVENLABS_VOICE_SAEL',
  tarn: 'ELEVENLABS_VOICE_TARN',
  ostrin: 'ELEVENLABS_VOICE_OSTRIN',
};
const speed: Record<NationId, number> = { varrow: 0.9, kelm: 1, sael: 1.08, tarn: 0.82, ostrin: 0.92 };
const tones: GreetingTone[] = ['warm', 'neutral', 'cold', 'war'];

if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not configured');

await mkdir(outputDir, { recursive: true });
for (const nation of NATION_IDS) {
  const voiceId = process.env[voiceEnv[nation]]?.trim() || env[voiceEnv[nation]]?.trim() || process.env.ELEVENLABS_VOICE_ID?.trim() || env.ELEVENLABS_VOICE_ID?.trim();
  if (!voiceId) throw new Error(`${voiceEnv[nation]} or ELEVENLABS_VOICE_ID is not configured`);
  for (const tone of tones) {
    const outputPath = path.join(outputDir, `${nation}-${tone}.mp3`);
    const text = greetingText(nation, tone);
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { Accept: 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: { stability: 0.52, similarity_boost: 0.78, style: 0.25, use_speaker_boost: true, speed: speed[nation] },
      }),
    });
    if (!response.ok) throw new Error(`${nation}-${tone}: ElevenLabs HTTP ${response.status} ${response.statusText}`);
    await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
    console.log(`Generated ${path.relative(root, outputPath)}`);
  }
}
