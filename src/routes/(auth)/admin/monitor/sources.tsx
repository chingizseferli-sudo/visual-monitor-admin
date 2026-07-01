import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

type Source = {
  id: string
  name: string
  base_url: string
  latest_url: string | null
  rss_url: string | null
  source_type: string | null
  status: string | null
  trust_level: string | null
  monitor_method: string | null
  selector: string | null
  article_pattern: string | null
  discovery_status: string | null
  discovery_score: number | null
  last_checked_at: string | null
  last_success_at: string | null
  last_article_found_at: string | null
  last_error: string | null
  last_result: string | null
  consecutive_fail_count: number | null
  last_discovered_at: string | null
  notes: string | null
}


type SourceQualityMetrics = {
  items7d: number
  matches7d: number
  alerts7d: number
  sentNews7d: number
  lastUsefulItem: string | null
  loaded: boolean
}

type SourceDetailItem = {
  id: string
  title: string | null
  url: string | null
  published_at: string | null
  detected_at: string | null
  created_at: string | null
}

type SourceDetailMatch = {
  id: string
  item_id: string | null
  matched_keyword: string | null
  created_at: string | null
}


type RepairResponse = {
  ok: boolean
  method: string
  reason: string
  candidateCount: number
  finalUrl?: string
  sampleLinks: string[]
  update: Record<string, unknown>
}

type RepairRunItem = {
  sourceId: string
  sourceName: string
  ok: boolean
  method?: string
  reason: string
  candidateCount?: number
}

type RepairRunSummary = {
  attempted: number
  fixed: number
  failed: number
  methodCounts: Record<string, number>
  reasonCounts: Record<string, number>
  items: RepairRunItem[]
}

type AddSourceResult = {
  ok: boolean
  method: string
  reason: string
  candidateCount: number
  sampleLinks: string[]
  sourceName: string
}

function formatRepairReason(reason: string | null | undefined) {
  const text = String(reason || '').trim()
  if (!text) return 'Səbəb göstərilməyib.'

  const normalized = text.toLowerCase()
  if (
    normalized.includes('rss, sitemap and html') ||
    normalized.includes('did not return article links') ||
    normalized.includes('did not return enough verified readable article pages')
  ) {
    return 'RSS, sitemap və səhifə yoxlamasında oxuna bilən xəbər linki tapılmadı.'
  }

  if (normalized.includes('valid base_url') || normalized.includes('latest_url not found')) {
    return 'Mənbənin əsas URL-i düzgün deyil və ya tapılmadı.'
  }

  if (normalized.includes('source-repair')) {
    return 'Avtomatik bərpa xidməti cavab vermədi.'
  }

  if (normalized.includes('failed to fetch') || normalized.includes('fetch')) {
    return 'Sayta qoşulmaq mümkün olmadı. Domen, SSL və ya şəbəkə problemi ola bilər.'
  }

  return text
}

const MONITOR_METHODS = [
  'rss',
  'rss_discovered',
  'latest_page',
  'sitemap',
  'homepage',
  'selector',
  'xpath_pattern',
  'google_news_fallback',
  'recoverable',
]

const METHOD_FILTER_OPTIONS = [
  { value: 'rss', label: 'RSS' },
  { value: 'latest_page', label: 'Son xəbərlər səhifəsi' },
  { value: 'sitemap', label: 'Sitemap' },
  { value: 'homepage', label: 'Ana səhifə' },
  { value: 'selector', label: 'CSS Selector' },
  { value: 'xpath_pattern', label: 'XPath' },
  { value: 'google_news_fallback', label: 'Google News' },
]

const METHOD_FILTER_GROUPS: Record<string, string[]> = {
  rss: ['rss', 'rss_discovered'],
}


const SOURCE_QUALITY_LOOKBACK_DAYS = 30
const SOURCE_QUALITY_BATCH_SIZE = 1000

const PROTECTED_PARENT_DOMAINS = new Set([
  'az',
  'com.az',
  'edu.az',
  'gov.az',
  'net.az',
  'org.az',
  'info.az',
  'biz.az',
  'co.az',
  'ac.az',
])

const SELECTOR_TEMPLATES = [
  {
    name: 'Ümumi xəbər kartları',
    selector: 'article, .news-item, .post, .entry, .item',
    articlePattern:
      'article a[href], .news-item a[href], .post a[href], .entry a[href], .item a[href]',
    method: 'selector',
  },
  {
    name: 'Başlıq linkləri',
    selector: 'h1 a, h2 a, h3 a, .title a, .entry-title a',
    articlePattern:
      'h1 a[href], h2 a[href], h3 a[href], .title a[href], .entry-title a[href]',
    method: 'selector',
  },
  {
    name: 'Xəbər siyahısı',
    selector: '.news a, .news-list a, .latest-news a, .posts a',
    articlePattern:
      '.news a[href], .news-list a[href], .latest-news a[href], .posts a[href]',
    method: 'selector',
  },
  {
    name: 'WordPress',
    selector: 'article.post, .post, .entry',
    articlePattern:
      'article.post a[href], .post-title a[href], .entry-title a[href]',
    method: 'selector',
  },
  {
    name: 'XPath fallback',
    selector: '',
    articlePattern: '//article//a[@href] | //h2//a[@href] | //h3//a[@href]',
    method: 'xpath_pattern',
  },
]


