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
  sourceContext?: "rss" | "html" | "sitemap";
};

const SOURCE_REPAIR_VERSION = "1.5-site-signal-discovery";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const MAX_RESPONSE_BYTES = 1_500_000;
const MIN_REPAIR_ARTICLE_COUNT = 2;
const MAX_DISCOVERED_FEEDS = 12;
const MAX_DISCOVERED_SITEMAPS = 12;
const MAX_HTML_PAGES_TO_TEST = 14;
const ARTICLE_URL_PATTERNS = [
  "/news/",
  "/xeber/",
  "/xeberler/",
  "/xəbərlər/",
  "/az/news/",
  "/az/xeber/",
  "/az/xeberler/",
  "/az/xəbərlər/",
  "/post/",
  "/article/",
  "/articles/view/",
  "/read/",
  "/item/",
  "/posts/detail/",
  "/writers/detail/",
  "/single_news/",
  "/kheberler/",
  "/son-xeber/",
  "/sosial/",
  "/resmi-xeber/",
  "/hadise/",
  "/politic/",
  "/world/",
  "/economy/",
  "/education/",
  "/elm/",
  "/tehsil/",
  "/2024/",
  "/2025/",
  "/2026/",
];
const ARTICLE_URL_REGEX_PATTERNS = [/\/\d{4,}[-_][^/?#]+\.html$/, /\/news\/\d{3,}\/[^/?#]{8,}\/?$/, /\/xeber\/(?:[^/?#-]+[_-]){2,}[^/?#-]+-\d{3,}\/?$/, /\/xeber\/\d{3,}\/?$/];
const LANG_SLUG_ARTICLE_RE = /^\/(az|en|ru|tr)\/[a-z0-9%_-]{18,}\/?$/;
const CATEGORY_SLUG_ARTICLE_RE = /^\/[a-z0-9%_-]{3,}\/[a-z0-9%_-]{18,}\/?$/;
const ROOT_SLUG_ARTICLE_HOSTS = new Set([
  "7times.az",
  "busaat.az",
  "editor.az",
  "globalinfo.az",
  "muallim.edu.az",
  "ekosu.az",
  "aem.az",
  "ayna.az",
  "ulusal.az",
  "yenicag.az",
]);
const DOMAIN_DETAIL_ARTICLE_PATTERNS = new Map<string, RegExp[]>([
  ["azertag.az", [/\/xeber\/[^/?#]{8,}-\d{3,}\/?$/]],
  ["unikal.az", [/\/news\/\d{3,}\/[^/?#]{8,}\/?$/]],
  ["embawood.az", [/\/blog\/[^/?#]{8,}\/?$/]],
  ["deazmed.az", [/\/az\/melumat-ve-xeberler\/[^/?#]{8,}\/?$/]],
  ["bqu.edu.az", [/\/announcement_single\/\d+\/?$/]],
  ["airport.az", [/\/press-release\/[^/?#]{8,}\/?$/]],
]);
const BLOCKED_ROOT_SLUG_WORDS = new Set([
  "about",
  "haqqimizda",
  "elaqe",
  "contact",
  "privacy",
  "category",
  "kateqoriya",
  "tag",
  "archive",
  "arxiv",
  "search",
  "author",
  "login",
  "register",
  "profile",
  "rss",
  "feed",
]);
const COMMON_LATEST_PATHS = [
  "/news",
  "/xeberler",
  "/xeber",
  "/az/news",
  "/az/xeberler",
  "/az/xeber",
  "/son-xeberler",
  "/az/son-xeberler",
  "/all",
  "/az/all",
  "/all-news",
  "/az/all-news",
  "/latest",
  "/lastnews",
  "/gundem",
  "/media",
];
const COMMON_RSS_PATHS = [
  "/feed/",
  "/feed",
  "/rss",
  "/rss/",
  "/rss.xml",
  "/feed.xml",
  "/atom.xml",
  "/az/feed/",
  "/az/feed",
  "/az/rss",
  "/az/rss.xml",
  "/xeberler/rss",
  "/news/rss",
];
const DOMAIN_PREFERRED_RSS_URLS = new Map<string, string[]>([
  ["azertag.az", ["https://azertag.az/rss", "https://azertag.az/rss.xml"]],
]);
const COMMON_SITEMAP_PATHS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/sitemap-news.xml",
  "/news-sitemap.xml",
  "/post-sitemap.xml",
];

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

function normalizeSiteRoot(raw: string | null | undefined) {
  const normalized = normalizeUrl(raw);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    return url.origin + "/";
  } catch {
    return normalized;
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

function titleFromUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const parts = decodeURIComponent(url.pathname)
      .split("/")
      .filter(Boolean);
    let slug = parts[parts.length - 1] || "";
    if (/^\d{3,}$/.test(slug) && parts.length > 1) slug = parts[parts.length - 2] || slug;
    const cleaned = slug
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\d{3,}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length < 10) return "";
    if (cleaned.split(/\s+/).length < 2) return "";
    return cleaned;
  } catch {
    return "";
  }
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
      const rawTitle = normalizeTitle(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
      const hrefLink = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
      const textLink = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1];
      const permalink = block.match(/<guid[^>]+isPermaLink=["']true["'][^>]*>([\s\S]*?)<\/guid>/i)?.[1];
      const url = absolutize(unwrapCdata(hrefLink || textLink || permalink), baseUrl);
      const title = isUsefulTitle(rawTitle) ? rawTitle : titleFromUrl(url);
      return { url, title, sourceContext: "rss" as const };
    })
    .filter((candidate) => isUsefulTitle(candidate.title) && isAcceptableArticleCandidate(candidate, siteHost));

  return uniqueCandidates(candidates);
}


function getAttr(attrs: string, name: string) {
  return attrs.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1] || "";
}

function isSameSiteUrl(rawUrl: string, siteHost: string) {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
    return !siteHost || host === siteHost || host.endsWith(`.${siteHost}`);
  } catch {
    return false;
  }
}

function looksLikeFeedReference(value: string) {
  return /(rss|atom|feed|xml|jsonfeed|rss-feed|rss_lent|rss-lent|xəbər lenti|xeber lenti|news feed)/i.test(value);
}

function extractFeedUrlsFromHtml(html: string, baseUrl: string, siteHost: string) {
  const feedUrls: string[] = [];

  for (const match of html.matchAll(/<link\b([^>]+)>/gi)) {
    const attrs = match[1];
    const rel = getAttr(attrs, "rel").toLowerCase();
    const type = getAttr(attrs, "type").toLowerCase();
    const title = getAttr(attrs, "title").toLowerCase();
    const href = getAttr(attrs, "href");
    const looksLikeFeed =
      (rel.includes("alternate") || rel.includes("service") || rel.includes("feed")) &&
      (/(rss|atom|xml|json)/i.test(type) || looksLikeFeedReference(title) || looksLikeFeedReference(href));
    if (!href || !looksLikeFeed) continue;
    const url = absolutize(href, baseUrl);
    if (url && isSameSiteUrl(url, siteHost)) feedUrls.push(url);
  }

  for (const match of html.matchAll(/<a\b([^>]+)href=["']([^"'#]+)["']([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = match[2];
    const attrs = `${match[1]} ${match[3]}`;
    const label = normalizeTitle(`${getAttr(attrs, "title")} ${getAttr(attrs, "aria-label")} ${match[4]}`).toLowerCase();
    if (!looksLikeFeedReference(href) && !looksLikeFeedReference(label)) continue;
    const url = absolutize(href, baseUrl);
    if (url && isSameSiteUrl(url, siteHost)) feedUrls.push(url);
  }

  return unique(feedUrls).slice(0, MAX_DISCOVERED_FEEDS);
}

function extractSitemapUrlsFromRobots(robots: string, baseUrl: string, siteHost: string) {
  const urls: string[] = [];
  for (const match of robots.matchAll(/^\s*sitemap\s*:\s*(\S+)\s*$/gim)) {
    const url = absolutize(match[1], baseUrl);
    if (url && isSameSiteUrl(url, siteHost)) urls.push(url);
  }
  return unique(urls).slice(0, MAX_DISCOVERED_SITEMAPS);
}

function looksLikeNewsListingReference(value: string) {
  return /(news|xeber|xəbər|xeberler|xəbərlər|son-xeber|son xəbər|latest|lastnews|all-news|butun-xeber|bütün xəbər|media|gundem|gündəm)/i.test(value);
}

function extractNewsListingUrlsFromHtml(html: string, baseUrl: string, siteHost: string) {
  const urls: string[] = [];
  for (const match of html.matchAll(/<a\b([^>]+)href=["']([^"'#]+)["']([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = match[2];
    const attrs = `${match[1]} ${match[3]}`;
    const label = normalizeTitle(`${getAttr(attrs, "title")} ${getAttr(attrs, "aria-label")} ${match[4]}`).toLowerCase();
    const url = absolutize(href, baseUrl);
    if (!url || !isSameSiteUrl(url, siteHost)) continue;
    if (isLikelyArticleLink(url, siteHost)) continue;
    if (!looksLikeNewsListingReference(`${href} ${label}`)) continue;
    urls.push(url);
  }
  return unique(urls).slice(0, 8);
}

function extractHtmlArticleCandidates(html: string, baseUrl: string, siteHost: string) {
  const candidates = Array.from(html.matchAll(/<a\b([^>]+)href=["']([^"'#]+)["']([^>]*)>([\s\S]*?)<\/a>/gi))
    .map((m) => {
      const attrs = `${m[1]} ${m[3]}`;
      const attrTitle = attrs.match(/(?:title|aria-label)=["']([^"']+)["']/i)?.[1];
      const rawTitle = normalizeTitle(attrTitle || m[4])
        .replace(/^\d{1,2}[:.]\d{2}\s+\d{1,2}[-.]\d{1,2}[-.]\d{2,4}\s*/i, "")
        .replace(/^\d{1,2}[:.]\d{2}\s+(?:davamı\s*)?/i, "")
        .replace(/^davamı\s*/i, "")
        .trim();
      const url = absolutize(m[2].trim(), baseUrl);
      const title = isUsefulTitle(rawTitle) ? rawTitle : titleFromUrl(url);
      return { url, title, sourceContext: "html" as const };
    })
    .filter((candidate) => isUsefulTitle(candidate.title) && isAcceptableArticleCandidate(candidate, siteHost));

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
      isUsefulTitle(candidate.title) && isAcceptableArticleCandidate(candidate, siteHost)
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

function hasEnoughListedArticles(candidates: ArticleCandidate[], minimum = 5) {
  return uniqueCandidates(candidates).length >= minimum;
}

function isSlugArticlePath(path: string, pattern: RegExp) {
  if (!pattern.test(path)) return false;
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) return false;
  const slug = parts[parts.length - 1] || "";
  const section = parts.length > 1 ? parts[parts.length - 2] || "" : "";
  if ((slug.match(/-/g) ?? []).length < 2) return false;
  if (BLOCKED_ROOT_SLUG_WORDS.has(section)) return false;
  return !slug.split("-").some((part) => BLOCKED_ROOT_SLUG_WORDS.has(part));
}

function isLanguageSlugArticle(path: string) {
  return isSlugArticlePath(path, LANG_SLUG_ARTICLE_RE);
}

function isCategorySlugArticle(path: string) {
  return isSlugArticlePath(path, CATEGORY_SLUG_ARTICLE_RE);
}

function isAllowedRootSlugArticle(host: string, path: string) {
  if (!ROOT_SLUG_ARTICLE_HOSTS.has(host)) return false;
  if (!/^\/[a-z0-9%_-]{18,}\/?$/.test(path)) return false;
  const slug = path.replace(/^\/+|\/+$/g, "");
  if ((slug.match(/-/g) ?? []).length < 2) return false;
  return !slug.split("-").some((part) => BLOCKED_ROOT_SLUG_WORDS.has(part));
}

function isFeedRootSlugArticle(link: string, siteHost: string) {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return false;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (siteHost && host !== siteHost && !host.endsWith(`.${siteHost}`)) return false;
  const path = decodeURIComponent(url.pathname.toLowerCase());
  if (!/^\/[a-z0-9%_-]{18,}\/?$/.test(path)) return false;
  const slug = path.replace(/^\/+|\/+$/g, "");
  if ((slug.match(/-/g) ?? []).length < 2) return false;
  return !slug.split("-").some((part) => BLOCKED_ROOT_SLUG_WORDS.has(part));
}

function isTitledRootSlugArticle(candidate: ArticleCandidate, siteHost: string) {
  if (!isUsefulTitle(candidate.title)) return false;
  return isFeedRootSlugArticle(candidate.url, siteHost);
}

function isAcceptableArticleCandidate(candidate: ArticleCandidate, siteHost: string) {
  return (
    isLikelyArticleLink(candidate.url, siteHost) ||
    ((candidate.sourceContext === "rss" || candidate.sourceContext === "html") &&
      isTitledRootSlugArticle(candidate, siteHost))
  );
}

function isProbablySectionUrl(path: string) {
  const badSectionWords = [
    "news",
    "xeber",
    "xeberler",
    "xəbərlər",
    "category",
    "kateqoriya",
    "archive",
    "arxiv",
    "latest",
    "lastnews",
    "allnews",
    "all-news",
    "son-xeberler",
    "media",
  ];
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1 && badSectionWords.some((word) => path.includes(word))) return true;
  if (parts.length <= 2 && badSectionWords.some((word) => path.endsWith(word))) return true;
  return false;
}

function isAllowedDomainDetailArticle(host: string, path: string) {
  return (DOMAIN_DETAIL_ARTICLE_PATTERNS.get(host) || []).some((pattern) => pattern.test(path));
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
  if (isProbablySectionUrl(path)) return false;
  if (ARTICLE_URL_PATTERNS.some((pattern) => path.includes(pattern))) return true;
  if (ARTICLE_URL_REGEX_PATTERNS.some((pattern) => pattern.test(path))) return true;
  if (isAllowedDomainDetailArticle(host, path)) return true;
  if (isLanguageSlugArticle(path)) return true;
  if (isCategorySlugArticle(path)) return true;
  if (isAllowedRootSlugArticle(host, path)) return true;

  return (
    /\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/.test(path) ||
    /\d{6,}/.test(path) ||
    /(news|xeber|post|article|story|read|gundem|media)/i.test(path)
  );
}

function buildSuccessUpdate(source: SourceInput, method: string, options: { latestUrl?: string | null; rssUrl?: string | null; selector?: string | null; articlePattern?: string | null; notes: string }) {
  const now = new Date().toISOString();
  return {
    name: hostname(source.base_url || source.latest_url) || source.name || "source",
    status: "active",
    monitor_method: method,
    latest_url: options.latestUrl ?? source.latest_url ?? source.base_url ?? null,
    rss_url: options.rssUrl ?? source.rss_url ?? null,
    selector: options.selector ?? source.selector ?? null,
    article_pattern: options.articlePattern ?? source.article_pattern ?? null,
    discovery_status: "accepted",
    consecutive_fail_count: 0,
    last_error: null,
    last_result: "repair_readable",
    last_checked_at: now,
    last_success_at: null,
    notes: options.notes,
  };
}

function buildFailUpdate(source: SourceInput, reason: string) {
  return {
    name: hostname(source.base_url || source.latest_url) || source.name || "source",
    last_error: reason,
    last_result: "repair_failed",
    last_checked_at: new Date().toISOString(),
    last_success_at: null,
    discovery_status: "needs_manual_selector",
    consecutive_fail_count: 1,
    notes: `Auto repair failed: ${reason}`,
  };
}

async function discoverFeedCandidates(baseUrl: string, siteHost: string) {
  try {
    const res = await fetchText(baseUrl, 10000);
    const isHtml = /html/i.test(res.contentType) || /<html|<link|<a\b/i.test(res.text);
    if (!res.ok || !isHtml) return [];
    return extractFeedUrlsFromHtml(res.text, res.url || baseUrl, siteHost);
  } catch (_) {
    return [];
  }
}

async function testRss(source: SourceInput, baseUrl: string, siteHost: string): Promise<RepairResult | null> {
  const base = new URL(baseUrl);
  const discoveredFeeds = await discoverFeedCandidates(baseUrl, siteHost);
  const preferredFeeds = DOMAIN_PREFERRED_RSS_URLS.get(siteHost) || [];
  const candidates = unique([
    normalizeUrl(source.rss_url),
    ...preferredFeeds,
    ...discoveredFeeds,
    ...COMMON_RSS_PATHS.map((path) => new URL(path, base).toString()),
  ].filter(Boolean) as string[]).slice(0, MAX_DISCOVERED_FEEDS);

  for (const rssUrl of candidates) {
    try {
      const res = await fetchText(rssUrl, 10000);
      const isXml = /xml|rss|atom/i.test(res.contentType) || /<(rss|feed)\b/i.test(res.text);
      if (!res.ok || !isXml) continue;
      const feedCandidates = extractXmlArticleCandidates(res.text, res.url, siteHost);
      const candidates = await validateArticleCandidates(feedCandidates, siteHost, 8);
      const acceptedCandidates = hasEnoughVerifiedArticles(candidates)
        ? candidates
        : hasEnoughListedArticles(feedCandidates, MIN_REPAIR_ARTICLE_COUNT)
          ? uniqueCandidates(feedCandidates).slice(0, 8)
          : [];
      const links = acceptedCandidates.map((candidate) => candidate.url);
      if (acceptedCandidates.length >= MIN_REPAIR_ARTICLE_COUNT) {
        const detailVerified = candidates.length >= MIN_REPAIR_ARTICLE_COUNT;
        return {
          ok: true,
          method: "rss",
          reason: detailVerified
            ? `RSS verified: ${acceptedCandidates.length} readable article pages`
            : `RSS feed verified: ${acceptedCandidates.length} readable article entries`,
          candidateCount: acceptedCandidates.length,
          finalUrl: res.url || rssUrl,
          rssUrl: res.url || rssUrl,
          sampleLinks: links.slice(0, 5),
          update: buildSuccessUpdate(source, "rss", {
            latestUrl: baseUrl,
            rssUrl: res.url || rssUrl,
            notes: detailVerified
              ? `Auto repair readable: RSS verified ${acceptedCandidates.length} readable article pages; feed=${res.url || rssUrl}`
              : `Auto repair readable: RSS feed verified ${acceptedCandidates.length} article entries; detail pages were not required; feed=${res.url || rssUrl}`,
          }),
        };
      }
    } catch (_) {
      // Try next candidate.
    }
  }

  return null;
}

async function collectSitemapArticleLinks(sitemapUrl: string, siteHost: string, depth = 0): Promise<string[]> {
  try {
    const res = await fetchText(sitemapUrl, 10000);
    const isXml = /xml/i.test(res.contentType) || /<(urlset|sitemapindex|rss|feed)\b/i.test(res.text);
    if (!res.ok || !isXml) return [];

    const links = extractXmlLinks(res.text, res.url);
    const articleLinks = links.filter((link) => isLikelyArticleLink(link, siteHost));
    if (articleLinks.length >= MIN_REPAIR_ARTICLE_COUNT || depth >= 1) return articleLinks;

    const childSitemaps = links
      .filter((link) => /sitemap|\.xml(?:$|[?#])/i.test(link) && isSameSiteUrl(link, siteHost))
      .slice(0, 6);
    const nested: string[] = [];
    for (const child of childSitemaps) {
      nested.push(...await collectSitemapArticleLinks(child, siteHost, depth + 1));
    }
    return unique([...articleLinks, ...nested]);
  } catch (_) {
    return [];
  }
}

async function discoverSitemapCandidates(baseUrl: string, siteHost: string) {
  const base = new URL(baseUrl);
  const candidates: string[] = [
    /sitemap|\.xml(?:$|[?#])/i.test(baseUrl) ? baseUrl : "",
    ...COMMON_SITEMAP_PATHS.map((path) => new URL(path, base).toString()),
  ];

  try {
    const robotsUrl = new URL("/robots.txt", base).toString();
    const robots = await fetchText(robotsUrl, 7000);
    if (robots.ok) candidates.unshift(...extractSitemapUrlsFromRobots(robots.text, robots.url || robotsUrl, siteHost));
  } catch (_) {
    // robots.txt is optional.
  }

  return unique(candidates.filter(Boolean)).slice(0, MAX_DISCOVERED_SITEMAPS);
}

async function testSitemap(source: SourceInput, baseUrl: string, siteHost: string): Promise<RepairResult | null> {
  const sitemapCandidates = await discoverSitemapCandidates(baseUrl, siteHost);

  for (const sitemapUrl of sitemapCandidates) {
    const links = await collectSitemapArticleLinks(sitemapUrl, siteHost);
    const candidates = await validateArticleLinks(links, siteHost, 8);
    if (hasEnoughVerifiedArticles(candidates)) {
      return {
        ok: true,
        method: "sitemap",
        reason: `Sitemap verified: ${candidates.length} readable article pages`,
        candidateCount: candidates.length,
        finalUrl: sitemapUrl,
        sampleLinks: candidates.map((candidate) => candidate.url).slice(0, 5),
        update: buildSuccessUpdate(source, "sitemap", {
          latestUrl: sitemapUrl,
          notes: `Auto repair readable: sitemap verified ${candidates.length} readable article pages; sitemap=${sitemapUrl}`,
        }),
      };
    }
  }

  return null;
}

async function testHtmlPage(source: SourceInput, pageUrl: string, siteHost: string): Promise<RepairResult | null> {
  try {
    const res = await fetchText(pageUrl, 12000);
    if (!res.ok) return null;
    const isHtml = /html/i.test(res.contentType) || /<html|<a\b/i.test(res.text);
    if (!isHtml) return null;
    const extractedCandidates = extractHtmlArticleCandidates(res.text, res.url, siteHost);
    const candidates = await validateArticleCandidates(extractedCandidates, siteHost, 8);
    const acceptedCandidates = hasEnoughVerifiedArticles(candidates)
      ? candidates
      : hasEnoughListedArticles(extractedCandidates)
        ? uniqueCandidates(extractedCandidates).slice(0, 8)
        : [];
    const links = acceptedCandidates.map((candidate) => candidate.url);
    if (hasEnoughVerifiedArticles(acceptedCandidates)) {
      const hasArticle = /<article\b/i.test(res.text);
      const hasNewsClass = /class=["'][^"']*(news|post|item|article|entry)/i.test(res.text);
      const method = hasArticle || hasNewsClass ? "selector" : "latest_page";
      const detailVerified = candidates.length >= MIN_REPAIR_ARTICLE_COUNT;
      return {
        ok: true,
        method,
        reason: detailVerified
          ? `HTML verified: ${acceptedCandidates.length} readable article pages`
          : `HTML listing verified: ${acceptedCandidates.length} article links with titles`,
        candidateCount: acceptedCandidates.length,
        finalUrl: res.url,
        sampleLinks: links.slice(0, 5),
        update: buildSuccessUpdate(source, method, {
          latestUrl: res.url,
          selector: method === "selector" ? "article, .news-item, .post, .entry, .item" : source.selector ?? null,
          articlePattern:
            method === "selector"
              ? "article a[href], .news-item a[href], .post a[href], .entry a[href], .item a[href], h2 a[href], h3 a[href]"
              : source.article_pattern ?? null,
          notes: detailVerified
            ? `Auto repair readable: HTML verified ${acceptedCandidates.length} readable article pages; page=${res.url}`
            : `Auto repair readable: HTML listing verified ${acceptedCandidates.length} article links with titles; detail pages were not required; page=${res.url}`,
        }),
      };
    }
  } catch (_) {
    return null;
  }

  return null;
}

async function discoverHtmlPageCandidates(source: SourceInput, siteRootUrl: string, siteHost: string) {
  const root = new URL(siteRootUrl);
  const pages: string[] = [
    normalizeUrl(source.latest_url) || "",
    normalizeUrl(source.base_url) || "",
    siteRootUrl,
  ];

  try {
    const home = await fetchText(siteRootUrl, 9000);
    const isHtml = /html/i.test(home.contentType) || /<html|<a\b/i.test(home.text);
    if (home.ok && isHtml) {
      pages.push(...extractNewsListingUrlsFromHtml(home.text, home.url || siteRootUrl, siteHost));
    }
  } catch (_) {
    // Homepage discovery is best effort.
  }

  pages.push(...COMMON_LATEST_PATHS.map((path) => new URL(path, root).toString()));

  return unique(pages.filter(Boolean)).slice(0, MAX_HTML_PAGES_TO_TEST);
}

async function testHtml(source: SourceInput, siteRootUrl: string, siteHost: string): Promise<RepairResult | null> {
  const pages = await discoverHtmlPageCandidates(source, siteRootUrl, siteHost);

  for (const pageUrl of pages) {
    const result = await testHtmlPage(source, pageUrl, siteHost);
    if (result?.ok) return result;
  }

  return null;
}

function scoreRepairResult(result: RepairResult) {
  const methodScores: Record<string, number> = {
    rss: 100,
    sitemap: 90,
    selector: 75,
    latest_page: 65,
    homepage: 55,
  };
  return (methodScores[result.method] ?? 40) + Math.min(result.candidateCount, 10);
}

async function repairSource(source: SourceInput): Promise<RepairResult> {
  const candidateUrl = normalizeUrl(source.latest_url) || normalizeUrl(source.base_url);
  const siteRootUrl = normalizeSiteRoot(source.base_url) || normalizeSiteRoot(source.latest_url);
  if (!candidateUrl || !siteRootUrl) {
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

  const siteHost = hostname(siteRootUrl);
  const testPlan = [
    { name: "rss", run: () => testRss(source, siteRootUrl, siteHost) },
    { name: "sitemap", run: () => testSitemap(source, siteRootUrl, siteHost) },
    { name: "html", run: () => testHtml(source, siteRootUrl, siteHost) },
  ];
  const attempts: string[] = [];
  const successful: RepairResult[] = [];

  for (const test of testPlan) {
    const result = await test.run();
    if (result?.ok) {
      successful.push(result);
      attempts.push(`${test.name}:ok:${result.method}:${result.candidateCount}`);
    } else {
      attempts.push(`${test.name}:empty`);
    }
  }

  if (successful.length > 0) {
    const best = successful.sort((a, b) => scoreRepairResult(b) - scoreRepairResult(a))[0];
    const existingNotes = typeof best.update.notes === "string" ? best.update.notes : "Auto repair readable";
    best.update.notes = `${existingNotes}; selected=${best.method}; attempts=${attempts.join(",")}`;
    best.reason = `${best.reason}; selected best method after testing ${successful.length} method(s)`;
    return best;
  }

  const reason = `RSS, sitemap and HTML did not return enough verified readable article pages; attempts=${attempts.join(",")}`;
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
    return Response.json({ ...result, version: SOURCE_REPAIR_VERSION }, { headers: corsHeaders });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
