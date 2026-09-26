// Vercel Function: POST /api/ending. The logic lives in server/handlers/ending.ts.
import { handleEnding } from '../server/handlers/ending.js';

export const config = { maxDuration: 60 };

export function POST(request: Request): Promise<Response> {
  return handleEnding(request);
}
