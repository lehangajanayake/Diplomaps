// Vercel Function: POST /api/audience. The logic lives in server/handlers/audience.ts.
import { handleAudience } from '../server/handlers/audience.js';

export const config = { maxDuration: 60 };

export function POST(request: Request): Promise<Response> {
  return handleAudience(request);
}
