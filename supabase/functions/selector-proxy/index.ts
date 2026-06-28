import { requireAuthenticated } from "../_shared/auth.ts";
import { assertSafeUrl, safeFetch } from "../_shared/url_safety.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_RESPONSE_BYTES = 1_500_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeHtml(html: string, finalUrl: string) {
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');

  const base = `<base href="${finalUrl}">`;

  if (/<head[^>]*>/i.test(cleaned)) {
    cleaned = cleaned.replace(/<head[^>]*>/i, (match) => `${match}${base}`);
  } else {
    cleaned = `${base}${cleaned}`;
  }

  return cleaned;
}

async function readLimitedText(response: Response, limitBytes: number) {
  if (!response.body) return await response.text();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    received += value.byteLength;
    if (received > limitBytes) {
      try {
        await reader.cancel();
      } catch {
        // Best effort cancellation only.
      }
      throw new Error(`Response too large. Maximum allowed size is ${limitBytes} bytes.`);
    }

    chunks.push(value);
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8").decode(merged);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAuthenticated(req, json);
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = String(body.url || "").trim();

    if (!rawUrl) return json({ error: "url required" }, 400);

    const url = await assertSafeUrl(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let upstream: Response;

    try {
      upstream = await safeFetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "az-AZ,az;q=0.9,en-US;q=0.8",
          Referer: "https://www.google.com/",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    const contentType = upstream.headers.get("content-type") || "";
    const text = await readLimitedText(upstream, MAX_RESPONSE_BYTES);

    if (!contentType.includes("text/html") && !text.includes("<html")) {
      return json({
        error: "HTML response not found. Visual selector needs a normal page, not RSS/sitemap/XML.",
        status: upstream.status,
        contentType,
        finalUrl: upstream.url || url.toString(),
      });
    }

    return json({
      html: sanitizeHtml(text, upstream.url || url.toString()),
      finalUrl: upstream.url || url.toString(),
      status: upstream.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500);
  }
});
