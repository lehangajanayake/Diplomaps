// Vercel Function: GET /api/health. Reports whether an API key is configured (never the key itself).
import { handleHealth } from '../server/handlers/health.js';

export function GET(request: Request): Promise<Response> {
  return handleHealth(request);
}