function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  const formatter = new Intl.DateTimeFormat('az-AZ', {
    timeZone: 'Asia/Baku',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return formatter.format(date).replace(',', '')
}

function emptyValue(value: string | null | undefined) {
  return value && value.trim() ? value : '—'
}

function mapValue(
  value: string | null | undefined,
  labels: Record<string, string>
) {
  if (!value) return '—'

  return labels[value] || value
}

function formatStatus(value: string | null) {
  return mapValue(value, {
    active: 'Aktiv',
    inactive: 'Passiv',
  })
}

function formatDiscoveryStatus(value: string | null) {
  return mapValue(value, {
    readable: 'Oxuna bilir',
    accepted: 'Qəbul edilib',
    rejected: 'Rədd edilib',
    pending: 'Gözləyir',
    needs_review: 'Yoxlama lazımdır',
    needs_manual_selector: 'Manual selector lazımdır',
    manual_needed: 'Manual yoxlama lazımdır',
  })
}
function formatTrustLevel(value: string | null) {
  return mapValue(value, {
    high: 'Yüksək',
    medium: 'Orta',
    low: 'Aşağı',
  })
}

function formatSourceType(value: string | null) {
  return mapValue(value, {
    news_site: 'Xəbər saytı',
    education: 'Təhsil',
    government: 'Dövlət',
    university: 'Universitet',
    business: 'Biznes',
    unknown: 'Naməlum',
  })
}

function formatMonitorMethod(value: string | null) {
  return mapValue(value, {
    rss: 'RSS',
    rss_discovered: 'RSS',
    selector: 'CSS Selector',
    xpath_pattern: 'XPath',
    latest_page: 'Son xəbərlər səhifəsi',
    homepage: 'Ana səhifə',
    google_news_fallback: 'Google News',
    recoverable: 'Bərpa rejimi',
    blocked: 'Bloklanıb',
    dead: 'İşləmir',
    failed: 'Xəta',
  })
}

function matchesMonitorMethodFilter(method: string | null, filter: string) {
  if (filter === 'all') return true
  const methods = METHOD_FILTER_GROUPS[filter] || [filter]
  return methods.includes(method || '')
}

function formatResult(value: string | null) {
  return mapValue(value, {
    no_candidate: 'Uyğun xəbər tapılmadı',
    old_news: 'Köhnə xəbər',
    sent: 'Göndərildi',
    duplicate: 'Təkrar xəbər',
    repair_readable: 'Oxuna bilir',
    repair_failed: 'Bərpa alınmadı',
    site_error: 'Sayt oxunmadı',
    timeout: 'Vaxt limiti',
    parse_error: 'Parse xətası',
  })
}

function isRealErrorResult(value: string | null) {
  return ['site_error', 'timeout', 'parse_error', 'blocked', 'dead', 'failed'].includes(
    value || ''
  )
}

function formatLastError(source: Source) {
  const nonErrorResults = ['no_candidate', 'old_news', 'sent', 'duplicate']

  if (nonErrorResults.includes(source.last_result || '')) return '—'

  if (isRealErrorResult(source.last_result) || source.last_error) {
    return emptyValue(source.last_error)
  }

  return '—'
}

function normalizeSourceUrl(value: string | null | undefined) {
  const raw = String(value || '').trim()
  if (!raw) return null

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function getSelectorPickerUrl(sourceId: string) {
  return `/admin/monitor/picker?sourceId=${encodeURIComponent(sourceId)}`
}

function getHostname(url: string | null) {
  if (!url) return ''

  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`
    return new URL(normalized).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function getSourceTitle(source: Source) {
  return (
    getHostname(source.base_url) ||
    getHostname(source.latest_url) ||
    source.name ||
    '-'
  )
}

function findParentDomain(source: Source, sources: Source[]) {
  const host = getHostname(source.base_url)

  if (!host) return null

  const domains = new Set(
    sources.map((item) => getHostname(item.base_url)).filter(Boolean)
  )

  return (
    Array.from(domains)
      .filter((domain) => domain !== host)
      .filter((domain) => !PROTECTED_PARENT_DOMAINS.has(domain))
      .sort((a, b) => b.length - a.length)
      .find((domain) => host.endsWith(`.${domain}`)) || null
  )
}

function isSubdomain(source: Source, sources: Source[]) {
  return Boolean(findParentDomain(source, sources))
}

function isRssMethod(source: Source) {
  return ['rss', 'rss_discovered', 'google_news_fallback'].includes(
    source.monitor_method || ''
  )
}

function isSelectorMethod(source: Source) {
  return ['selector', 'xpath_pattern'].includes(source.monitor_method || '')
}

function isStale(source: Source) {
  if (!source.last_checked_at) return source.status === 'active'

  const checkedAt = new Date(source.last_checked_at).getTime()

  if (!Number.isFinite(checkedAt)) return true

  return Date.now() - checkedAt > 24 * 60 * 60 * 1000
}

function hasNonNewsSignal(source: Source) {
  const value = `${source.notes || ''} ${source.last_result || ''} ${
    source.last_error || ''
  }`.toLowerCase()

  return (
    value.includes('commercial_site_not_news') ||
    value.includes('insufficient_news_activity') ||
    value.includes('rejected_commercial') ||
    value.includes('rejected_inactive_news') ||
    value.includes('activity too low') ||
    value.includes('commercial site signals')
  )
}

function getSourceIssues(source: Source, sources: Source[]) {
  const issues: string[] = []

  if (
    source.status === 'active' &&
    source.discovery_status !== 'accepted' &&
    isSubdomain(source, sources)
  ) {
    issues.push('subdomain')
  }

  if (isRssMethod(source) && !(source.rss_url || '').trim()) {
    issues.push('rss yoxdur')
  }

  if (
    isSelectorMethod(source) &&
    !(source.selector || '').trim() &&
    !(source.article_pattern || '').trim()
  ) {
    issues.push('selector yoxdur')
  }

  if (['blocked', 'dead', 'failed'].includes(source.monitor_method || '')) {
    issues.push(source.monitor_method || 'problem')
  }

  if ((source.consecutive_fail_count || 0) >= 5) {
    issues.push(`fail ${source.consecutive_fail_count}`)
  }

  if (source.last_result === 'site_error') {
    issues.push('site_error')
  }

  if (hasNonNewsSignal(source)) {
    issues.push('xəbər saytı deyil')
  }

  if (source.last_result !== 'pending_check' && isStale(source)) {
    issues.push('24 saat+ yoxlanmayıb')
  }

  return issues
}

function getSimpleProblemReasons(source: Source, sources: Source[]) {
  const reasons = new Set<string>()
  const issues = getSourceIssues(source, sources)
  const lastResult = source.last_result || ''
  const lastError = (source.last_error || '').toLowerCase()

  if (lastResult === 'no_candidate') {
    reasons.add('Xəbər linki tapılmadı')
  }

  if (lastResult === 'fetch_failed' || lastResult === 'site_error') {
    reasons.add('Sayt oxunmadı')
  }

  if (lastResult === 'selector_failed') {
    reasons.add('Selector işləmədi')
  }

  if (lastError.includes('fetch_failed') || lastError.includes('site_error')) {
    reasons.add('Sayt oxunmadı')
  }

  if (lastError.includes('selector_failed')) {
    reasons.add('Selector işləmədi')
  }

  for (const issue of issues) {
    if (issue === 'rss yoxdur') {
      reasons.add('RSS tapılmadı')
    } else if (issue === 'site_error') {
      reasons.add('Sayt oxunmadı')
    } else if (issue === '24 saat+ yoxlanmayıb') {
      reasons.add('Uzun müddət yoxlanmayıb')
    } else {
      reasons.add(issue)
    }
  }

  return Array.from(reasons)
}

function getSourceHealth(source: Source, sources: Source[]) {
  const issues = getSourceIssues(source, sources)
  const failCount = source.consecutive_fail_count || 0
  const method = source.monitor_method || ''

  if (
    source.status === 'inactive' ||
    failCount >= 5 ||
    source.last_result === 'site_error' ||
    ['blocked', 'dead', 'failed'].includes(method) ||
    hasNonNewsSignal(source)
  ) {
    return 'error'
  }

  if (
    failCount > 0 ||
    source.last_result === 'no_candidate' ||
    source.discovery_status === 'needs_manual_selector' ||
    source.discovery_status === 'manual_needed' ||
    issues.length > 0
  ) {
    return 'warning'
  }

  return 'ok'
}

function getSourceHealthLabel(source: Source, sources: Source[]) {
  const health = getSourceHealth(source, sources)

  if (health === 'ok') return 'İzlənir'
  if (health === 'warning') return 'Bərpa oluna bilər'

  return 'İşləmir'
}



function sourceLookupKeys(source: Source) {
  const keys = new Set<string>()
  const name = String(source.name || '').trim().toLowerCase()
  if (name) keys.add(`name:${name}`)

  for (const value of [source.base_url, source.latest_url, source.rss_url]) {
    const host = getHostname(value || '')
    if (host) keys.add(`host:${host}`)
  }

  return Array.from(keys)
}

function matchItemToSourceId(
  row: { source_id?: string | null; url?: string | null },
  sourceKeyIndex: Map<string, string>,
  knownSourceIds: Set<string>
) {
  const linkHost = getHostname(String(row.url || ''))
  if (linkHost) {
    const exact = sourceKeyIndex.get(`host:${linkHost}`)
    if (exact) return exact

    const parent = Array.from(sourceKeyIndex.entries()).find(([key]) => {
      if (!key.startsWith('host:')) return false
      const host = key.slice(5)
      return linkHost === host || linkHost.endsWith(`.${host}`)
    })
    if (parent) return parent[1]
  }

  const sourceId = String(row.source_id || '')
  return sourceId && knownSourceIds.has(sourceId) ? sourceId : null
}

function findSourceIdByHost(
  host: string,
  sourceKeyIndex: Map<string, string>
) {
  const normalizedHost = host.replace(/^www\./, '').toLowerCase()
  const exact = sourceKeyIndex.get(`host:${normalizedHost}`)
  if (exact) return exact

  const parent = Array.from(sourceKeyIndex.entries()).find(([key]) => {
    if (!key.startsWith('host:')) return false
    const sourceHost = key.slice(5)
    return (
      normalizedHost === sourceHost ||
      normalizedHost.endsWith(`.${sourceHost}`) ||
      sourceHost.endsWith(`.${normalizedHost}`)
    )
  })
  return parent?.[1] || null
}

function possibleSourceHosts(value: string | null | undefined) {
  const text = String(value || '').toLowerCase()
  const hosts = new Set<string>()
  const directHost = getHostname(text)
  if (directHost) hosts.add(directHost)

  for (const match of text.matchAll(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/g)) {
    if (match[1]) hosts.add(match[1].replace(/^www\./, ''))
  }

  return Array.from(hosts)
}

function matchSentNewsToSourceId(
  row: {
    source_id?: string | null
    link?: string | null
    source?: string | null
    title?: string | null
    created_at?: string | null
  },
  sourceKeyIndex: Map<string, string>,
  knownSourceIds: Set<string>
) {
  const directSourceId = String(row.source_id || '')
  if (directSourceId && knownSourceIds.has(directSourceId)) return directSourceId

  for (const host of possibleSourceHosts(row.link)) {
    const sourceId = findSourceIdByHost(host, sourceKeyIndex)
    if (sourceId) return sourceId
  }

  const sourceName = String(row.source || '').trim().toLowerCase()
  if (sourceName) {
    const byName = sourceKeyIndex.get(`name:${sourceName}`)
    if (byName) return byName

    for (const host of possibleSourceHosts(sourceName)) {
      const sourceId = findSourceIdByHost(host, sourceKeyIndex)
      if (sourceId) return sourceId
    }
  }

  for (const host of possibleSourceHosts(row.title)) {
    const sourceId = findSourceIdByHost(host, sourceKeyIndex)
    if (sourceId) return sourceId
  }

  return null
}

function isMissingSentNewsSourceIdError(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('source_id') &&
    (normalized.includes('schema cache') ||
      normalized.includes('column') ||
      normalized.includes('could not find'))
  )
}

function emptyQualityMetrics(): SourceQualityMetrics {
  return {
    items7d: 0,
    matches7d: 0,
    alerts7d: 0,
    sentNews7d: 0,
    lastUsefulItem: null,
    loaded: false,
  }
}

function isHealthySourceQuality(metrics: SourceQualityMetrics | undefined) {
  return Boolean(
    metrics?.loaded &&
      (metrics.sentNews7d > 0 || metrics.alerts7d > 0 || metrics.matches7d > 0)
  )
}

function hasSentNews(source: Source) {
  const notes = (source.notes || '').toLowerCase()

  return Boolean(
    source.status === 'active' &&
      (source.last_result === 'sent' ||
        notes.includes('[telegram_success]') ||
        notes.includes('[sent_news_sync]'))
  )
}

function isHealthySource(
  source: Source,
  metrics: SourceQualityMetrics | undefined
) {
  return source.status === 'active' && (hasSentNews(source) || isHealthySourceQuality(metrics))
}



const REPAIRABLE_SOURCE_RESULTS = new Set([
  'fallback_empty',
  'rss_empty',
  'invalid_xml',
  'selector_empty',
  'xpath_empty',
  'sitemap_empty',
  'homepage_empty',
  'latest_page_empty',
  'no_candidate',
  'no_article',
  'repair_failed',
  'fetch_failed',
  'source_review_required',
])

const HARD_SOURCE_RESULTS = new Set([
  'http_403',
  'http_404',
  'http_429',
  'timeout',
  'dns_failure',
  'ssl_failure',
  'unsafe_url',
  'site_error',
])

const CURRENT_READ_FAILURE_RESULTS = new Set([
  ...HARD_SOURCE_RESULTS,
  ...REPAIRABLE_SOURCE_RESULTS,
])

function hasCurrentReadFailure(source: Source) {
  return CURRENT_READ_FAILURE_RESULTS.has(source.last_result || '')
}

const READABLE_NON_PROBLEM_RESULTS = new Set([
  'repair_readable',
  'old_news',
  'no_monitor_match',
  'duplicate',
  'sent',
])

function isReadableNonProblemSource(source: Source) {
  return Boolean(
    source.status === 'active' &&
      !source.last_error &&
      READABLE_NON_PROBLEM_RESULTS.has(source.last_result || '')
  )
}

function isProblemSource(
  source: Source,
  metrics?: SourceQualityMetrics
) {
  const method = source.monitor_method || ''
  const failCount = source.consecutive_fail_count || 0

  if (isHealthySource(source, metrics)) return false
  if (isReadableNonProblemSource(source)) return false

  return Boolean(
    source.status !== 'active' ||
      hasCurrentReadFailure(source) ||
      failCount >= 5 ||
      source.last_result === 'site_error' ||
      ['blocked', 'dead', 'failed'].includes(method)
  )
}



function getSourceQualityLabel(
  source: Source,
  metrics: SourceQualityMetrics | undefined,
  health: ReturnType<typeof getSourceHealth>
) {
  const failCount = source.consecutive_fail_count || 0
  const method = source.monitor_method || ''
  const data = metrics || emptyQualityMetrics()

  if (!data.loaded) {
    return {
      label: 'Yoxlanır',
      tone: 'slate',
      reason: '30 günlük nəticə məlumatı yüklənir',
    }
  }

  if (isHealthySource(source, data)) {
    const deliveredCount = Math.max(data.alerts7d, data.sentNews7d)
    return {
      label: 'Sağlam mənbə',
      tone: 'emerald',
      reason:
        deliveredCount > 0
          ? `${deliveredCount} Telegram bildirişi · ${data.matches7d} uyğun nəticə`
          : `${data.matches7d} uyğun nəticə tapılıb`,
    }
  }
  if (isReadableNonProblemSource(source)) {
    return {
      label: 'Oxunur',
      tone: 'slate',
      reason:
        source.last_result === 'repair_readable'
          ? 'Oxuma metodu tapıldı; sağlam status üçün botun real nəticəsi gözlənilir'
          : 'Mənbə oxunur, amma hələ Telegrama uyğun yeni nəticə göndərilməyib',
    }
  }

  if (health === 'error' || isProblemSource(source, data)) {
    return {
      label: 'İşləmir',
      tone: 'red',
      reason: source.last_error || source.last_result || `fail ${failCount}`,
    }
  }


  return {
    label: 'Gözləmədə',
    tone: 'slate',
    reason:
      data.items7d > 0
        ? `${data.items7d} xəbər oxunub, amma Telegrama uyğun nəticə göndərilməyib`
        : 'Mənbə texniki problem vermir, amma hələ uyğun nəticə göndərilməyib',
  }}

function getQualityToneClass(tone: string) {
  if (tone === 'emerald') {
    return 'border-emerald-200 bg-emerald-100 text-emerald-700'
  }
  if (tone === 'green') {
    return 'border-green-200 bg-green-100 text-green-700'
  }
  if (tone === 'red') {
    return 'border-red-200 bg-red-100 text-red-700'
  }
  if (tone === 'amber') {
    return 'border-amber-200 bg-amber-100 text-amber-800'
  }
  if (tone === 'orange') {
    return 'border-orange-200 bg-orange-100 text-orange-700'
  }
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function getBotConfirmationLabel(
  source: Source,
  metrics: SourceQualityMetrics | undefined
) {
  const data = metrics || emptyQualityMetrics()
  const failCount = source.consecutive_fail_count || 0

  if (data.loaded && data.sentNews7d > 0) {
    return { label: `${data.sentNews7d} bildiriş`, tone: 'success' }
  }

  if (data.loaded && data.alerts7d > 0) {
    return { label: `${data.alerts7d} bildiriş`, tone: 'success' }
  }

  if (data.loaded && data.matches7d > 0) {
    return { label: `${data.matches7d} uyğun nəticə`, tone: 'success' }
  }

  if (source.last_result === 'repair_readable') {
    return { label: 'Bot yoxlaması gözlənilir', tone: 'neutral' }
  }

  if (
    ['repair_failed', 'site_error', 'fetch_failed'].includes(
      source.last_result || ''
    ) ||
    failCount > 0
  ) {
    return { label: 'Problem var', tone: 'danger' }
  }

  return { label: 'Nəticə yoxdur', tone: 'neutral' }
}

function getBotConfirmationToneClass(tone: string) {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-100 text-emerald-700'
  }

  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-100 text-amber-800'
  }

  if (tone === 'danger') {
    return 'border-red-200 bg-red-100 text-red-700'
  }

  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function getRepairSuggestion(source: Source, metrics: SourceQualityMetrics) {
  const failCount = source.consecutive_fail_count || 0

  if (failCount >= 5) {
    return 'Fail sayı yüksəkdir. Bərpa/test tövsiyə olunur.'
  }

  if (
    source.last_success_at &&
    metrics.loaded &&
    metrics.items7d === 0 &&
    metrics.matches7d === 0
  ) {
    return 'Son 7 gündə nəticə yoxdur. RSS və ya selector yoxlanmalıdır.'
  }

  if (source.monitor_method === 'selector' && (source.rss_url || '').trim()) {
    return 'Bu mənbədə RSS görünür. RSS metodu daha stabil ola bilər.'
  }

  if (source.last_result === 'no_candidate') {
    return 'Bot uyğun xəbər tapmayıb. Oxuma metodu yenidən yoxlanmalıdır.'
  }

  return 'Ciddi problem görünmür.'
}



function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [sourceQuality, setSourceQuality] = useState<Record<string, SourceQualityMetrics>>({})
  const [qualityLoading, setQualityLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [sourceView, setSourceView] = useState<'all' | 'healthy' | 'problem'>('all')
  const [bulkMethod, setBulkMethod] = useState('google_news_fallback')
  const [editing, setEditing] = useState<Source | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [newSourceInput, setNewSourceInput] = useState('')
  const [addingSource, setAddingSource] = useState(false)
  const [addSourceResult, setAddSourceResult] = useState<AddSourceResult | null>(null)
  const [recovering, setRecovering] = useState(false)
  const [repairRun, setRepairRun] = useState<RepairRunSummary | null>(null)
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [detailSource, setDetailSource] = useState<Source | null>(null)
  const [detailItems, setDetailItems] = useState<SourceDetailItem[]>([])
  const [detailMatches, setDetailMatches] = useState<SourceDetailMatch[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 25


  async function loadSourceQuality(nextSources: Source[]) {
    const sourceIds = nextSources.map((source) => source.id).filter(Boolean)
    const knownSourceIds = new Set(sourceIds)
    const initialQuality = new Map<string, SourceQualityMetrics>()

    for (const sourceId of sourceIds) {
      initialQuality.set(sourceId, { ...emptyQualityMetrics(), loaded: true })
    }

    if (sourceIds.length === 0) {
      setSourceQuality({})
      return
    }

    setQualityLoading(true)

    const since = new Date(Date.now() - SOURCE_QUALITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const sourceKeyIndex = new Map<string, string>()
    for (const source of nextSources) {
      for (const key of sourceLookupKeys(source)) {
        if (!sourceKeyIndex.has(key)) sourceKeyIndex.set(key, source.id)
      }
    }

    const { data: items, error: itemsError } = await supabase
      .from('monitored_items')
      .select('id,source_id,url,created_at')
      .gte('created_at', since)
      .limit(10000)

    if (itemsError) {
      console.warn('Source quality items query failed:', itemsError.message)
      setSourceQuality(Object.fromEntries(initialQuality))
      setQualityLoading(false)
      return
    }

    const itemToSource = new Map<string, string>()
    const matchToSource = new Map<string, string>()

    for (const item of items || []) {
      const sourceId = matchItemToSourceId(item, sourceKeyIndex, knownSourceIds)
      const itemId = String(item.id || '')

      if (!sourceId || !initialQuality.has(sourceId)) continue

      const metrics = initialQuality.get(sourceId) || {
        ...emptyQualityMetrics(),
        loaded: true,
      }
      metrics.items7d += 1

      const createdAt = item.created_at ? String(item.created_at) : null
      if (
        createdAt &&
        (!metrics.lastUsefulItem ||
          new Date(createdAt).getTime() >
            new Date(metrics.lastUsefulItem).getTime())
      ) {
        metrics.lastUsefulItem = createdAt
      }

      initialQuality.set(sourceId, metrics)

      if (itemId) {
        itemToSource.set(itemId, sourceId)
      }
    }

    let sentOffset = 0
    let includeSentNewsSourceId = true
    while (true) {
      const sentNewsSelect: string = includeSentNewsSourceId
        ? 'source_id,link,title,source,created_at'
        : 'link,title,source,created_at'
      const { data: sentNews, error: sentNewsError } = await supabase
        .from('sent_news')
        .select(sentNewsSelect)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .range(sentOffset, sentOffset + SOURCE_QUALITY_BATCH_SIZE - 1)

      if (sentNewsError) {
        if (
          includeSentNewsSourceId &&
          isMissingSentNewsSourceIdError(sentNewsError.message)
        ) {
          includeSentNewsSourceId = false
          sentOffset = 0
          continue
        }

        console.warn('Source quality sent_news query failed:', sentNewsError.message)
        break
      }

      const batch = (sentNews || []) as unknown as Array<{
        source_id?: string | null
        link?: string | null
        source?: string | null
        title?: string | null
        created_at?: string | null
      }>
      for (const row of batch) {
        const sourceId = matchSentNewsToSourceId(
          row,
          sourceKeyIndex,
          knownSourceIds
        )
        if (!sourceId) continue

        const metrics = initialQuality.get(sourceId) || {
          ...emptyQualityMetrics(),
          loaded: true,
        }
        metrics.sentNews7d += 1
        metrics.items7d = Math.max(metrics.items7d, metrics.sentNews7d)
        metrics.matches7d = Math.max(metrics.matches7d, metrics.sentNews7d)
        metrics.alerts7d = Math.max(metrics.alerts7d, metrics.sentNews7d)

        const createdAt = row.created_at ? String(row.created_at) : null
        if (
          createdAt &&
          (!metrics.lastUsefulItem ||
            new Date(createdAt).getTime() >
              new Date(metrics.lastUsefulItem).getTime())
        ) {
          metrics.lastUsefulItem = createdAt
        }

        initialQuality.set(sourceId, metrics)
      }

      if (batch.length < SOURCE_QUALITY_BATCH_SIZE) break
      sentOffset += SOURCE_QUALITY_BATCH_SIZE
    }

    const { data: resultMatches, error: resultMatchesError } = await supabase
      .from('monitor_matches')
      .select('id,item_id,created_at,monitored_items(source_id,url)')
      .gte('created_at', since)
      .limit(10000)

    if (resultMatchesError) {
      console.warn('Source quality result matches query failed:', resultMatchesError.message)
    } else {
      for (const match of resultMatches || []) {
        const item = Array.isArray(match.monitored_items)
          ? match.monitored_items[0]
          : match.monitored_items
        const sourceId =
          matchItemToSourceId(item || {}, sourceKeyIndex, knownSourceIds) ||
          itemToSource.get(String(match.item_id || ''))
        const matchId = String(match.id || '')
        if (!sourceId) continue

        const metrics = initialQuality.get(sourceId) || {
          ...emptyQualityMetrics(),
          loaded: true,
        }
        metrics.items7d = Math.max(metrics.items7d, 1)
        metrics.matches7d += 1

        const createdAt = match.created_at ? String(match.created_at) : null
        if (
          createdAt &&
          (!metrics.lastUsefulItem ||
            new Date(createdAt).getTime() >
              new Date(metrics.lastUsefulItem).getTime())
        ) {
          metrics.lastUsefulItem = createdAt
        }

        initialQuality.set(sourceId, metrics)
        if (matchId) matchToSource.set(matchId, sourceId)
      }
    }

    if (matchToSource.size > 0) {
      const { data: alerts, error: alertsError } = await supabase
        .from('monitor_alerts')
        .select('match_id,sent_at')
        .gte('sent_at', since)
        .limit(10000)

      if (alertsError) {
        console.warn('Source quality alerts query failed:', alertsError.message)
      } else {
        for (const alert of alerts || []) {
          const sourceId = matchToSource.get(String(alert.match_id || ''))
          if (!sourceId) continue

          const metrics = initialQuality.get(sourceId) || {
            ...emptyQualityMetrics(),
            loaded: true,
          }
          metrics.alerts7d += 1
          initialQuality.set(sourceId, metrics)
        }
      }
    }

    setSourceQuality(Object.fromEntries(initialQuality))
    setQualityLoading(false)
  }

  async function loadSourceDetails(source: Source) {
    setDetailSource(source)
    setDetailItems([])
    setDetailMatches([])
    setDetailError('')
    setDetailLoading(true)

    const { data: items, error: itemsError } = await supabase
      .from('monitored_items')
      .select('id,title,url,published_at,detected_at,created_at')
      .eq('source_id', source.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (itemsError) {
      setDetailError(`Son xəbərlər oxunmadı: ${itemsError.message}`)
      setDetailLoading(false)
      return
    }

    const nextItems = (items || []) as SourceDetailItem[]
    setDetailItems(nextItems)

    const itemIds = nextItems.map((item) => item.id).filter(Boolean)

    if (itemIds.length === 0) {
      setDetailMatches([])
      setDetailLoading(false)
      return
    }

    const { data: matches, error: matchesError } = await supabase
      .from('monitor_matches')
      .select('id,item_id,matched_keyword,created_at')
      .in('item_id', itemIds)
      .order('created_at', { ascending: false })
      .limit(10)

    if (matchesError) {
      setDetailError(`Uyğunluqlar oxunmadı: ${matchesError.message}`)
      setDetailMatches([])
    } else {
      setDetailMatches((matches || []) as SourceDetailMatch[])
    }

    setDetailLoading(false)
  }

  async function loadSources() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('sources')
      .select(
        'id,name,base_url,latest_url,rss_url,source_type,status,trust_level,monitor_method,selector,article_pattern,discovery_status,discovery_score,last_checked_at,last_success_at,last_article_found_at,last_error,last_result,consecutive_fail_count,last_discovered_at,notes'
      )
      .order('last_discovered_at', {
        ascending: false,
        nullsFirst: false,
      })

    if (error) {
      setMessage(`Mənbələr oxunmadı: ${error.message}`)
      setSources([])
    } else {
      const nextSources = data || []
      setSources(nextSources)
      await loadSourceQuality(nextSources)
    }

    setLoading(false)
  }



  async function addSourceByDomain() {
    const normalizedUrl = normalizeSourceUrl(newSourceInput)
    const host = getHostname(normalizedUrl)

    if (!normalizedUrl || !host) {
      setMessage('Düzgün domen və ya URL daxil edin. Məsələn: example.az')
      return
    }

    const duplicate = sources.find((source) => {
      const sourceHost = getHostname(source.base_url) || getHostname(source.latest_url)
      return sourceHost === host
    })

    if (duplicate) {
      setMessage(`${host} artıq mənbələr siyahısında var.`)
      setSearch(host)
      return
    }

    setAddingSource(true)
    setAddSourceResult(null)
    setMessage(`${host} yoxlanılır. Sistem RSS, sitemap və səhifə linklərini analiz edir...`)

    const sourceDraft: Source = {
      id: `new-${Date.now()}`,
      name: host,
      base_url: normalizedUrl,
      latest_url: normalizedUrl,
      rss_url: null,
      source_type: 'news_site',
      status: 'active',
      trust_level: 'medium',
      monitor_method: 'latest_page',
      selector: null,
      article_pattern: null,
      discovery_status: 'pending',
      discovery_score: 0,
      last_checked_at: null,
      last_success_at: null,
      last_article_found_at: null,
      last_error: null,
      last_result: null,
      consecutive_fail_count: 0,
      last_discovered_at: new Date().toISOString(),
      notes: null,
    }

    const { data: repair, error: repairError } =
      await supabase.functions.invoke<RepairResponse>('source-repair', {
        body: { source: sourceDraft },
      })

    if (repairError || !repair) {
      setAddingSource(false)
      setMessage(
        `Mənbə analiz olunmadı: ${repairError?.message || 'source-repair cavab vermədi'}`
      )
      return
    }

    const now = new Date().toISOString()
    const update = repair.update || {}
    const insertPayload = {
      name: host,
      base_url: normalizedUrl,
      latest_url: String(repair.finalUrl || normalizedUrl),
      rss_url: typeof update.rss_url === 'string' ? update.rss_url : null,
      source_type: 'news_site',
      status: repair.ok ? 'active' : 'inactive',
      trust_level: 'medium',
      monitor_method: repair.ok ? repair.method : 'failed',
      selector: typeof update.selector === 'string' ? update.selector : null,
      article_pattern:
        typeof update.article_pattern === 'string' ? update.article_pattern : null,
      discovery_status: repair.ok ? 'accepted' : 'needs_review',
      discovery_score: repair.ok ? Math.min(100, 60 + repair.candidateCount * 4) : 0,
      last_checked_at: now,
      last_success_at: repair.ok ? now : null,
      last_article_found_at: null,
      last_error: repair.ok ? null : repair.reason,
      last_result: repair.ok ? 'source_added' : 'source_review_required',
      consecutive_fail_count: repair.ok ? 0 : 1,
      last_discovered_at: now,
      notes: repair.ok
        ? `[manual_add] ${repair.method} metodu seçildi. ${repair.candidateCount} link tapıldı.`
        : `[manual_add] Avtomatik izləmə metodu tapılmadı: ${formatRepairReason(repair.reason)}`,
    }

    const { error: insertError } = await supabase.from('sources').insert(insertPayload)

    if (insertError) {
      setAddingSource(false)
      setMessage(`Mənbə əlavə olunmadı: ${insertError.message}`)
      return
    }

    setNewSourceInput('')
    setAddSourceResult({
      ok: repair.ok,
      method: repair.method,
      reason: formatRepairReason(repair.reason),
      candidateCount: repair.candidateCount,
      sampleLinks: repair.sampleLinks || [],
      sourceName: host,
    })
    setMessage(
      repair.ok
        ? `${host} əlavə olundu və ${repair.method} metodu ilə sağlam mənbələrə salındı.`
        : `${host} əlavə olundu, amma avtomatik izləmə metodu tapılmadı. Mənbə yoxlama tələb edir.`
    )
    setAddingSource(false)
    await loadSources()
  }

  async function deleteSource(source: Source) {
    const ok = window.confirm(
      `"${getSourceTitle(source)}" mənbəsini silmək istəyirsən? Bu əməliyyat geri qaytarılmır.`
    )

    if (!ok) return

    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', source.id)

    if (error) {
      alert('Silinmədi: ' + error.message)
      return
    }

    setSelectedIds((current) => current.filter((id) => id !== source.id))
    await loadSources()
  }

  async function deleteSelectedSources() {
    if (selectedIds.length === 0) {
      alert('Silinəcək mənbə seçilməyib.')
      return
    }

    const ok = window.confirm(
      `${selectedIds.length} mənbəni silmək istəyirsən? Bu əməliyyat geri qaytarılmır.`
    )

    if (!ok) return

    const { error } = await supabase
      .from('sources')
      .delete()
      .in('id', selectedIds)

    if (error) {
      alert('Seçilən mənbələr silinmədi: ' + error.message)
      return
    }

    setSelectedIds([])
    await loadSources()
  }

  async function bulkSetStatus(status: 'active' | 'inactive') {
    if (selectedIds.length === 0) {
      alert('Mənbə seçilməyib.')
      return
    }

    const { error } = await supabase
      .from('sources')
      .update({ status })
      .in('id', selectedIds)

    if (error) {
      alert('Status dəyişmədi: ' + error.message)
      return
    }

    setSelectedIds([])
    await loadSources()
  }

  async function bulkSetMethod() {
    if (selectedIds.length === 0) {
      alert('Metodu dəyişmək üçün mənbə seçilməyib.')
      return
    }

    const ok = window.confirm(
      `${selectedIds.length} mənbənin monitor metodu "${bulkMethod}" olacaq. Davam edəkNo`
    )

    if (!ok) return

    const { error } = await supabase
      .from('sources')
      .update({
        monitor_method: bulkMethod,
        status: 'active',
        notes: `Admin paneldən toplu metod dəyişildi: ${bulkMethod}`,
      })
      .in('id', selectedIds)

    if (error) {
      alert('Metod dəyişmədi: ' + error.message)
      return
    }

    setSelectedIds([])
    await loadSources()
  }

  async function deactivateSubdomains() {
    const subdomainIds = sources
      .filter((source) => source.status === 'active')
      .filter((source) => isSubdomain(source, sources))
      .map((source) => source.id)

    if (subdomainIds.length === 0) {
      alert('Aktiv subdomain tapılmadı.')
      return
    }

    const ok = window.confirm(
      `${subdomainIds.length} aktiv subdomain passiv ediləcək. Davam edəkNo`
    )

    if (!ok) return

    const { error } = await supabase
      .from('sources')
      .update({
        status: 'inactive',
        notes: 'Subdomain olduğu üçün admin paneldən passiv edildi',
      })
      .in('id', subdomainIds)

    if (error) {
      alert('Subdomainlər passiv edilmədi: ' + error.message)
      return
    }

    setSelectedIds([])
    await loadSources()
  }

  async function deactivateFailingSources() {
    const failingIds = sources
      .filter((source) => source.status === 'active')
      .filter((source) => (source.consecutive_fail_count || 0) >= 5)
      .map((source) => source.id)

    if (failingIds.length === 0) {
      alert('Fail limitini keçən aktiv mənbə tapılmadı.')
      return
    }

    const ok = window.confirm(
      `${failingIds.length} fail-limit mənbə passiv ediləcək. Davam edəkNo`
    )

    if (!ok) return

    const { error } = await supabase
      .from('sources')
      .update({
        status: 'inactive',
        notes: 'Fail limiti keçdiyi üçün admin paneldən passiv edildi',
      })
      .in('id', failingIds)

    if (error) {
      alert('Fail-limit mənbələr passiv edilmədi: ' + error.message)
      return
    }

    setSelectedIds([])
    await loadSources()
  }

  async function deactivateNonNewsSources() {
    const nonNewsIds = sources
      .filter((source) => source.status === 'active')
      .filter((source) => hasNonNewsSignal(source))
      .map((source) => source.id)

    if (nonNewsIds.length === 0) {
      alert('Qeyri-xəbər siqnalı olan aktiv mənbə tapılmadı.')
      return
    }

    const ok = window.confirm(
      `${nonNewsIds.length} qeyri-xəbər/inaktiv mənbə passiv ediləcək. Davam edəkNo`
    )

    if (!ok) return

    const { error } = await supabase
      .from('sources')
      .update({
        status: 'inactive',
        discovery_status: 'rejected',
        notes:
          'Qeyri-xəbər və ya yetərsiz aktivlik səbəbi ilə admin paneldən passiv edildi',
      })
      .in('id', nonNewsIds)

    if (error) {
      alert('Qeyri-xəbər mənbələr passiv edilmədi: ' + error.message)
      return
    }

    setSelectedIds([])
    await loadSources()
  }

  async function runAutoRepair(source: Source) {
    const sourceName = getSourceTitle(source)
    const { data: repair, error: repairError } =
      await supabase.functions.invoke<RepairResponse>('source-repair', {
        body: { source },
      })

    if (repairError || !repair) {
      return {
        sourceId: source.id,
        sourceName,
        ok: false,
        message: formatRepairReason(repairError?.message || 'source-repair cavab vermədi'),
        reason: formatRepairReason(repairError?.message || 'source-repair cavab vermədi'),
      }
    }

    if (!repair.ok && isHealthySource(source, sourceQuality[source.id])) {
      return {
        sourceId: source.id,
        sourceName,
        ok: false,
        method: repair.method,
        reason: formatRepairReason(repair.reason),
        candidateCount: repair.candidateCount,
        message: `${getSourceTitle(source)} real bildiri\u015f tarix\u00e7\u0259sin\u0259 g\u00f6r\u0259 sa\u011flam saxlan\u0131ld\u0131. U\u011fursuz manual b\u0259rpa testi m\u0259nb\u0259nin statusunu d\u0259yi\u015fm\u0259di.`,
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('sources')
      .update(repair.update)
      .eq('id', source.id)
      .select('id')

    if (updateError || !updated || updated.length === 0) {
      return {
        sourceId: source.id,
        sourceName,
        ok: false,
        message: formatRepairReason(updateError?.message || 'Supabase mənbəni yeniləmədi'),
        method: repair.method,
        reason: formatRepairReason(updateError?.message || 'Supabase mənbəni yeniləmədi'),
        candidateCount: repair.candidateCount,
      }
    }

    return {
      sourceId: source.id,
      sourceName,
      ok: repair.ok,
      method: repair.method,
      reason: formatRepairReason(repair.reason),
      candidateCount: repair.candidateCount,
      message: repair.ok
        ? `${getSourceTitle(source)} oxuna bilir: ${repair.method}, ${repair.candidateCount} link tapıldı. Bot təsdiqi gözlənilir.`
        : `${getSourceTitle(source)} bərpa olunmadı: ${formatRepairReason(repair.reason)}`,
    }
  }

  async function autoRecoverProblemSources() {
    if (selectedIds.length === 0) {
      alert('Bərpa ediləcək mənbələri seçin.')
      return
    }

    const selectedSourceSet = new Set(selectedIds)
    const selectedSources = sources.filter((source) => selectedSourceSet.has(source.id))
    const sourcesToRepair = selectedSources.filter((source) =>
      isProblemSource(source, sourceQuality[source.id])
    )

    if (selectedSources.length === 0) {
      alert('Seçilmiş mənbə siyahıda tapılmadı. Səhifəni yeniləyib yenidən seçin.')
      return
    }

    if (sourcesToRepair.length === 0) {
      alert('Seçilmiş mənbələr artıq sağlam görünür. İşləməyən mənbələrdən seçim edin.')
      return
    }

    const skippedCount = selectedSources.length - sourcesToRepair.length
    const ok = window.confirm(
      `${sourcesToRepair.length} seçilmiş mənbə real oxuma testi ilə yenidən yoxlanacaq${
        skippedCount > 0 ? `; ${skippedCount} artıq sağlam göründüyü üçün ötürüləcək` : ''
      }. Davam edək?`
    )

    if (!ok) return

    setRecovering(true)
    setMessage(
      `${sourcesToRepair.length} seçilmiş mənbə üçün oxuma üsulu yenidən yoxlanır...`
    )
    setRepairRun(null)

    let readable = 0
    let failed = 0
    const methodCounts: Record<string, number> = {}
    const reasonCounts: Record<string, number> = {}
    const items: RepairRunItem[] = []

    for (const source of sourcesToRepair) {
      const result = await runAutoRepair(source)
      if (result.ok) readable += 1
      else failed += 1

      const method = result.method || 'unknown'
      const reason = formatRepairReason(result.reason || result.message || 'Naməlum səbəb')

      if (result.ok) {
        methodCounts[method] = (methodCounts[method] || 0) + 1
      } else {
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
      }

      items.push({
        sourceId: result.sourceId,
        sourceName: result.sourceName,
        ok: result.ok,
        method: result.method,
        reason,
        candidateCount: result.candidateCount,
      })
    }

    setRecovering(false)
    setSelectedIds([])
    await loadSources()
    setRepairRun({
      attempted: sourcesToRepair.length,
      fixed: readable,
      failed,
      methodCounts,
      reasonCounts,
      items,
    })
    setMessage(
      `Seçilmiş mənbələrin bərpa yoxlaması bitdi: ${readable} mənbə oxuna bilir, ${failed} mənbə hələ oxunmadı. Sağlam statusu bot real nəticə verdikdən sonra təsdiqlənəcək.`
    )
  }

  async function toggleStatus(source: Source) {
    const nextStatus = source.status === 'active' ? 'inactive' : 'active'

    const { error } = await supabase
      .from('sources')
      .update({ status: nextStatus })
      .eq('id', source.id)

    if (error) {
      alert('Status dəyişmədi: ' + error.message)
      return
    }

    await loadSources()
  }

  async function saveEdit() {
    if (!editing) return

    const { error } = await supabase
      .from('sources')
      .update({
        name: editing.name?.trim() || getSourceTitle(editing),
        base_url: editing.base_url,
        latest_url: editing.latest_url || null,
        rss_url: editing.rss_url || null,
        monitor_method: editing.monitor_method || 'latest_page',
        selector: editing.selector || null,
        article_pattern: editing.article_pattern || null,
      })
      .eq('id', editing.id)

    if (error) {
      alert('Yadda saxlanmadı: ' + error.message)
      return
    }

    setEditing(null)
    await loadSources()
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  function applySelectorTemplate(
    template: (typeof SELECTOR_TEMPLATES)[number]
  ) {
    if (!editing) return

    setEditing({
      ...editing,
      monitor_method: template.method,
      selector: template.selector || editing.selector,
      article_pattern: template.articlePattern,
      discovery_status: 'needs_review',
    })
  }

  const filteredSources = useMemo(() => {
    const q = search.toLowerCase().trim()

    return sources.filter((source) => {
      const matchesSearch =
        !q ||
        source.name.toLowerCase().includes(q) ||
        source.base_url.toLowerCase().includes(q) ||
        (source.latest_url || '').toLowerCase().includes(q) ||
        (source.rss_url || '').toLowerCase().includes(q) ||
        (source.selector || '').toLowerCase().includes(q) ||
        (source.article_pattern || '').toLowerCase().includes(q) ||
        (source.status || '').toLowerCase().includes(q) ||
        (source.monitor_method || '').toLowerCase().includes(q) ||
        (source.discovery_status || '').toLowerCase().includes(q) ||
        (source.notes || '').toLowerCase().includes(q)

      const matchesMethod = matchesMonitorMethodFilter(
        source.monitor_method,
        methodFilter
      )

      const qualityMetrics = sourceQuality[source.id]
      const matchesSourceView =
        sourceView === 'all' ||
        (sourceView === 'healthy' && isHealthySource(source, qualityMetrics)) ||
        (sourceView === 'problem' && isProblemSource(source, qualityMetrics))

      return (
        matchesSourceView &&
        matchesSearch &&
        matchesMethod
      )
    })
  }, [
    sources,
    sourceQuality,
    search,
    methodFilter,
    sourceView,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredSources.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginatedSources = filteredSources.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  )

  function resetFilteredView() {
    setSelectedIds([])
    setPage(1)
  }

  function toggleSelectAll() {
    const filteredIds = filteredSources.map((item) => item.id)
    const allSelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !filteredIds.includes(id))
      )
    } else {
      setSelectedIds(filteredIds)
    }
  }

  const stats = useMemo(() => {
    return {
      total: sources.length,
      active: sources.filter((item) => item.status === 'active').length,
      healthy: sources.filter((item) => isHealthySource(item, sourceQuality[item.id]))
        .length,
      problems: sources.filter((item) => isProblemSource(item, sourceQuality[item.id])).length,
    }
  }, [sources, sourceQuality])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSources()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className='flex min-h-[320px] items-center justify-center p-6 text-sm text-muted-foreground'>
        Mənbələr yüklənir...
      </div>
    )
  }

  const detailHealth = detailSource
    ? getSourceHealth(detailSource, sources)
    : null
  const detailQuality =
    detailSource && detailHealth
      ? getSourceQualityLabel(
          detailSource,
          sourceQuality[detailSource.id],
          detailHealth
        )
      : null
  const detailQualityMetrics = detailSource
    ? sourceQuality[detailSource.id] || emptyQualityMetrics()
    : emptyQualityMetrics()
  const detailBotConfirmation = detailSource
    ? getBotConfirmationLabel(detailSource, detailQualityMetrics)
    : null
  const detailItemById = new Map(detailItems.map((item) => [item.id, item]))

  function applySourcePreset({
    view = 'all',
    method = 'all',
  }: {
    view?: 'all' | 'healthy' | 'problem'
    method?: string
  }) {
    setSourceView(view)
    setMethodFilter(method)
    setSearch('')
    resetFilteredView()
  }

  const sourceViewTabs = [
    { key: 'all', label: 'Bütün mənbələr', count: stats.total },
    { key: 'healthy', label: 'Sağlam mənbələr', count: stats.healthy },
    { key: 'problem', label: 'İşləməyən mənbələr', count: stats.problems },
  ] as const

  return (
    <div className='grid max-w-full gap-4 overflow-hidden p-4 md:p-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Mənbələr</h1>
        <p className='text-muted-foreground'>
          Aşkarlama botunun tapdığı və monitor tərəfindən izlənən saytlar
        </p>
      </div>

      {message ? (
        <div className='rounded-xl border bg-card p-4 text-sm text-orange-600'>
          {message}
        </div>
      ) : null}


      <section className='grid gap-3 rounded-xl border bg-card p-4 shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h2 className='text-base font-semibold'>Yeni mənbə əlavə et</h2>
            <p className='text-sm text-muted-foreground'>
              Domen və ya URL daxil edin. Sistem RSS, sitemap və səhifə linklərini yoxlayıb ən uyğun izləmə metodunu seçəcək.
            </p>
          </div>
          <span className='rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700'>
            Avtomatik analiz
          </span>
        </div>

        <div className='grid gap-2 md:grid-cols-[minmax(220px,1fr)_auto]'>
          <input
            value={newSourceInput}
            onChange={(event) => setNewSourceInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !addingSource) {
                event.preventDefault()
                void addSourceByDomain()
              }
            }}
            placeholder='Məsələn: apa.az və ya https://apa.az'
            className='min-w-0 rounded-lg border bg-background px-3 py-2'
          />
          <button
            type='button'
            onClick={() => void addSourceByDomain()}
            disabled={addingSource}
            className='rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60'
          >
            {addingSource ? 'Yoxlanılır...' : 'Mənbəni yoxla və əlavə et'}
          </button>
        </div>

        {addSourceResult ? (
          <div
            className={`rounded-lg border p-3 text-sm ${
              addSourceResult.ok
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            <div className='font-medium'>
              {addSourceResult.sourceName} · {addSourceResult.ok ? 'Sağlam mənbə' : 'Yoxlama tələb edir'}
            </div>
            <div className='mt-1'>
              Metod: {addSourceResult.method} · Link sayı: {addSourceResult.candidateCount}
            </div>
            {addSourceResult.sampleLinks.length > 0 ? (
              <div className='mt-2 grid gap-1 text-xs'>
                {addSourceResult.sampleLinks.slice(0, 3).map((link) => (
                  <a key={link} href={link} target='_blank' rel='noreferrer' className='line-clamp-1 underline'>
                    {link}
                  </a>
                ))}
              </div>
            ) : (
              <div className='mt-1 text-xs'>{addSourceResult.reason}</div>
            )}
          </div>
        ) : null}
      </section>

      <div className='flex flex-wrap gap-2 rounded-xl border bg-card p-3'>
        {sourceViewTabs.map((tab) => (
          <button
            key={tab.key}
            type='button'
            onClick={() => {
              applySourcePreset({ view: tab.key })
            }}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              sourceView === tab.key && methodFilter === 'all'
                ? tab.key === 'healthy'
                  ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                  : tab.key === 'problem'
                    ? 'border-amber-200 bg-amber-100 text-amber-800'
                      : 'border-sky-200 bg-sky-100 text-sky-800'
                : 'bg-background hover:bg-muted'
            }`}
          >
            {tab.label} <span className='ml-2 font-bold'>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className='grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[minmax(260px,1fr)_240px]'>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            resetFilteredView()
          }}
          placeholder='Mənbə adı, domen və ya metod üzrə axtar...'
          className='min-w-0 rounded-lg border bg-background px-3 py-2'
        />

        <select
          value={methodFilter}
          onChange={(e) => {
            setMethodFilter(e.target.value)
            resetFilteredView()
          }}
          className='min-w-0 rounded-lg border bg-background px-3 py-2'
        >
          <option value='all'>Bütün metodlar</option>
          {METHOD_FILTER_OPTIONS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </div>

      <div className='grid gap-3 rounded-xl border bg-card p-4 xl:grid-cols-[auto_1fr] xl:items-start'>
        <div className='text-sm text-muted-foreground'>
          Ümumi: <b>{sources.length}</b> | Göstərilən:{' '}
          <b>{filteredSources.length}</b> | Seçilən: <b>{selectedIds.length}</b>
        </div>

        <div className='flex min-w-0 flex-wrap gap-2 xl:justify-end'>
          <button
            onClick={() => bulkSetStatus('active')}
            disabled={selectedIds.length === 0}
            className='rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
          >
            Seçilənləri aktiv et
          </button>

          <button
            onClick={() => bulkSetStatus('inactive')}
            disabled={selectedIds.length === 0}
            className='rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
          >
            Seçilənləri passiv et
          </button>

          <div className='flex flex-col gap-1'>
            <button
              onClick={autoRecoverProblemSources}
              disabled={recovering || selectedIds.length === 0}
              className='rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50'
            >
              Seçilmişləri bərpa et
            </button>
            <span className='max-w-md text-xs text-muted-foreground'>
              Yalnız seçilmiş işləməyən mənbələr real oxuma testi ilə yoxlanır. Bot qəbul edilən xəbər linki tapmasa mənbə sağlam yazılmır.
            </span>
          </div>

          <details className='relative'>
            <summary className='cursor-pointer list-none rounded-md border px-3 py-2 text-sm hover:bg-muted'>
              Toplu əməliyyatlar
            </summary>

            <div className='absolute right-0 z-30 mt-2 grid w-72 gap-2 rounded-xl border bg-background p-3 shadow-lg'>
              <select
                value={bulkMethod}
                onChange={(e) => setBulkMethod(e.target.value)}
                className='min-w-0 rounded-md border bg-background px-3 py-2 text-sm'
              >
                {MONITOR_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {formatMonitorMethod(method)}
                  </option>
                ))}
              </select>

              <button
                onClick={bulkSetMethod}
                disabled={selectedIds.length === 0}
                className='rounded-md border px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
              >
                Metodu tətbiq et
              </button>

              <button
                onClick={deactivateSubdomains}
                className='rounded-md border px-3 py-2 text-left text-sm text-orange-600 hover:bg-orange-50'
              >
                Subdomainləri passiv et
              </button>

              <button
                onClick={deactivateFailingSources}
                className='rounded-md border px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50'
              >
                Fail limitini passiv et
              </button>

              <button
                onClick={deactivateNonNewsSources}
                className='rounded-md border px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50'
              >
                Qeyri-xəbərləri passiv et
              </button>

              <button
                onClick={deleteSelectedSources}
                disabled={selectedIds.length === 0}
                className='rounded-md border px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                Seçilənləri sil
              </button>
            </div>
          </details>
        </div>
      </div>

      {repairRun ? (
        <div className='grid gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <h2 className='text-base font-semibold'>Son bərpa yoxlaması</h2>
              <p className='text-sm text-muted-foreground'>
                Bu nəticə mənbənin oxuna bilib-bilmədiyini göstərir. Sağlam statusu bot real nəticə verdikdən sonra təsdiqlənir.
              </p>
            </div>
            <button
              type='button'
              onClick={() => setRepairRun(null)}
              className='rounded-md border bg-background px-3 py-2 text-xs hover:bg-muted'
            >
              Bağla
            </button>
          </div>

          <div className='grid gap-3 sm:grid-cols-3'>
            <div className='rounded-lg border bg-background p-3'>
              <div className='text-xs text-muted-foreground'>Yoxlandı</div>
              <div className='text-2xl font-bold'>{repairRun.attempted}</div>
            </div>
            <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3'>
              <div className='text-xs text-emerald-700'>Oxuna bilir</div>
              <div className='text-2xl font-bold text-emerald-700'>
                {repairRun.fixed}
              </div>
            </div>
            <div className='rounded-lg border border-red-200 bg-red-50 p-3'>
              <div className='text-xs text-red-700'>Düzəlmədi</div>
              <div className='text-2xl font-bold text-red-700'>
                {repairRun.failed}
              </div>
            </div>
          </div>

          <div className='grid gap-3 lg:grid-cols-2'>
            <div className='rounded-lg border bg-background p-3'>
              <div className='mb-2 text-sm font-medium'>Oxuna bilən metodlar</div>
              {Object.entries(repairRun.methodCounts).length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {Object.entries(repairRun.methodCounts).map(
                    ([method, count]) => (
                      <span
                        key={formatMonitorMethod(method)}
                        className='rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700'
                      >
                        {formatMonitorMethod(method)}: {count}
                      </span>
                    )
                  )}
                </div>
              ) : (
                <div className='text-sm text-muted-foreground'>
                  Oxuna bilən metod tapılmadı.
                </div>
              )}
            </div>

            <div className='rounded-lg border bg-background p-3'>
              <div className='mb-2 text-sm font-medium'>Əsas səbəblər</div>
              {Object.entries(repairRun.reasonCounts).length > 0 ? (
                <div className='grid gap-1'>
                  {Object.entries(repairRun.reasonCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([reason, count]) => (
                      <div
                        key={reason}
                        className='flex gap-2 text-xs text-muted-foreground'
                      >
                        <span className='font-medium text-foreground'>
                          {count}
                        </span>
                        <span className='line-clamp-1'>{reason}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className='text-sm text-muted-foreground'>
                  Uğursuz səbəb yoxdur.
                </div>
              )}
            </div>
          </div>

          <details className='rounded-lg border bg-background p-3'>
            <summary className='cursor-pointer text-sm font-medium'>
              Mənbələr üzrə nəticələr
            </summary>
            <div className='mt-3 grid max-h-80 gap-2 overflow-auto pr-1'>
              {repairRun.items.map((item) => (
                <div
                  key={item.sourceId}
                  className='grid gap-2 rounded-lg border p-3 text-sm md:grid-cols-[minmax(180px,1fr)_auto_minmax(220px,1.2fr)] md:items-center'
                >
                  <div className='min-w-0'>
                    <div className='line-clamp-1 font-medium'>
                      {item.sourceName}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {item.candidateCount ?? 0} link
                    </div>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-2 py-1 text-xs ${
                      item.ok
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {item.ok ? 'Oxuna bilir' : 'Oxunmadı'}
                    {item.ok && item.method ? ` · ${item.method}` : ''}
                  </span>
                  <div className='line-clamp-2 text-xs text-muted-foreground'>
                    {item.reason}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : null}

      <div className='rounded-xl border bg-card shadow-sm'>
        <table className='w-full table-fixed text-sm [&_td:nth-child(13)]:hidden [&_td:nth-child(12)]:hidden [&_td:nth-child(7)]:hidden [&_td:nth-child(6)]:hidden [&_td:nth-child(4)]:hidden [&_th:nth-child(13)]:hidden [&_th:nth-child(12)]:hidden [&_th:nth-child(7)]:hidden [&_th:nth-child(6)]:hidden [&_th:nth-child(4)]:hidden'>
          <thead className='bg-muted/50'>
            <tr>
              <th className='w-10 p-3 text-left'>
                <input
                  type='checkbox'
                  checked={
                    filteredSources.length > 0 &&
                    filteredSources.every((source) =>
                      selectedIds.includes(source.id)
                    )
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th className='w-12 p-3 text-left'>No</th>
              <th className='w-[28%] p-3 text-left'>Mənbə</th>
              <th className='w-24 p-3 text-left'>Status</th>
              <th className='w-28 p-3 text-left'>Metod</th>
              <th className='p-3 text-left'>Aşkarlama</th>
              <th className='p-3 text-left'>Bal</th>
              <th className='w-[16%] p-3 text-left'>Səbəb</th>
              <th className='w-32 p-3 text-left'>Bot nəticəsi</th>
              <th className='w-16 p-3 text-left'>Fail</th>
              <th className='w-32 p-3 text-left'>Son yoxlama</th>
              <th className='p-3 text-left'>Son uğur</th>
              <th className='p-3 text-left'>Qeyd</th>
              <th className='w-28 p-3 text-right'>İş</th>
            </tr>
          </thead>

          <tbody>
            {paginatedSources.map((source, index) => {
              const issues = getSimpleProblemReasons(source, sources)
              const isFailing = (source.consecutive_fail_count || 0) >= 5
              const isNonNews = hasNonNewsSignal(source)
              const health = getSourceHealth(source, sources)
              const quality = getSourceQualityLabel(
                source,
                sourceQuality[source.id],
                health
              )
              const qualityMetrics =
                sourceQuality[source.id] || emptyQualityMetrics()
              const botConfirmation = getBotConfirmationLabel(
                source,
                qualityMetrics
              )

              return (
                <tr
                  key={source.id}
                  className={`border-t hover:bg-muted/30 ${
                    health === 'ok'
                      ? 'bg-emerald-50/45'
                      : health === 'warning'
                        ? 'bg-amber-50/60'
                        : isFailing
                          ? 'bg-red-50/60'
                          : isNonNews
                            ? 'bg-red-50/60'
                            : 'bg-red-50/50'
                  }`}
                >
                  <td className='p-3'>
                    <input
                      type='checkbox'
                      checked={selectedIds.includes(source.id)}
                      onChange={() => toggleSelect(source.id)}
                    />
                  </td>

                  <td className='p-3 text-muted-foreground'>
                    {(safePage - 1) * pageSize + index + 1}
                  </td>

                  <td className='p-3 align-top'>
                    <div className='line-clamp-1 font-medium'>
                      {getSourceTitle(source)}
                    </div>
                    <div className='line-clamp-1 text-xs text-muted-foreground'>
                      {source.base_url}
                    </div>
                    <div className='mt-2 flex min-w-0 flex-wrap items-center gap-1 text-[11px]'>
                      <span
                        className={`inline-flex rounded-full border px-1.5 py-0.5 ${
                          health === 'ok'
                            ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                            : health === 'warning'
                              ? 'border-amber-200 bg-amber-100 text-amber-700'
                              : 'border-red-200 bg-red-100 text-red-700'
                        }`}
                      >
                        {getSourceHealthLabel(source, sources)}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-1.5 py-0.5 font-medium ${getQualityToneClass(
                            quality.tone
                          )}`}
                      >
                        {quality.label}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-1.5 py-0.5 font-medium ${getBotConfirmationToneClass(
                          botConfirmation.tone
                        )}`}
                      >
                        {botConfirmation.label}
                      </span>
                    </div>
                    <div className='mt-1 truncate text-[11px] text-muted-foreground'>
                      {qualityLoading && !qualityMetrics.loaded
                        ? 'yüklənir'
                        : `30g: ${qualityMetrics.items7d} xəbər · ${qualityMetrics.matches7d} uyğun nəticə · ${Math.max(qualityMetrics.alerts7d, qualityMetrics.sentNews7d)} bildiriş`}
                    </div>
                    <div className='truncate text-[11px] text-muted-foreground'>
                      {quality.reason}
                      {qualityMetrics.lastUsefulItem
                        ? ` · son: ${formatDate(qualityMetrics.lastUsefulItem)}`
                        : ''}
                    </div>
                    {isSubdomain(source, sources) ? (
                      <div className='mt-1 text-xs text-orange-600'>
                        subdomain: {findParentDomain(source, sources)}
                      </div>
                    ) : null}
                  </td>

                  <td className='p-3'>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs ${
                        source.status === 'active'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      {formatStatus(source.status)}
                    </span>
                  </td>

                  <td className='p-3'>
                    <span className='rounded-full border px-2 py-1 text-xs'>
                      {formatMonitorMethod(source.monitor_method || 'auto')}
                    </span>
                  </td>

                  <td className='p-3'>
                    <span className='rounded-full border px-2 py-1 text-xs'>
                      {formatDiscoveryStatus(source.discovery_status)}
                    </span>
                  </td>

                  <td className='p-3'>{source.discovery_score ?? '-'}</td>

                  <td className='p-3 align-top'>
                    {issues.length > 0 ? (
                      <div className='flex flex-wrap gap-1'>
                        {issues.map((issue) => (
                          <span
                            key={issue}
                            className='rounded-full border border-orange-200 px-1.5 py-0.5 text-[11px] text-orange-700'
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className='text-xs text-muted-foreground'>-</span>
                    )}
                  </td>

                  <td className='p-3'>
                    <div className='grid gap-1'>
                      <span
                        className={`w-fit rounded-full border px-2 py-1 text-xs ${
                          source.last_result === 'site_error'
                            ? 'border-red-200 text-red-700'
                            : source.last_result === 'sent'
                              ? 'border-green-200 text-green-700'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {formatResult(source.last_result)}
                      </span>
                      {source.last_error ? (
                        <span className='line-clamp-1 text-xs text-red-600'>
                          {source.last_error}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className='p-3'>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs ${
                        (source.consecutive_fail_count || 0) >= 5
                          ? 'border-red-200 text-red-700'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {source.consecutive_fail_count || 0}
                    </span>
                  </td>

                  <td className='p-3'>{formatDate(source.last_checked_at)}</td>

                  <td className='p-3'>{formatDate(source.last_success_at)}</td>

                  <td className='max-w-xs p-3'>
                    <div className='line-clamp-2 text-xs text-muted-foreground'>
                      {source.notes || '-'}
                    </div>
                  </td>

                  <td className='p-3 text-right'>
                    <div className='relative inline-block text-left'>
                      <button
                        type='button'
                        onClick={() =>
                          setOpenActionId((current) =>
                            current === source.id ? null : source.id
                          )
                        }
                        className='rounded-md border px-3 py-1 text-xs hover:bg-muted'
                      >
                        Əməliyyat
                      </button>

                      {openActionId === source.id ? (
                        <div className='absolute right-0 z-20 mt-2 grid min-w-40 gap-1 rounded-lg border bg-background p-2 text-left shadow-lg'>
                          <button
                            type='button'
                            onClick={() => {
                              setOpenActionId(null)
                              void loadSourceDetails(source)
                            }}
                            className='rounded-md px-3 py-2 text-left text-xs hover:bg-muted'
                          >
                            Detallar
                          </button>

                          <a
                            href={source.latest_url || source.base_url}
                            target='_blank'
                            rel='noreferrer'
                            onClick={() => setOpenActionId(null)}
                            className='rounded-md px-3 py-2 text-xs hover:bg-muted'
                          >
                            Aç
                          </a>

                          <button
                            type='button'
                            onClick={() => {
                              setEditing(source)
                              setOpenActionId(null)
                            }}
                            className='rounded-md px-3 py-2 text-left text-xs hover:bg-muted'
                          >
                            Redaktə et
                          </button>

                          <a
                            href={getSelectorPickerUrl(source.id)}
                            onClick={() => setOpenActionId(null)}
                            className='rounded-md px-3 py-2 text-xs hover:bg-muted'
                          >
                            Selector seç
                          </a>

                          <button
                            type='button'
                            onClick={() => {
                              setOpenActionId(null)
                              void toggleStatus(source)
                            }}
                            className={`rounded-md px-3 py-2 text-left text-xs ${
                              source.status === 'active'
                                ? 'text-red-700 hover:bg-red-50'
                                : 'text-green-700 hover:bg-green-50'
                            }`}
                          >
                            {source.status === 'active'
                              ? 'Passiv et'
                              : 'Aktiv et'}
                          </button>

                          <button
                            type='button'
                            onClick={() => {
                              setOpenActionId(null)
                              void deleteSource(source)
                            }}
                            className='rounded-md px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50'
                          >
                            Sil
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}

            {filteredSources.length === 0 && (
              <tr>
                <td
                  colSpan={14}
                  className='p-10 text-center text-muted-foreground'
                >
                  Mənbə tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4'>
        <div className='text-sm text-muted-foreground'>
          Səhifə <b>{safePage}</b> / <b>{totalPages}</b> · Hər səhifədə{' '}
          <b>{pageSize}</b> mənbə
        </div>

        <div className='flex gap-2'>
          <button
            type='button'
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage <= 1}
            className='rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
          >
            Əvvəlki
          </button>
          <button
            type='button'
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={safePage >= totalPages}
            className='rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
          >
            Növbəti
          </button>
        </div>
      </div>

      {detailSource && detailQuality && detailHealth ? (
        <div className='fixed inset-0 z-50 flex justify-end bg-black/40'>
          <button
            type='button'
            aria-label='Detalları bağla'
            className='absolute inset-0 cursor-default'
            onClick={() => setDetailSource(null)}
          />

          <aside className='relative z-10 h-full w-full max-w-3xl overflow-y-auto border-l bg-background shadow-xl'>
            <div className='sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-background/95 p-5 backdrop-blur'>
              <div className='min-w-0'>
                <h2 className='line-clamp-1 text-2xl font-bold'>
                  {getSourceTitle(detailSource)}
                </h2>
                <a
                  href={detailSource.base_url}
                  target='_blank'
                  rel='noreferrer'
                  className='block truncate text-sm text-muted-foreground hover:text-primary'
                >
                  {detailSource.base_url}
                </a>
              </div>

              <button
                type='button'
                onClick={() => setDetailSource(null)}
                className='rounded-md border px-3 py-2 text-sm hover:bg-muted'
              >
                Bağla
              </button>
            </div>

            <div className='grid gap-4 p-5'>
              {detailError ? (
                <div className='rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700'>
                  {detailError}
                </div>
              ) : null}

              <section className='rounded-xl border bg-card p-4'>
                <h3 className='font-semibold'>Əsas məlumatlar</h3>
                <div className='mt-3 grid gap-3 text-sm md:grid-cols-2'>
                  <div>
                    <div className='text-xs text-muted-foreground'>Ad</div>
                    <div className='truncate font-medium'>
                      {emptyValue(detailSource.name)}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Status</div>
                    <div className='font-medium'>
                      {formatStatus(detailSource.status)}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Latest URL</div>
                    <div className='truncate font-medium'>
                      {emptyValue(detailSource.latest_url)}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Metod</div>
                    <div className='font-medium'>
                      {formatMonitorMethod(detailSource.monitor_method)}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Mənbə tipi</div>
                    <div className='font-medium'>
                      {formatSourceType(detailSource.source_type)}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>
                      Etibar səviyyəsi
                    </div>
                    <div className='font-medium'>
                      {formatTrustLevel(detailSource.trust_level)}
                    </div>
                  </div>
                </div>
              </section>

              <section className='rounded-xl border bg-card p-4'>
                <h3 className='font-semibold'>Sağlamlıq</h3>
                <div className='mt-3 grid gap-3 text-sm md:grid-cols-3'>
                  <div>
                    <div className='text-xs text-muted-foreground'>Son yoxlama</div>
                    <div className='font-medium'>
                      {formatDate(detailSource.last_checked_at)}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Son uğur</div>
                    <div className='font-medium'>
                      {formatDate(detailSource.last_success_at)}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Son xəbər</div>
                    <div className='font-medium'>
                      {formatDate(detailSource.last_article_found_at)}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Son vəziyyət</div>
                    <div className='font-medium'>
                      {formatResult(detailSource.last_result)}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Fail sayı</div>
                    <div className='font-medium'>
                      {detailSource.consecutive_fail_count || 0}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Sağlamlıq</div>
                    <div className='font-medium'>
                      {getSourceHealthLabel(detailSource, sources)}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>
                      Bot təsdiqi
                    </div>
                    <div>
                      {detailBotConfirmation ? (
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getBotConfirmationToneClass(
                            detailBotConfirmation.tone
                          )}`}
                        >
                          {detailBotConfirmation.label}
                        </span>
                      ) : (
                        <span className='font-medium'>—</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className='mt-3 text-sm'>
                  <div className='text-xs text-muted-foreground'>Son xəta</div>
                  <div className='line-clamp-3 font-medium'>
                    {formatLastError(detailSource)}
                  </div>
                </div>
              </section>

              <section className='rounded-xl border bg-card p-4'>
                <h3 className='font-semibold'>Keyfiyyət</h3>
                <div className='mt-3 flex flex-wrap items-center gap-2 text-sm'>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${getQualityToneClass(
                      detailQuality.tone
                    )}`}
                  >
                    {detailQuality.label}
                  </span>
                  <span className='text-muted-foreground'>
                    {detailQuality.reason}
                  </span>
                </div>
                <div className='mt-3 grid gap-3 text-sm md:grid-cols-3'>
                  <div>
                    <div className='text-xs text-muted-foreground'>
                      Son 7 gündə xəbərlər
                    </div>
                    <div className='font-medium'>
                      {detailQualityMetrics.items7d}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>
                      Son 7 gündə uyğunluqlar
                    </div>
                    <div className='font-medium'>
                      {detailQualityMetrics.matches7d}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>
                      Son faydalı xəbər
                    </div>
                    <div className='font-medium'>
                      {formatDate(detailQualityMetrics.lastUsefulItem)}
                    </div>
                  </div>
                </div>
              </section>

              <section className='rounded-xl border bg-card p-4'>
                <h3 className='font-semibold'>Son xəbərlər</h3>
                <div className='mt-3 grid gap-2'>
                  {detailLoading ? (
                    <div className='text-sm text-muted-foreground'>Məlumat yüklənir...</div>
                  ) : detailItems.length === 0 ? (
                    <div className='text-sm text-muted-foreground'>
                      Son xəbər yoxdur.
                    </div>
                  ) : (
                    detailItems.map((item) => (
                      <a
                        key={item.id}
                        href={item.url || '#'}
                        target='_blank'
                        rel='noreferrer'
                        className='rounded-lg border p-3 text-sm hover:bg-muted'
                      >
                        <div className='line-clamp-2 font-medium'>
                          {item.title || 'Başlıq yoxdur'}
                        </div>
                        <div className='mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground'>
                          <span>
                            {formatDate(
                              item.published_at ||
                                item.detected_at ||
                                item.created_at
                            )}
                          </span>
                          <span className='max-w-full truncate'>
                            {emptyValue(item.url)}
                          </span>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </section>

              <section className='rounded-xl border bg-card p-4'>
                <h3 className='font-semibold'>Son uyğunluqlar</h3>
                <div className='mt-3 grid gap-2'>
                  {detailLoading ? (
                    <div className='text-sm text-muted-foreground'>Məlumat yüklənir...</div>
                  ) : detailMatches.length === 0 ? (
                    <div className='text-sm text-muted-foreground'>
                      Son uyğunluq yoxdur.
                    </div>
                  ) : (
                    detailMatches.map((match) => {
                      const matchItem = match.item_id
                        ? detailItemById.get(match.item_id)
                        : null

                      return (
                        <div key={match.id} className='rounded-lg border p-3 text-sm'>
                          <div className='font-medium'>
                            {match.matched_keyword || 'Açar söz yoxdur'}
                          </div>
                          <div className='mt-1 line-clamp-1 text-xs text-muted-foreground'>
                            {matchItem?.title || 'Xəbər başlığı yoxdur'}
                          </div>
                          <div className='mt-1 text-xs text-muted-foreground'>
                            {formatDate(match.created_at)}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </section>

              <section className='rounded-xl border border-emerald-100 bg-emerald-50 p-4'>
                <h3 className='font-semibold text-emerald-900'>
                  Tövsiyə
                </h3>
                <p className='mt-2 text-sm text-emerald-800'>
                  {getRepairSuggestion(detailSource, detailQualityMetrics)}
                </p>
              </section>
            </div>
          </aside>
        </div>
      ) : null}

      {editing ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background p-6 shadow-lg'>
            <div className='mb-5'>
              <h2 className='text-2xl font-bold'>Mənbəni redaktə et</h2>
              <p className='text-sm text-muted-foreground'>
                Yalnız mənbənin oxunması üçün vacib sahələri dəyiş.
              </p>
            </div>

            <div className='space-y-4'>
              <section className='rounded-xl border p-4'>
                <div className='mb-3'>
                  <h3 className='font-semibold'>Əsas məlumat</h3>
                  <p className='text-xs text-muted-foreground'>
                    Domen, son xəbərlər səhifəsi və RSS linki.
                  </p>
                </div>

                <div className='grid gap-3 md:grid-cols-2'>
                  <label className='grid gap-2'>
                    <span className='text-sm font-medium'>Mənbə adı</span>
                    <input
                      value={editing.name}
                      onChange={(e) =>
                        setEditing({ ...editing, name: e.target.value })
                      }
                      className='rounded-lg border bg-background px-3 py-2'
                    />
                  </label>

                  <label className='grid gap-2'>
                    <span className='text-sm font-medium'>Əsas URL</span>
                    <input
                      value={editing.base_url}
                      onChange={(e) =>
                        setEditing({ ...editing, base_url: e.target.value })
                      }
                      className='rounded-lg border bg-background px-3 py-2'
                    />
                  </label>

                  <label className='grid gap-2'>
                    <span className='text-sm font-medium'>Son xəbərlər səhifəsi</span>
                    <input
                      value={editing.latest_url || ''}
                      onChange={(e) =>
                        setEditing({ ...editing, latest_url: e.target.value })
                      }
                      className='rounded-lg border bg-background px-3 py-2'
                    />
                  </label>

                  <label className='grid gap-2'>
                    <span className='text-sm font-medium'>RSS URL</span>
                    <input
                      value={editing.rss_url || ''}
                      onChange={(e) =>
                        setEditing({ ...editing, rss_url: e.target.value })
                      }
                      className='rounded-lg border bg-background px-3 py-2'
                    />
                  </label>
                </div>
              </section>

              <section className='rounded-xl border p-4'>
                <div className='mb-3 flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <h3 className='font-semibold'>Oxuma üsulu</h3>
                    <p className='text-xs text-muted-foreground'>
                      Mənbənin hansı yolla oxunacağını seç.
                    </p>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <a
                      href={editing.latest_url || editing.base_url}
                      target='_blank'
                      rel='noreferrer'
                      className='rounded-md border bg-background px-3 py-2 text-xs hover:bg-muted'
                    >
                      Saytı aç
                    </a>

                    <a
                      href={getSelectorPickerUrl(editing.id)}
                      target='_blank'
                      rel='noreferrer'
                      className='rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100'
                    >
                      Selector seç
                    </a>
                  </div>
                </div>

                <div className='grid gap-3 md:grid-cols-2'>
                  <label className='grid gap-2'>
                    <span className='text-sm font-medium'>Monitor metodu</span>
                    <select
                      value={editing.monitor_method || 'latest_page'}
                      onChange={(e) =>
                        setEditing({ ...editing, monitor_method: e.target.value })
                      }
                      className='rounded-lg border bg-background px-3 py-2'
                    >
                      {MONITOR_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {formatMonitorMethod(method)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className='grid gap-2'>
                    <span className='text-sm font-medium'>CSS selector</span>
                    <input
                      value={editing.selector || ''}
                      onChange={(e) =>
                        setEditing({ ...editing, selector: e.target.value })
                      }
                      className='rounded-lg border bg-background px-3 py-2'
                    />
                  </label>
                </div>

                <details className='mt-4 rounded-lg border bg-muted/20 p-3'>
                  <summary className='cursor-pointer text-sm font-medium'>
                    Ətraflı selector və XPath
                  </summary>

                  <label className='mt-3 grid gap-2'>
                    <span className='text-sm font-medium'>Article pattern / XPath</span>
                    <textarea
                      value={editing.article_pattern || ''}
                      onChange={(e) =>
                        setEditing({ ...editing, article_pattern: e.target.value })
                      }
                      rows={3}
                      className='rounded-lg border bg-background px-3 py-2'
                    />
                  </label>

                  <div className='mt-3 grid gap-2 md:grid-cols-2'>
                    {SELECTOR_TEMPLATES.map((template) => (
                      <button
                        key={template.name}
                        type='button'
                        onClick={() => applySelectorTemplate(template)}
                        className='rounded-lg border bg-background p-3 text-left text-xs hover:bg-muted'
                      >
                        <div className='font-medium'>{template.name}</div>
                        <div className='mt-1 line-clamp-2 text-muted-foreground'>
                          {template.articlePattern}
                        </div>
                      </button>
                    ))}
                  </div>
                </details>
              </section>

              <section className='rounded-xl border bg-muted/20 p-4'>
                <div className='mb-3'>
                  <h3 className='font-semibold'>Cari vəziyyət</h3>
                  <p className='text-xs text-muted-foreground'>
                    Bu məlumatlar sistem tərəfindən yazılır və burada yalnız oxunur.
                  </p>
                </div>

                <div className='grid gap-3 text-sm md:grid-cols-3'>
                  <div>
                    <div className='text-xs text-muted-foreground'>Status</div>
                    <div className='font-medium'>
                      {editing.status === 'active' ? 'Aktiv' : 'Passiv'}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Son nəticə</div>
                    <div className='font-medium'>{formatResult(editing.last_result)}</div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Fail sayı</div>
                    <div className='font-medium'>
                      {editing.consecutive_fail_count || 0}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Son yoxlama</div>
                    <div className='font-medium'>
                      {formatDate(editing.last_checked_at)}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Son uğur</div>
                    <div className='font-medium'>
                      {formatDate(editing.last_success_at)}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground'>Son xəbər</div>
                    <div className='font-medium'>
                      {formatDate(editing.last_article_found_at)}
                    </div>
                  </div>
                  <div className='md:col-span-3'>
                    <div className='text-xs text-muted-foreground'>Son xəta</div>
                    <div className='line-clamp-2 font-medium'>
                      {editing.last_error || '-'}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className='mt-6 flex justify-end gap-2'>
              <button
                onClick={() => setEditing(null)}
                className='rounded-md border px-4 py-2 text-sm hover:bg-muted'
              >
                Bağla
              </button>

              <button
                onClick={saveEdit}
                className='rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground'
              >
                Yadda saxla
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
export const Route = createFileRoute('/(auth)/admin/monitor/sources')({
  component: SourcesPage,
})
