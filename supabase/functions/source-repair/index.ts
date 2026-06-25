const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SourceInput = {
  id: string;
  name?: string | null;
  base_url?: string | null;
  latest_url?: string | null;
  rss_url?: string | null;
  selector?: string | null;
  article_pattern?: string | null;
};

type RepairResult = {
  ok: boolean;
  method: string;
  reason: string;
  candidateCount: number;
  finalUrl?: string;
  rssUrl?: string | null;
  sampleLinks: string[];
  update: Record<string, unknown>;
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

function normalizeUrl(raw: string | null | undefined) {
  const value = String(raw || "").trim();
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function hostname(raw: string | null | undefined) {
  const url = normalizeUrl(raw);
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function fetchText(rawUrl: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(rawUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml,text/xml,application/rss+xml,*/*;q=0.8",
        "Accept-Language": "az-AZ,az;q=0.9,en-US;q=0.8",
      },
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      url: response.url || rawUrl,
      contentType: response.headers.get("content-type") || "",
      text,
    };
  } finally {
    clearTimeout(timer);
  }
}

function absolutize(link: string, baseUrl: string) {
  try {
    return new URL(link, baseUrl).toString();
  } catch {
    return "";
  }
}

function extractXmlLinks(xml: string, baseUrl: string) {
  const links = [
    ...Array.from(xml.matchAll(/<link[^>]*>([^<]+)<\/link>/gi)).map((m) => m[1]),
    ...Array.from(xml.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)).map((m) => m[1]),
    ...Array.from(xml.matchAll(/<loc[^>]*>([^<]+)<\/loc>/gi)).map((m) => m[1]),
  ];
  return unique(links.map((link) => absolutize(link.trim(), baseUrl))).filter(
    (link) => /^https?:\/\//i.test(link),
  );
}

function extractHtmlLinks(html: string, baseUrl: string) {
  const links = Array.from(html.matchAll(/<a\b[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((m) => absolutize(m[1].trim(), baseUrl))
    .filter((link) => /^https?:\/\//i.test(link));
  return unique(links);
}

function isLikelyArticleLink(link: string, siteHost: string) {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return false;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (siteHost && host !== siteHost && !host.endsWith(`.${siteHost}`)) return false;

  const path = decodeURIComponent(url.pathname.toLowerCase());
  if (path.length < 8) return false;
  if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|rar|mp4|mp3)$/i.test(path)) return false;
  if (/(login|register|contact|about|privacy|category|tag|author|search)/i.test(path)) return false;

  return (
    /\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/.test(path) ||
    /\d{6,}/.test(path) ||
    /(news|xeber|x[eə]b[eə]r|post|article|story|read|gundem|media)/i.test(path) ||
    path.split("/").filter(Boolean).length >= 2
  );
}

function buildSuccessUpdate(source: SourceInput, method: string, options: { rssUrl?: string | null; selector?: string | null; articlePattern?: string | null; notes: string }) {
  const now = new Date().toISOString();
  return {
    name: hostname(source.base_url || source.latest_url) || source.name || "source",
    status: "active",
    monitor_method: method,
    rss_url: options.rssUrl ?? source.rss_url ?? null,
    selector: options.selector ?? source.selector ?? null,
    article_pattern: options.articlePattern ?? source.article_pattern ?? null,
    discovery_status: "accepted",
    consecutive_fail_count: 0,
    last_error: null,
    last_result: "repair_ok",
    last_checked_at: now,
    last_success_at: now,
    notes: options.notes,
  };
}

function buildFailUpdate(source: SourceInput, reason: string) {
  return {
    name: hostname(source.base_url || source.latest_url) || source.name || "source",
    last_error: reason,
    last_result: "repair_failed",
    last_checked_at: new Date().toISOString(),
    discovery_status: "needs_manual_selector",
    notes: `Auto repair failed: ${reason}`,
  };
}

async function testRss(source: SourceInput, baseUrl: string, siteHost: string): Promise<RepairResult | null> {
  const base = new URL(baseUrl);
  const candidates = unique([
    normalizeUrl(source.rss_url),
    new URL("/rss", base).toString(),
    new URL("/rss.xml", base).toString(),
    new URL("/feed", base).toString(),
    new URL("/feed/", base).toString(),
    new URL("/feed.xml", base).toString(),
  ].filter(Boolean) as string[]);

  for (const rssUrl of candidates) {
    try {
      const res = await fetchText(rssUrl, 10000);
      const isXml = /xml|rss|atom/i.test(res.contentType) || /<(rss|feed)\b/i.test(res.text);
      if (!res.ok || !isXml) continue;
      const links = extractXmlLinks(res.text, res.url).filter((link) => isLikelyArticleLink(link, siteHost));
      if (links.length > 0) {
        return {
          ok: true,
          method: "rss",
          reason: `RSS works: ${links.length} candidate links`,
          candidateCount: links.length,
          finalUrl: res.url,
          rssUrl,
          sampleLinks: links.slice(0, 5),
          update: buildSuccessUpdate(source, "rss", {
            rssUrl,
            notes: `Auto repair OK: RSS found ${links.length} candidate links`,
          }),
        };
      }
    } catch (_) {
      // Try next candidate.
    }
  }

  return null;
}

async function testSitemap(source: SourceInput, baseUrl: string, siteHost: string): Promise<RepairResult | null> {
  try {
    const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
    const res = await fetchText(sitemapUrl, 10000);
    if (!res.ok) return null;
    const links = extractXmlLinks(res.text, res.url).filter((link) => isLikelyArticleLink(link, siteHost));
    if (links.length > 0) {
      return {
        ok: true,
        method: "sitemap",
        reason: `Sitemap works: ${links.length} candidate links`,
        candidateCount: links.length,
        finalUrl: res.url,
        sampleLinks: links.slice(0, 5),
        update: buildSuccessUpdate(source, "sitemap", {
          notes: `Auto repair OK: sitemap found ${links.length} candidate links`,
        }),
      };
    }
  } catch (_) {
    return null;
  }

  return null;
}

async function testHtml(source: SourceInput, baseUrl: string, siteHost: string): Promise<RepairResult | null> {
  try {
    const res = await fetchText(baseUrl, 12000);
    if (!res.ok) return null;
    const isHtml = /html/i.test(res.contentType) || /<html|<a\b/i.test(res.text);
    if (!isHtml) return null;
    const links = extractHtmlLinks(res.text, res.url).filter((link) => isLikelyArticleLink(link, siteHost));
    if (links.length > 0) {
      const hasArticle = /<article\b/i.test(res.text);
      const hasNewsClass = /class=["'][^"']*(news|post|item|article|entry)/i.test(res.text);
      const method = hasArticle || hasNewsClass ? "selector" : "latest_page";
      return {
        ok: true,
        method,
        reason: `HTML works: ${links.length} candidate links`,
        candidateCount: links.length,
        finalUrl: res.url,
        sampleLinks: links.slice(0, 5),
        update: buildSuccessUpdate(source, method, {
          selector: method === "selector" ? "article, .news-item, .post, .entry, .item" : source.selector ?? null,
          articlePattern:
            method === "selector"
              ? "article a[href], .news-item a[href], .post a[href], .entry a[href], .item a[href], h2 a[href], h3 a[href]"
              : source.article_pattern ?? null,
          notes: `Auto repair OK: HTML found ${links.length} candidate links`,
        }),
      };
    }
  } catch (_) {
    return null;
  }

  return null;
}

async function repairSource(source: SourceInput): Promise<RepairResult> {
  const baseUrl = normalizeUrl(source.latest_url) || normalizeUrl(source.base_url);
  if (!baseUrl) {
    const reason = "valid base_url/latest_url not found";
    return {
      ok: false,
      method: "failed",
      reason,
      candidateCount: 0,
      sampleLinks: [],
      update: buildFailUpdate(source, reason),
    };
  }

  const siteHost = hostname(baseUrl);
  const tests = [
    () => testRss(source, baseUrl, siteHost),
    () => testSitemap(source, baseUrl, siteHost),
    () => testHtml(source, baseUrl, siteHost),
  ];

  for (const test of tests) {
    const result = await test();
    if (result?.ok) return result;
  }

  const reason = "RSS, sitemap and HTML did not return article links";
  return {
    ok: false,
    method: "failed",
    reason,
    candidateCount: 0,
    sampleLinks: [],
    update: buildFailUpdate(source, reason),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const source = body.source as SourceInput | undefined;

    if (!source?.id) {
      return Response.json(
        { error: "source with id required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await repairSource(source);
    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders },
    );
  }
});
