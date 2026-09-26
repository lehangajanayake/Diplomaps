// Vercel Function: POST /api/flavour. The logic lives in server/handlers/flavour.ts.
import { handleFlavour } from '../server/handlers/flavour.js';

export const config = { maxDuration: 60 };

export function POST(request: Request): Promise<Response> {
  return handleFlavour(request);
}
