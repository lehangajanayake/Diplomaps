/** Maps /api/* paths to handlers. Used by the Vite dev/preview middleware; Vercel uses /api/*.ts directly. */
import { handleAudience } from './handlers/audience.js';
import { handleEnding } from './handlers/ending.js';
import { handleExtract } from './handlers/extract.js';
import { handleFlavour } from './handlers/flavour.js';
import { handleHealth } from './handlers/health.js';
import { json } from './http.js';

const ROUTES: Record<string, (req: Request) => Promise<Response>> = {
  '/api/audience': handleAudience,
  '/api/extract': handleExtract,
  '/api/flavour': handleFlavour,
  '/api/ending': handleEnding,
  '/api/health': handleHealth,
};

export async function handleApi(req: Request): Promise<Response> {
  const path = new URL(req.url).pathname.replace(/\/+$/, '');
  const handler = ROUTES[path];
  if (!handler) return json({ error: 'not_found' }, 404);
  return handler(req);
}
