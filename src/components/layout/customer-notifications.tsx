import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, CheckCheck, ExternalLink, Loader2 } from 'lucide-react'
import { customerQueryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type NotificationRow = {
  id: string
  channel: string | null
  status: string | null
  sent_at: string | null
  monitor_matches: {
    matched_keyword: string | null
    user_monitors: {
      name: string | null
    } | null
    monitored_items: {
      title: string | null
      url: string | null
    } | null
  } | null
}

type NotificationData = {
  alerts: NotificationRow[]
  userId: string | null
}

function readStorage(key: string) {
  if (typeof window === 'undefined') return [] as string[]

  try {
    const value = window.localStorage.getItem(key)
    const parsed = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writeStorage(key: string, ids: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(ids.slice(0, 500)))
}

function decodeHtml(value: string) {
  if (typeof document === 'undefined') return value
  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

function formatTime(value: string | null) {
  if (!value) return '-'

  return new Date(value).toLocaleString('az-AZ', {
    timeZone: 'Asia/Baku',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getHost(url: string | null | undefined) {
  if (!url) return 'Mənbə yoxdur'

  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

async function fetchCustomerNotifications(): Promise<NotificationData> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { alerts: [], userId: null }

  const { data: monitors, error: monitorsError } = await supabase
    .from('user_monitors')
    .select('id')
    .eq('user_id', user.id)

  if (monitorsError) throw monitorsError

  const monitorIds = (monitors || []).map((monitor) => monitor.id)
  if (monitorIds.length === 0) return { alerts: [], userId: user.id }

  const { data: matches, error: matchesError } = await supabase
    .from('monitor_matches')
    .select('id')
    .in('monitor_id', monitorIds)

  if (matchesError) throw matchesError

  const matchIds = (matches || []).map((match) => match.id)
  if (matchIds.length === 0) return { alerts: [], userId: user.id }

  const { data, error } = await supabase
    .from('monitor_alerts')
    .select(
      'id,channel,status,sent_at,monitor_matches(matched_keyword,user_monitors(name),monitored_items(title,url))'
    )
    .in('match_id', matchIds)
    .order('sent_at', { ascending: false })
    .limit(20)

  if (error) throw error

  return { alerts: (data || []) as unknown as NotificationRow[], userId: user.id }
}

export function CustomerNotifications() {
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...customerQueryKeys.alerts(), 'header'],
    queryFn: fetchCustomerNotifications,
    staleTime: 30_000,
  })

  const storageKey = data?.userId
    ? `visual-monitor:customer-alerts-read:${data.userId}`
    : 'visual-monitor:customer-alerts-read:anonymous'

  useEffect(() => {
    setReadIds(readStorage(storageKey))
  }, [storageKey])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const alerts = data?.alerts || []
  const readSet = useMemo(() => new Set(readIds), [readIds])
  const unreadCount = alerts.filter((alert) => !readSet.has(alert.id)).length

  function updateReadIds(nextIds: string[]) {
    const unique = Array.from(new Set(nextIds))
    setReadIds(unique)
    writeStorage(storageKey, unique)
  }

  function markOneAsRead(alertId: string) {
    if (readSet.has(alertId)) return
    updateReadIds([alertId, ...readIds])
  }

  function markAllAsRead() {
    updateReadIds([...alerts.map((alert) => alert.id), ...readIds])
  }

  function openAlert(alert: NotificationRow) {
    markOneAsRead(alert.id)
    const url = alert.monitor_matches?.monitored_items?.url
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div ref={containerRef} className='relative'>
      <button
        type='button'
        aria-label='Bildirişlər'
        className='relative inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className='size-5' />
        {unreadCount > 0 ? (
          <span className='absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white shadow-sm'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className='absolute right-0 top-12 z-50 w-[min(92vw,28rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70'>
          <div className='flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4'>
            <div>
              <h2 className='text-base font-extrabold text-slate-950'>Bildirişlər</h2>
              <p className='mt-1 text-sm font-semibold text-slate-500'>
                {unreadCount} yeni bildiriş
              </p>
            </div>
            <button
              type='button'
              className='inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-extrabold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50'
              disabled={alerts.length === 0 || unreadCount === 0}
              onClick={markAllAsRead}
            >
              <CheckCheck className='size-4' />
              Oxundu
            </button>
          </div>

          <div className='max-h-[28rem] overflow-y-auto'>
            {isLoading ? (
              <div className='flex items-center gap-2 px-4 py-8 text-sm font-semibold text-slate-500'>
                <Loader2 className='size-4 animate-spin' />
                Bildirişlər yüklənir...
              </div>
            ) : isError ? (
              <div className='space-y-3 px-4 py-6'>
                <p className='text-sm font-semibold text-slate-600'>
                  Bildirişləri yükləmək mümkün olmadı.
                </p>
                <button
                  type='button'
                  className='rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50'
                  onClick={() => refetch()}
                >
                  Yenidən yoxla
                </button>
              </div>
            ) : alerts.length === 0 ? (
              <div className='px-4 py-8 text-sm font-semibold text-slate-500'>
                Yeni bildiriş yoxdur.
              </div>
            ) : (
              alerts.map((alert) => {
                const item = alert.monitor_matches?.monitored_items
                const monitorName = alert.monitor_matches?.user_monitors?.name || 'Monitor'
                const keyword = alert.monitor_matches?.matched_keyword || 'Açar söz'
                const title = decodeHtml(item?.title || 'Başlıq yoxdur')
                const isUnread = !readSet.has(alert.id)

                return (
                  <button
                    key={alert.id}
                    type='button'
                    className={cn(
                      'group flex w-full gap-3 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50',
                      isUnread ? 'bg-blue-50/55' : 'bg-white'
                    )}
                    onClick={() => openAlert(alert)}
                  >
                    <span
                      className={cn(
                        'mt-1 size-2.5 shrink-0 rounded-full',
                        isUnread ? 'bg-blue-600' : 'bg-slate-200'
                      )}
                    />
                    <span className='min-w-0 flex-1'>
                      <span className='line-clamp-2 text-sm font-extrabold leading-5 text-slate-950'>
                        {title}
                      </span>
                      <span className='mt-1 block truncate text-xs font-bold text-slate-500'>
                        {monitorName} · {keyword}
                      </span>
                      <span className='mt-3 flex flex-wrap items-center gap-2'>
                        <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700'>
                          {getHost(item?.url)}
                        </span>
                        <span className='rounded-full bg-blue-100 px-2.5 py-1 text-xs font-extrabold text-blue-700'>
                          {formatTime(alert.sent_at)}
                        </span>
                      </span>
                    </span>
                    <ExternalLink className='mt-1 size-4 shrink-0 text-slate-500 transition group-hover:text-blue-700' />
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}