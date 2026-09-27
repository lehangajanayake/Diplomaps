/**
 * Serves /api/* from the same handlers Vercel uses, inside `npm run dev` and `npm run preview`.
 * Handlers are loaded through Vite's SSR loader, so editing a prompt takes effect on the next request.
 * .env / .env.local are re-read on every request: add a key and it works without a restart.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer, loadEnv, type Connect, type Plugin, type ViteDevServer } from 'vite';

type RouterModule = { handleApi: (req: Request) => Promise<Response> };

const ENV_KEYS = [
  'OPENAI_API_KEY',
  'MODEL_FAST',
  'MODEL_RICH',
  'AI_REASONING',
  'RATE_LIMIT_PER_MINUTE',
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_MODEL',
] as const;
const fromShell = new Set(ENV_KEYS.filter((k) => process.env[k] !== undefined));

function refreshEnv(mode: string, root: string): void {
  const env = loadEnv(mode, root, '');
  for (const key of ENV_KEYS) {
    if (fromShell.has(key)) continue;
    if (env[key]) process.env[key] = env[key];
    else delete process.env[key];
  }
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value !== undefined) headers.set(key, value);
  }
  if (!headers.has('x-forwarded-for') && req.socket.remoteAddress) headers.set('x-forwarded-for', req.socket.remoteAddress);
  const method = req.method ?? 'GET';
  let body: Uint8Array | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += (chunk as Buffer).length;
      if (size > 200_000) throw new Error('request body too large');
      chunks.push(chunk as Buffer);
    }
    body = new Uint8Array(Buffer.concat(chunks));
  }
  return new Request(url, { method, headers, body });
}

async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) {
    res.end();
    return;
  }
  res.flushHeaders();
  const reader = response.body.getReader();
  let closed = false;
  res.on('close', () => {
    closed = true;
    void reader.cancel().catch(() => {});
  });
  while (!closed) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

function middleware(load: () => Promise<RouterModule>, refresh: () => void): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (!(req.url ?? '').startsWith('/api/')) {
      next();
      return;
    }
    void (async () => {
      try {
        refresh();
        const router = await load();
        const response = await router.handleApi(await toWebRequest(req));
        await sendWebResponse(res, response);
      } catch (err) {
        console.error('[api] handler crashed:', err instanceof Error ? err.message : String(err));
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
        }
        res.end(JSON.stringify({ error: 'server_error' }));
      }
    })();
  };
}

export function apiPlugin(): Plugin {
  let root = process.cwd();
  let mode = 'development';
  return {
    name: 'diplomaps-api',
    configResolved(config) {
      root = config.root;
      mode = config.mode;
    },
    configureServer(server) {
      server.middlewares.use(
        middleware(
          () => server.ssrLoadModule('/server/router.ts') as Promise<RouterModule>,
          () => refreshEnv(mode, root),
        ),
      );
    },
    configurePreviewServer(server) {
      let loader: ViteDevServer | null = null;
      const load = async () => {
        loader ??= await createServer({ root, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false } });
        return loader.ssrLoadModule('/server/router.ts') as Promise<RouterModule>;
      };
      server.middlewares.use(middleware(load, () => refreshEnv('production', root)));
    },
  };
}
