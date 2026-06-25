const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = String(body.url || "").trim();

    if (!rawUrl) return json({ error: "url required" }, 400);

    const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    if (!["http:", "https:"].includes(url.protocol)) {
      return json({ error: "only http/https allowed" }, 400);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let upstream: Response;

    try {
      upstream = await fetch(url.toString(), {
        redirect: "follow",
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
    const text = await upstream.text();

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
