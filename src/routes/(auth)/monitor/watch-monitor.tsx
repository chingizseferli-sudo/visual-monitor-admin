import { FormEvent, useMemo, useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  Globe2,
  Loader2,
  PauseCircle,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { customerQueryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'

type WatchStatus = 'active' | 'inactive' | 'paused'

type WatchRow = {
  id: string
  user_id: string | null
  name: string | null
  url: string | null
  domain: string | null
  selector: string | null
  status: string | null
  interval_minutes: number | null
  last_checked_at: string | null
  last_changed_at: string | null
  last_success_at: string | null
  last_error: string | null
  consecutive_fail_count: number | null
  created_at: string | null
}

type ChangeEventRow = {
  id: string
  source_id: string | null
  diff_summary: string | null
  created_at: string | null
}

type WatchForm = {
  id: string | null
  name: string
  url: string
  selector: string
  interval_minutes: string
  status: WatchStatus
}

type WatchData = {
  userId: string
  watches: WatchRow[]
  events: ChangeEventRow[]
}

const emptyForm: WatchForm = {
  id: null,
  name: '',
  url: '',
  selector: '',
  interval_minutes: '10',
  status: 'active',
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function getDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Date(value).toLocaleString('az-AZ', {
    timeZone: 'Asia/Baku',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusLabel(status: string | null) {
  if (status === 'active') return 'Aktiv'
  if (status === 'paused') return 'Dayandırılıb'
  if (status === 'inactive') return 'Passiv'
  if (status === 'error') return 'Xəta'
  return status || '-'
}

function getWatchHealth(watch: WatchRow, recentCount: number) {
  if (watch.last_error || Number(watch.consecutive_fail_count || 0) > 0) {
    return {
      label: 'Xəta',
      className: 'border-red-200 bg-red-50 text-red-700',
      icon: AlertTriangle,
    }
  }

  if (recentCount > 0) {
    return {
      label: 'Dəyişiklik var',
      className: 'border-blue-200 bg-blue-50 text-blue-700',
      icon: Activity,
    }
  }

  if (watch.status === 'active') {
    return {
      label: 'Normal',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: CheckCircle2,
    }
  }

  return {
    label: getStatusLabel(watch.status),
    className: 'border-slate-200 bg-slate-50 text-slate-600',
    icon: PauseCircle,
  }
}

async function fetchWatchData(): Promise<WatchData> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Sessiya tapılmadı. Zəhmət olmasa yenidən daxil olun.')
  }

  const { data: watches, error: watchesError } = await supabase
    .from('change_sources')
    .select(
      'id,user_id,name,url,domain,selector,status,interval_minutes,last_checked_at,last_changed_at,last_success_at,last_error,consecutive_fail_count,created_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (watchesError) {
    throw new Error(`Veb izləmələr yüklənmədi: ${watchesError.message}`)
  }

  const watchRows = (watches || []) as WatchRow[]
  const watchIds = watchRows.map((watch) => watch.id)

  if (watchIds.length === 0) {
    return { userId: user.id, watches: watchRows, events: [] }
  }

  const { data: events, error: eventsError } = await supabase
    .from('change_events')
    .select('id,source_id,diff_summary,created_at')
    .in('source_id', watchIds)
    .order('created_at', { ascending: false })
    .limit(150)

  if (eventsError) {
    throw new Error(`Dəyişiklik tarixçəsi yüklənmədi: ${eventsError.message}`)
  }

  return { userId: user.id, watches: watchRows, events: (events || []) as ChangeEventRow[] }
}

function validateForm(form: WatchForm) {
  const url = normalizeUrl(form.url)
  const domain = getDomain(url)
  const interval = Number(form.interval_minutes)

  if (!form.name.trim()) return 'İzləmə adı yazın.'
  if (!url || !domain) return 'Düzgün URL və ya domen yazın.'
  if (!form.selector.trim()) return 'İzlənəcək hissə üçün CSS selector yazın.'
  if (!Number.isFinite(interval) || interval < 5) return 'Interval ən azı 5 dəqiqə olmalıdır.'

  return ''
}

function WatchMonitorPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<WatchForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  const watchesQuery = useQuery({
    queryKey: customerQueryKeys.watchMonitor(),
    queryFn: fetchWatchData,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })

  const watches = watchesQuery.data?.watches || []
  const events = watchesQuery.data?.events || []
  const userId = watchesQuery.data?.userId || ''

  const eventsBySource = useMemo(() => {
    const map = new Map<string, ChangeEventRow[]>()
    events.forEach((event) => {
      if (!event.source_id) return
      const list = map.get(event.source_id) || []
      list.push(event)
      map.set(event.source_id, list)
    })
    return map
  }, [events])

  const stats = useMemo(() => {
    return {
      total: watches.length,
      active: watches.filter((watch) => watch.status === 'active').length,
      changed: watches.filter((watch) => eventsBySource.get(watch.id)?.length).length,
      errors: watches.filter((watch) => watch.last_error).length,
    }
  }, [eventsBySource, watches])

  function updateForm<K extends keyof WatchForm>(key: K, value: WatchForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function editWatch(watch: WatchRow) {
    setForm({
      id: watch.id,
      name: watch.name || '',
      url: watch.url || '',
      selector: watch.selector || '',
      interval_minutes: String(watch.interval_minutes || 10),
      status: (watch.status === 'paused' || watch.status === 'inactive' ? watch.status : 'active') as WatchStatus,
    })
    setFormError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveWatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    const validation = validateForm(form)
    if (validation) {
      setFormError(validation)
      return
    }

    if (!userId) {
      setFormError('Sessiya tapılmadı. Zəhmət olmasa yenidən daxil olun.')
      return
    }

    const url = normalizeUrl(form.url)
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      url,
      domain: getDomain(url),
      selector: form.selector.trim(),
      interval_minutes: Math.max(5, Number(form.interval_minutes) || 10),
      status: form.status,
      next_check_at: new Date().toISOString(),
      consecutive_fail_count: 0,
      last_error: null,
    }

    setSaving(true)
    const response = form.id
      ? await supabase.from('change_sources').update(payload).eq('id', form.id).eq('user_id', userId)
      : await supabase.from('change_sources').insert(payload)
    setSaving(false)

    if (response.error) {
      setFormError(response.error.message)
      toast.error('Veb izləmə yadda saxlanmadı.')
      return
    }

    toast.success(form.id ? 'Veb izləmə yeniləndi.' : 'Yeni veb izləmə yaradıldı.')
    setForm(emptyForm)
    await queryClient.invalidateQueries({ queryKey: customerQueryKeys.watchMonitor() })
  }

  async function deleteWatch(watch: WatchRow) {
    const confirmed = window.confirm('Bu veb izləmə silinsin? Tarixçə də silinə bilər.')
    if (!confirmed || !userId) return

    const { error } = await supabase.from('change_sources').delete().eq('id', watch.id).eq('user_id', userId)
    if (error) {
      toast.error(`Veb izləmə silinmədi: ${error.message}`)
      return
    }

    toast.success('Veb izləmə silindi.')
    if (expandedId === watch.id) setExpandedId(null)
    await queryClient.invalidateQueries({ queryKey: customerQueryKeys.watchMonitor() })
  }

  async function toggleStatus(watch: WatchRow) {
    if (!userId) return
    const nextStatus = watch.status === 'active' ? 'paused' : 'active'
    const { error } = await supabase
      .from('change_sources')
      .update({ status: nextStatus, next_check_at: nextStatus === 'active' ? new Date().toISOString() : watch.last_checked_at })
      .eq('id', watch.id)
      .eq('user_id', userId)

    if (error) {
      toast.error(`Status dəyişmədi: ${error.message}`)
      return
    }

    toast.success(nextStatus === 'active' ? 'İzləmə aktiv edildi.' : 'İzləmə dayandırıldı.')
    await queryClient.invalidateQueries({ queryKey: customerQueryKeys.watchMonitor() })
  }

  if (watchesQuery.isLoading) {
    return (
      <div className='flex min-h-[360px] items-center justify-center p-6'>
        <Loader2 className='mr-2 h-5 w-5 animate-spin' />
        <span>Veb izləmələr yüklənir...</span>
      </div>
    )
  }

  return (
    <div className='grid gap-4 p-4 md:p-6'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Veb izləmə</h1>
          <p className='max-w-3xl text-slate-500'>
            Seçdiyiniz URL və CSS selector üzrə vacib səhifə hissələrini izləyin. Dəyişiklik olduqda tarixçə burada görünəcək.
          </p>
        </div>
        <button
          type='button'
          onClick={() => setForm(emptyForm)}
          className='inline-flex items-center justify-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-bold text-white hover:bg-blue-700'
        >
          <Plus className='h-4 w-4' />
          Yeni izləmə
        </button>
      </div>

      {watchesQuery.error ? (
        <div className='rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          {watchesQuery.error instanceof Error ? watchesQuery.error.message : 'Veb izləmələr yüklənmədi.'}
        </div>
      ) : null}

      <div className='grid gap-3 md:grid-cols-4'>
        <StatCard label='Ümumi izləmə' value={stats.total} icon={Eye} />
        <StatCard label='Aktiv' value={stats.active} icon={CheckCircle2} />
        <StatCard label='Dəyişiklik olan' value={stats.changed} icon={Activity} />
        <StatCard label='Xətalı' value={stats.errors} icon={AlertTriangle} tone={stats.errors > 0 ? 'danger' : 'normal'} />
      </div>

      <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='mb-3'>
          <h2 className='text-base font-semibold'>{form.id ? 'İzləməni redaktə et' : 'Yeni veb izləmə yarat'}</h2>
          <p className='text-sm text-slate-500'>
            Səhifə ünvanını və izlənəcək hissənin CSS selector-unu yazın. Sistem həmin hissəni mütəmadi yoxlayacaq.
          </p>
        </div>

        <form onSubmit={saveWatch} className='grid gap-3 lg:grid-cols-[1fr_1.2fr_0.7fr_0.7fr_auto] lg:items-end'>
          <label className='grid gap-1 text-sm font-medium text-slate-700'>
            İzləmə adı
            <input
              value={form.name}
              onChange={(event) => updateForm('name', event.target.value)}
              placeholder='Məsələn: Nazirlik xəbərləri'
              className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300'
            />
          </label>
          <label className='grid gap-1 text-sm font-medium text-slate-700'>
            URL
            <input
              value={form.url}
              onChange={(event) => updateForm('url', event.target.value)}
              placeholder='https://example.az/news'
              className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300'
            />
          </label>
          <label className='grid gap-1 text-sm font-medium text-slate-700'>
            CSS selector
            <input
              value={form.selector}
              onChange={(event) => updateForm('selector', event.target.value)}
              placeholder='.news-list'
              className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300'
            />
          </label>
          <label className='grid gap-1 text-sm font-medium text-slate-700'>
            Interval
            <select
              value={form.interval_minutes}
              onChange={(event) => updateForm('interval_minutes', event.target.value)}
              className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300'
            >
              <option value='5'>5 dəq</option>
              <option value='10'>10 dəq</option>
              <option value='15'>15 dəq</option>
              <option value='30'>30 dəq</option>
              <option value='60'>60 dəq</option>
            </select>
          </label>
          <button
            type='submit'
            disabled={saving}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1463ff] px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60'
          >
            {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : <Plus className='h-4 w-4' />}
            {form.id ? 'Yenilə' : 'Yarat'}
          </button>
        </form>

        {formError ? <div className='mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{formError}</div> : null}
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3'>
          <div>
            <h2 className='text-base font-semibold'>İzləmələr</h2>
            <p className='text-sm text-slate-500'>URL və selector əsasında izlənən səhifə hissələri</p>
          </div>
        </div>

        {watches.length === 0 ? (
          <div className='grid place-items-center gap-3 px-4 py-12 text-center'>
            <div className='grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600'>
              <Globe2 className='h-6 w-6' />
            </div>
            <div>
              <h3 className='font-semibold text-slate-950'>Hələ veb izləmə yoxdur</h3>
              <p className='mt-1 max-w-xl text-sm text-slate-500'>
                İlk izləməni yaradın: URL yazın, izlənəcək hissənin CSS selector-unu əlavə edin və sistem ilk yoxlamadan sonra nəticəni göstərəcək.
              </p>
            </div>
          </div>
        ) : (
          <div className='divide-y divide-slate-100'>
            {watches.map((watch) => {
              const watchEvents = eventsBySource.get(watch.id) || []
              const health = getWatchHealth(watch, watchEvents.length)
              const HealthIcon = health.icon
              const isExpanded = expandedId === watch.id

              return (
                <div key={watch.id} className='px-4 py-3'>
                  <button
                    type='button'
                    onClick={() => setExpandedId(isExpanded ? null : watch.id)}
                    className='grid w-full gap-3 text-left lg:grid-cols-[1.1fr_1.2fr_1fr_0.7fr_0.7fr_auto] lg:items-center'
                  >
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${health.className}`}>
                          <HealthIcon className='h-3.5 w-3.5' />
                          {health.label}
                        </span>
                      </div>
                      <div className='mt-2 truncate font-semibold text-slate-950'>{watch.name || watch.domain || 'İzləmə'}</div>
                    </div>
                    <div className='min-w-0 text-sm text-slate-500'>
                      <div className='truncate font-medium text-slate-700' title={watch.domain || ''}>{watch.domain || '-'}</div>
                      <div className='truncate' title={watch.url || ''}>{watch.url || '-'}</div>
                    </div>
                    <div className='min-w-0 truncate rounded-lg bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600' title={watch.selector || ''}>
                      {watch.selector || '-'}
                    </div>
                    <div className='text-sm text-slate-500'>
                      <div className='font-medium text-slate-700'>{getStatusLabel(watch.status)}</div>
                      <div>{watch.interval_minutes || 5} dəq</div>
                    </div>
                    <div className='text-sm text-slate-500'>
                      <div className='flex items-center gap-1'><Clock3 className='h-3.5 w-3.5' /> {formatDate(watch.last_checked_at)}</div>
                      <div>Dəyişiklik: {formatDate(watch.last_changed_at)}</div>
                    </div>
                    <div className='flex justify-end gap-2' onClick={(event) => event.stopPropagation()}>
                      <button type='button' onClick={() => toggleStatus(watch)} className='rounded-lg border px-2 py-1 text-xs font-semibold hover:bg-slate-50'>
                        {watch.status === 'active' ? 'Dayandır' : 'Aktiv et'}
                      </button>
                      <button type='button' onClick={() => editWatch(watch)} className='rounded-lg border px-2 py-1 text-xs font-semibold hover:bg-slate-50'>
                        <Edit3 className='h-3.5 w-3.5' />
                      </button>
                      <button type='button' onClick={() => deleteWatch(watch)} className='rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50'>
                        <Trash2 className='h-3.5 w-3.5' />
                      </button>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className='mt-3 rounded-2xl border border-slate-200 bg-[#f7f9fd] p-3'>
                      <div className='mb-2 text-sm font-semibold text-slate-950'>Son dəyişiklik tarixçəsi</div>
                      {watch.last_error ? (
                        <div className='mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                          Son xəta: {watch.last_error}
                        </div>
                      ) : null}
                      {watchEvents.length === 0 ? (
                        <div className='rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500'>
                          Dəyişiklik yoxdur. İlk dəyişiklik olduqda burada görünəcək.
                        </div>
                      ) : (
                        <div className='grid gap-2'>
                          {watchEvents.slice(0, 8).map((event) => (
                            <div key={event.id} className='rounded-xl border border-slate-200 bg-white p-3 text-sm'>
                              <div className='font-medium text-slate-950'>{event.diff_summary || 'Dəyişiklik qeydə alındı'}</div>
                              <div className='mt-1 text-slate-500'>{formatDate(event.created_at)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'normal',
}: {
  label: string
  value: number
  icon: typeof Eye
  tone?: 'normal' | 'danger'
}) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tone === 'danger' ? 'border-red-200' : 'border-slate-200'}`}>
      <div className='flex items-center justify-between gap-3 text-sm text-slate-500'>
        {label}
        <Icon className={tone === 'danger' ? 'h-5 w-5 text-red-500' : 'h-5 w-5 text-slate-500'} />
      </div>
      <div className='mt-2 text-2xl font-bold text-slate-950'>{value}</div>
    </div>
  )
}

export const Route = createFileRoute('/(auth)/monitor/watch-monitor')({
  component: WatchMonitorPage,
})