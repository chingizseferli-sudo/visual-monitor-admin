import { requireAdmin } from "../_shared/auth.ts";
import { assertSafeUrl, safeFetch } from "../_shared/url_safety.ts";

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

type ArticleCandidate = {
  url: string;
  title: string;
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const MAX_RESPONSE_BYTES = 1_500_000;
const MIN_REPAIR_ARTICLE_COUNT = 2;

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

function unwrapCdata(value: string | null | undefined) {
  return String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeTitle(value: string | null | undefined) {
  return decodeHtmlEntities(unwrapCdata(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function isUsefulTitle(title: string) {
  const cleaned = title.trim();
  if (cleaned.length < 12) return false;
  if (/^(daha ətraflı|ətraflı|oxu|more|read more|details|читать|подробнее)$/i.test(cleaned)) {
    return false;
  }
  if (/^(ana səhifə|home|menu|login|search|category|tag)$/i.test(cleaned)) return false;
  return true;
}

function uniqueCandidates(candidates: ArticleCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (!candidate.url || seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
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

async function fetchText(rawUrl: string, timeoutMs = 12000) {
  const url = await assertSafeUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await safeFetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml,text/xml,application/rss+xml,*/*;q=0.8",
        "Accept-Language": "az-AZ,az;q=0.9,en-US;q=0.8",
      },
    });
    const text = await readLimitedText(response, MAX_RESPONSE_BYTES);
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
  return unique(links.map((link) => absolutize(unwrapCdata(link), baseUrl))).filter(
    (link) => /^https?:\/\//i.test(link),
  );
}

function extractXmlArticleCandidates(xml: string, baseUrl: string, siteHost: string) {
  const blocks = Array.from(xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)).map((m) => m[0]);
  const candidates = blocks
    .map((block) => {
      const title = normalizeTitle(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
      const hrefLink = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
      const textLink = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1];
      const permalink = block.match(/<guid[^>]+isPermaLink=["']true["'][^>]*>([\s\S]*?)<\/guid>/i)?.[1];
      const url = absolutize(unwrapCdata(hrefLink || textLink || permalink), baseUrl);
      return { url, title };
    })
    .filter((candidate) => isUsefulTitle(candidate.title) && isLikelyArticleLink(candidate.url, siteHost));

  return uniqueCandidates(candidates);
}


function extractHtmlArticleCandidates(html: string, baseUrl: string, siteHost: string) {
  const candidates = Array.from(html.matchAll(/<a\b([^>]+)href=["']([^"'#]+)["']([^>]*)>([\s\S]*?)<\/a>/gi))
    .map((m) => {
      const attrs = `${m[1]} ${m[3]}`;
      const attrTitle = attrs.match(/(?:title|aria-label)=["']([^"']+)["']/i)?.[1];
      const title = normalizeTitle(attrTitle || m[4]);
      const url = absolutize(m[2].trim(), baseUrl);
      return { url, title };
    })
    .filter((candidate) => isUsefulTitle(candidate.title) && isLikelyArticleLink(candidate.url, siteHost));

  return uniqueCandidates(candidates);
}

function extractPageTitle(html: string) {
  return normalizeTitle(
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
  );
}

async function validateArticleCandidates(
  rawCandidates: ArticleCandidate[],
  siteHost: string,
  limit = 8,
) {
  const candidates: ArticleCandidate[] = [];
  const uniqueInput = uniqueCandidates(
    rawCandidates.filter((candidate) =>
      isUsefulTitle(candidate.title) && isLikelyArticleLink(candidate.url, siteHost)
    ),
  );

  for (const candidate of uniqueInput.slice(0, limit)) {
    try {
      const res = await fetchText(candidate.url, 8000);
      const isHtml = /html/i.test(res.contentType) || /<html|<title|<meta/i.test(res.text);
      if (!res.ok || !isHtml) continue;

      const pageTitle = extractPageTitle(res.text);
      const title = isUsefulTitle(pageTitle) ? pageTitle : candidate.title;
      if (isUsefulTitle(title)) candidates.push({ url: res.url || candidate.url, title });
    } catch (_) {
      // Try next link.
    }
  }

  return uniqueCandidates(candidates);
}

async function validateArticleLinks(links: string[], siteHost: string, limit = 8) {
  return validateArticleCandidates(
    unique(links)
      .filter((item) => isLikelyArticleLink(item, siteHost))
      .map((url) => ({ url, title: url })),
    siteHost,
    limit,
  );
}

function hasEnoughVerifiedArticles(candidates: ArticleCandidate[]) {
  return candidates.length >= MIN_REPAIR_ARTICLE_COUNT;
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
    status: "inactive",
    last_error: reason,
    last_result: "repair_failed",
    last_checked_at: new Date().toISOString(),
    last_success_at: null,
    discovery_status: "needs_manual_selector",
    consecutive_fail_count: 1,
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
      const feedCandidates = extractXmlArticleCandidates(res.text, res.url, siteHost);
      const candidates = await validateArticleCandidates(feedCandidates, siteHost, 8);
      const links = candidates.map((candidate) => candidate.url);
      if (hasEnoughVerifiedArticles(candidates)) {
        return {
          ok: true,
          method: "rss",
          reason: `RSS verified: ${candidates.length} readable article pages`,
          candidateCount: candidates.length,
          finalUrl: res.url,
          rssUrl,
          sampleLinks: links.slice(0, 5),
          update: buildSuccessUpdate(source, "rss", {
            rssUrl,
            notes: `Auto repair OK: RSS verified ${candidates.length} readable article pages`,
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
    const candidates = await validateArticleLinks(links, siteHost, 8);
    if (hasEnoughVerifiedArticles(candidates)) {
      return {
        ok: true,
        method: "sitemap",
        reason: `Sitemap verified: ${candidates.length} readable article pages`,
        candidateCount: candidates.length,
        finalUrl: res.url,
        sampleLinks: candidates.map((candidate) => candidate.url).slice(0, 5),
        update: buildSuccessUpdate(source, "sitemap", {
          notes: `Auto repair OK: sitemap verified ${candidates.length} readable article pages`,
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
    const extractedCandidates = extractHtmlArticleCandidates(res.text, res.url, siteHost);
    const candidates = await validateArticleCandidates(extractedCandidates, siteHost, 8);
    const links = candidates.map((candidate) => candidate.url);
    if (hasEnoughVerifiedArticles(candidates)) {
      const hasArticle = /<article\b/i.test(res.text);
      const hasNewsClass = /class=["'][^"']*(news|post|item|article|entry)/i.test(res.text);
      const method = hasArticle || hasNewsClass ? "selector" : "latest_page";
      return {
        ok: true,
        method,
        reason: `HTML verified: ${candidates.length} readable article pages`,
        candidateCount: candidates.length,
        finalUrl: res.url,
        sampleLinks: links.slice(0, 5),
        update: buildSuccessUpdate(source, method, {
          selector: method === "selector" ? "article, .news-item, .post, .entry, .item" : source.selector ?? null,
          articlePattern:
            method === "selector"
              ? "article a[href], .news-item a[href], .post a[href], .entry a[href], .item a[href], h2 a[href], h3 a[href]"
              : source.article_pattern ?? null,
          notes: `Auto repair OK: HTML verified ${candidates.length} readable article pages`,
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

  const reason = "RSS, sitemap and HTML did not return enough verified readable article pages";
  return {
    ok: false,
    method: "failed",
    reason,
    candidateCount: 0,
    sampleLinks: [],
    update: buildFailUpdate(source, reason),
  };
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req, json);
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json().catch(() => ({}));
    const source = body.source as SourceInput | undefined;

    if (!source?.id) {
      return json({ error: "source with id required" }, 400);
    }

    const result = await repairSource(source);
    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
