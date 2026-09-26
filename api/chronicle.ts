// Vercel Function: POST /api/chronicle. The logic lives in server/handlers/chronicle.ts.
import { handleChronicle } from '../server/handlers/chronicle.js';

export const config = { maxDuration: 60 };

export function POST(request: Request): Promise<Response> {
  return handleChronicle(request);
}
