import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

type Source = {
  id: string
  name: string
  base_url: string
  latest_url: string | null
  selector: string | null
  article_pattern: string | null
}

type PickedElement = {
  selector: string
  text: string
  href: string | null
  tag: string
}

function buildPickerHtml(html: string) {
  const pickerScript = `
    <script>
      (() => {
        let selectorMode = false;
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;border:3px solid #f59e0b;background:rgba(245,158,11,.14);box-shadow:0 0 0 99999px rgba(15,23,42,.06);display:none";
        document.body.appendChild(overlay);

        const wakeLazyContent = () => {
          const assetAttrs = ["data-src", "data-original", "data-lazy-src", "data-url", "data-image", "data-bg"];

          document.querySelectorAll("img, iframe").forEach((node) => {
            for (const attr of assetAttrs) {
              const value = node.getAttribute(attr);
              if (value && !node.getAttribute("src")) {
                node.setAttribute("src", value);
                break;
              }
            }
            node.removeAttribute("loading");
            node.removeAttribute("decoding");
          });

          document.querySelectorAll("source").forEach((node) => {
            const srcset = node.getAttribute("data-srcset") || node.getAttribute("data-src");
            if (srcset && !node.getAttribute("srcset")) node.setAttribute("srcset", srcset);
          });

          document.querySelectorAll("[data-bg], [data-background], [data-bg-src]").forEach((node) => {
            const value = node.getAttribute("data-bg") || node.getAttribute("data-background") || node.getAttribute("data-bg-src");
            if (value && !node.style.backgroundImage) node.style.backgroundImage = "url('" + value + "')";
          });

          document.querySelectorAll("[data-aos], [data-animate], [data-animation], .aos-init, .wow, .animated, .fade, .fade-in, .reveal, .invisible, .lazy-hidden").forEach((node) => {
            node.style.opacity = "1";
            node.style.visibility = "visible";
            node.style.transform = "none";
          });

          window.dispatchEvent(new Event("scroll"));
          window.dispatchEvent(new Event("resize"));
        };

        const cssPath = (element) => {
          if (!element) return "";
          if (element.id) return "#" + CSS.escape(element.id);

          const parts = [];
          let current = element;

          while (current && current.nodeType === 1 && current !== document.body) {
            let part = current.tagName.toLowerCase();

            const classes = Array.from(current.classList || [])
              .filter((item) => item && !/^[0-9]+$/.test(item))
              .slice(0, 3);

            if (classes.length) {
              part += "." + classes.map((item) => CSS.escape(item)).join(".");
            } else if (current.parentElement) {
              const same = Array.from(current.parentElement.children)
                .filter((item) => item.tagName === current.tagName);

              if (same.length > 1) {
                part += ":nth-of-type(" + (same.indexOf(current) + 1) + ")";
              }
            }

            parts.unshift(part);
            current = current.parentElement;

            if (parts.length >= 6) break;
          }

          return parts.join(" > ");
        };

        const pickTarget = (target) => {
          return target.closest("article") ||
            target.closest("[class*='news' i]") ||
            target.closest("[class*='post' i]") ||
            target.closest("[class*='item' i]") ||
            target.closest("[class*='card' i]") ||
            target.closest("[class*='list' i]") ||
            target.closest("li") ||
            target.closest("a[href]") ||
            target.closest("div") ||
            target;
        };

        const hideOverlay = () => {
          overlay.style.display = "none";
        };

        const showOverlay = (event) => {
          if (!selectorMode) {
            hideOverlay();
            return;
          }

          const target = pickTarget(event.target);
          const rect = target.getBoundingClientRect();

          overlay.style.display = "block";
          overlay.style.left = rect.left + "px";
          overlay.style.top = rect.top + "px";
          overlay.style.width = rect.width + "px";
          overlay.style.height = rect.height + "px";
        };

        const handleClick = (event) => {
          const link = event.target.closest("a[href]");

          if (!selectorMode) {
            if (link && link.href) {
              event.preventDefault();
              event.stopPropagation();
              window.parent.postMessage({
                type: "visual-monitor-navigate",
                url: link.href,
              }, "*");
            }
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          const target = pickTarget(event.target);
          const selectedLink = target.closest("a[href]");

          window.parent.postMessage({
            type: "visual-monitor-selector-picked",
            selector: cssPath(target),
            text: (target.innerText || target.textContent || "").trim().slice(0, 180),
            href: selectedLink ? selectedLink.href : null,
            tag: target.tagName.toLowerCase(),
          }, "*");
        };

        wakeLazyContent();
        setTimeout(wakeLazyContent, 250);
        setTimeout(wakeLazyContent, 1000);
        setTimeout(wakeLazyContent, 2000);

        window.addEventListener("message", (event) => {
          if (event.data?.type !== "visual-monitor-selector-mode") return;
          selectorMode = Boolean(event.data.enabled);
          if (!selectorMode) hideOverlay();
        });

        document.addEventListener("mouseover", showOverlay, true);
        document.addEventListener("mouseout", () => {
          if (!selectorMode) hideOverlay();
        }, true);
        document.addEventListener("click", handleClick, true);
      })();
    </script>
  `

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${pickerScript}</body>`)
  }

  return `${html}${pickerScript}`
}

function makeArticlePattern(selection: PickedElement | null) {
  if (!selection?.selector) return ''

  if (selection.tag === 'a') {
    return selection.selector
  }

  return `${selection.selector} a[href]`
}

function isVisualPageUrl(url: string | null | undefined) {
  const value = String(url || '')
    .toLowerCase()
    .trim()
  if (!value) return false

  return !(
    value.endsWith('.xml') ||
    value.includes('/rss') ||
    value.includes('/feed') ||
    value.includes('sitemap') ||
    value.includes('atom.xml')
  )
}

function getVisualTargetUrl(source: Source | null) {
  if (!source) return ''
  if (isVisualPageUrl(source.base_url)) return source.base_url || ''
  if (isVisualPageUrl(source.latest_url)) return source.latest_url || ''
  return source.base_url || source.latest_url || ''
}

function SelectorPickerPage() {
  const [source, setSource] = useState<Source | null>(null)
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingPage, setLoadingPage] = useState(false)
  const [message, setMessage] = useState('')
  const [selection, setSelection] = useState<PickedElement | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectorMode, setSelectorMode] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const navigate = useNavigate()

  const sourceId = useMemo(() => {
    return new URLSearchParams(window.location.search).get('sourceId') || ''
  }, [])

  const targetUrl = getVisualTargetUrl(source)
  const articlePattern = makeArticlePattern(selection)

  async function loadSource() {
    if (!sourceId) {
      setMessage('sourceId yoxdur.')
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('sources')
      .select('id,name,base_url,latest_url,selector,article_pattern')
      .eq('id', sourceId)
      .single()

    if (error) {
      setMessage('Mənbə oxunmadı: ' + error.message)
      setLoading(false)
      return
    }

    setSource(data as Source)
    setLoading(false)
  }

  async function loadPage(url: string) {
    setCurrentUrl(url)
    setSelectorMode(false)
    setLoadingPage(true)
    setMessage('')
    setSelection(null)

    const { data, error } = await supabase.functions.invoke('selector-proxy', {
      body: { url },
    })

    if (error) {
      setMessage('Proxy xətası: ' + error.message)
      setHtml('')
      setLoadingPage(false)
      return
    }

    if (!data?.html) {
      setMessage(
        data?.error ||
          'HTML tapılmadı. Saytı ayrıca açıb yoxla və ya başqa səhifə URL-i ilə yenidən cəhd et.'
      )
      setHtml('')
      setLoadingPage(false)
      return
    }

    if (data.finalUrl) {
      setCurrentUrl(data.finalUrl)
    }

    if (data.canonicalFallback) {
      setMessage('Sayt canonical domenlə açıldı. İşlək ünvan: ' + data.finalUrl)
    }

    setHtml(buildPickerHtml(data.html))
    setLoadingPage(false)
  }
  async function saveSelector(picked = selection, redirectAfterSave = false) {
    if (!source || !picked?.selector) return

    const pattern = makeArticlePattern(picked) || picked.selector
    setSaving(true)
    setMessage('Selector saxlanılır...')

    const { error } = await supabase
      .from('sources')
      .update({
        status: 'active',
        monitor_method: 'selector',
        selector: picked.selector,
        article_pattern: pattern,
        consecutive_fail_count: 0,
        last_error: null,
        last_result: 'selector_configured',
        discovery_status: 'accepted',
        notes: `Visual picker ilə selector seçildi: ${picked.selector}`,
      })
      .eq('id', source.id)

    setSaving(false)

    if (error) {
      setMessage('Selector saxlanmadı: ' + error.message)
      return
    }

    setMessage(
      `Selector saxlandı. Bot bu blokdakı linkləri oxuyacaq: ${pattern}`
    )

    if (redirectAfterSave) {
      await navigate({ to: '/admin/monitor/sources' })
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSource()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'visual-monitor-navigate') {
        const nextUrl = event.data.url || ''
        if (nextUrl) void loadPage(nextUrl)
        return
      }

      if (event.data?.type !== 'visual-monitor-selector-picked') return

      const picked = {
        selector: event.data.selector || '',
        text: event.data.text || '',
        href: event.data.href || null,
        tag: event.data.tag || '',
      }

      setSelection(picked)
      void saveSelector(picked)
    }

    window.addEventListener('message', handleMessage)

    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'visual-monitor-selector-mode', enabled: selectorMode },
      '*'
    )
  }, [selectorMode, html])

  useEffect(() => {
    if (targetUrl) {
      const timer = window.setTimeout(() => {
        void loadPage(targetUrl)
      }, 0)

      return () => window.clearTimeout(timer)
    }
  }, [targetUrl])

  if (loading) {
    return <div className='p-6'>Yüklənir...</div>
  }

  return (
    <div className='grid h-screen grid-rows-[auto_1fr]'>
      <div className='border-b bg-background p-4'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h1 className='text-xl font-bold'>Selector seç</h1>
            <div className='text-sm text-muted-foreground'>
              {source?.name || 'Mənbə'} | {targetUrl}
            </div>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Link
              to='/admin/monitor/sources'
              className='rounded-md border px-3 py-2 text-sm hover:bg-muted'
            >
              Mənbələrə qayıt
            </Link>

            <a
              href={currentUrl || targetUrl}
              target='_blank'
              rel='noreferrer'
              className='rounded-md border px-3 py-2 text-sm hover:bg-muted'
            >
              Saytı ayrıca aç
            </a>

            <button
              type='button'
              onClick={() => setSelectorMode((value) => !value)}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                selectorMode
                  ? 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {selectorMode
                ? 'Gəzinti rejiminə keç'
                : 'Selector rejimini aktiv et'}
            </button>

            <button
              type='button'
              onClick={() =>
                (currentUrl || targetUrl) && loadPage(currentUrl || targetUrl)
              }
              className='rounded-md border px-3 py-2 text-sm hover:bg-muted'
            >
              Yenilə
            </button>
          </div>
        </div>

        {message ? (
          <div className='mt-3 rounded-md border bg-muted/30 p-3 text-sm'>
            {message}
          </div>
        ) : null}

        <div className='mt-3 grid gap-3 border-t pt-3 md:grid-cols-[1fr_360px]'>
          <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border bg-slate-950 px-3 py-2 text-sm text-white'>
            <span>
              {selectorMode
                ? 'Selector rejimi aktivdir. Xəbər bloku, kartı və ya başlığı seç.'
                : 'Gəzinti rejimindəsən. Saytın bölmələrinə daxil ola bilərsən.'}
            </span>
            <button
              type='button'
              onClick={() => setSelectorMode((value) => !value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                selectorMode
                  ? 'bg-amber-200 text-amber-950 hover:bg-amber-300'
                  : 'bg-emerald-300 text-emerald-950 hover:bg-emerald-400'
              }`}
            >
              {selectorMode ? 'Gəzintiyə qayıt' : 'Selectoru aktiv et'}
            </button>
          </div>
          <div className='rounded-md border bg-background p-3 text-sm shadow-sm'>
            {selection ? (
              <div className='grid gap-2'>
                <div className='font-semibold'>Seçilən hissə</div>
                <div className='max-h-20 overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground'>
                  {selection.text || selection.href || 'Mətn tapılmadı'}
                </div>
                <div className='text-xs break-all'>
                  <b>Selector:</b> {selection.selector}
                </div>
                <div className='text-xs break-all'>
                  <b>Article pattern:</b> {articlePattern || '-'}
                </div>
                <button
                  type='button'
                  onClick={() => saveSelector(selection, true)}
                  disabled={saving}
                  className='rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60'
                >
                  {saving ? 'Saxlanır...' : 'Selectoru saxla'}
                </button>
              </div>
            ) : (
              <div className='text-muted-foreground'>
                Seçilən hissənin preview-i burada görünəcək.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='min-h-[calc(100vh-260px)] overflow-hidden bg-muted/20'>
        {loadingPage ? (
          <div className='p-6'>Sayt açılır...</div>
        ) : html ? (
          <iframe
            ref={iframeRef}
            title='Selector picker'
            srcDoc={html}
            sandbox='allow-scripts allow-same-origin allow-popups'
            className='h-full min-h-[calc(100vh-260px)] w-full bg-white'
          />
        ) : (
          <div className='p-6 text-muted-foreground'>
            Sayt göstərilə bilmədi.
          </div>
        )}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/(auth)/admin/monitor/picker')({
  component: SelectorPickerPage,
})
