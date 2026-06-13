/**
 * Vercel serverless proxy — forwards /api/* to the Express backend (Railway/VPS).
 * Set API_PROXY_URL in Vercel project env, e.g. https://your-app.up.railway.app
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const segments = req.query.path;
  const pathPart = Array.isArray(segments) ? segments.join('/') : (segments ?? '');

  const host = req.headers.host ?? 'localhost';
  const incoming = new URL(req.url ?? '/', `https://${host}`);
  const targetUrl = `${backend}/api/${pathPart}${incoming.search}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || HOP_BY_HOP.has(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  const method = req.method ?? 'GET';
  const init: RequestInit = { method, headers, redirect: 'manual' };

  if (method !== 'GET' && method !== 'HEAD' && req.body) {
    const body =
      typeof req.body === 'string'
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body
          : JSON.stringify(req.body);
    init.body = body;
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
  }

  try {
    const upstream = await fetch(targetUrl, init);
    res.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

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
