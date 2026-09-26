// Vercel Function: POST /api/action. The logic lives in server/handlers/action.ts.
import { handleAction } from '../server/handlers/action.js';

export const config = { maxDuration: 60 };

export function POST(request: Request): Promise<Response> {
  return handleAction(request);
}
