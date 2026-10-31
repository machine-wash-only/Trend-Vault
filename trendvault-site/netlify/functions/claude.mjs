// TrendVault → Claude proxy.
//
// The browser never sees the Anthropic API key. It sends its request here
// with the shared passcode; this function checks the passcode, adds the key
// (stored as a Netlify environment variable), and forwards the request to
// Anthropic.
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   ANTHROPIC_API_KEY  required — your Anthropic API key
//   APP_PASSCODE       required — the shared passcode people type into the app
//   CLAUDE_MODEL       optional — defaults to claude-sonnet-5

const DEFAULT_MODEL = 'claude-sonnet-5';
const MAX_TOKENS_CAP = 1500; // stops anyone with the passcode from running huge requests

function env(name) {
  // Netlify.env is the modern accessor; process.env is the fallback.
  try {
    if (typeof Netlify !== 'undefined' && Netlify.env) {
      const v = Netlify.env.get(name);
      if (v) return v;
    }
  } catch (_) {}
  return process.env[name];
}

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed' } });
  }

  const passcode = env('APP_PASSCODE');
  const apiKey = env('ANTHROPIC_API_KEY');
  if (!passcode || !apiKey) {
    return json(500, {
      error: { message: 'Server not set up yet: ANTHROPIC_API_KEY and APP_PASSCODE must both be set in Netlify, then redeploy.' },
    });
  }

  if ((req.headers.get('x-app-passcode') || '') !== passcode) {
    return json(401, { error: { type: 'bad_passcode', message: 'Wrong passcode.' } });
  }

  let body;
  try {
    body = await req.json();
  } catch (_) {
    return json(400, { error: { message: 'Request body was not valid JSON.' } });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return json(400, { error: { message: 'Request is missing messages.' } });
  }

  // Only messages and max_tokens are taken from the browser. The model is
  // fixed here, so it can be changed in Netlify without touching the app.
  const payload = {
    model: env('CLAUDE_MODEL') || DEFAULT_MODEL,
    max_tokens: Math.min(Number(body.max_tokens) || 600, MAX_TOKENS_CAP),
    messages: body.messages,
  };

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return json(502, { error: { message: 'Could not reach Anthropic: ' + (err && err.message ? err.message : err) } });
  }
};

export const config = { path: '/api/claude' };
