/**
 * Vercel serverless proxy: forwards /api/* to the Express backend.
 * vercel.json rewrites /api/:path* to /api/proxy?__path=:path*, because outside
 * Next.js a [...path] file only matches a single path segment.
 * Set API_PROXY_URL in the Vercel project env, e.g. https://content-flow-api.vercel.app
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Forward the raw request body untouched (JSON, multipart uploads, Stripe webhooks).
export const config = { api: { bodyParser: false } };

async function readRawBody(req: VercelRequest): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of req) {
    const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk);
    chunks.push(bytes);
    total += bytes.length;
  }
  const out = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
]);

export function buildTargetUrl(
  backend: string,
  rawPath: string | string[] | undefined,
  search: URLSearchParams,
): string {
  const pathPart = (Array.isArray(rawPath) ? rawPath.join('/') : (rawPath ?? '')).replace(/^\/+/, '');
  const params = new URLSearchParams(search);
  params.delete('__path');
  const query = params.toString();
  return `${backend}/api/${pathPart}${query ? `?${query}` : ''}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const backend = process.env.API_PROXY_URL?.replace(/\/$/, '');

  if (!backend) {
    res.status(503).json({
      success: false,
      error: {
        code: 'API_NOT_CONFIGURED',
        message:
          'API_PROXY_URL is not set on Vercel. Add your Railway/VPS backend URL, e.g. https://your-app.up.railway.app',
      },
    });
    return;
  }

  const host = req.headers.host ?? 'localhost';
  const incoming = new URL(req.url ?? '/', `https://${host}`);
  const targetUrl = buildTargetUrl(backend, req.query.__path, incoming.searchParams);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || HOP_BY_HOP.has(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  const method = req.method ?? 'GET';
  const init: RequestInit = { method, headers, redirect: 'manual' };

  if (method !== 'GET' && method !== 'HEAD') {
    const body = await readRawBody(req);
    if (body.length > 0) init.body = body;
  }

  try {
    const upstream = await fetch(targetUrl, init);
    res.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      // set-cookie is copied separately below; fetch joins multiple cookies into one value.
      // content-encoding/length are dropped because fetch already decoded the body.
      if (HOP_BY_HOP.has(lower) || lower === 'set-cookie' || lower === 'content-encoding' || lower === 'content-length') return;
      res.setHeader(key, value);
    });
    const cookies = upstream.headers.getSetCookie?.() ?? [];
    if (cookies.length > 0) res.setHeader('set-cookie', cookies);

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream request failed';
    res.status(502).json({
      success: false,
      error: {
        code: 'BAD_GATEWAY',
        message: `Could not reach backend at ${backend}. ${message}`,
      },
    });
  }
}
