/** GET /api/health: whether the ravens can fly (an API key is configured). Never reveals the key. */
import { json } from '../http.js';
import { MODELS, aiConfigured } from '../openai.js';

export async function handleHealth(_req: Request): Promise<Response> {
  return json({ ok: true, ai: aiConfigured(), models: { fast: MODELS.fast, rich: MODELS.rich } });
}
