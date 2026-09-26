// Vercel Function: POST /api/extract. The logic lives in server/handlers/extract.ts.
import { handleExtract } from '../server/handlers/extract.js';

export const config = { maxDuration: 60 };

export function POST(request: Request): Promise<Response> {
  return handleExtract(request);
}
