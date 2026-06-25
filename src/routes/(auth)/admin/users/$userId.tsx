import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

type UserProfile = {
  user_id: string
  email: string | null
  telegram_chat_id: string | null
  created_at?: string | null
  updated_at?: string | null
}

type Monitor = {
  id: string
  user_id: string
  name: string
  description: string | null
  status: string | null
  notify_telegram: boolean | null
  telegram_chat_id: string | null
  created_at: string | null
}

type Keyword = {
  id: string
  monitor_id: string
  keyword: string
  match_type: string | null
}

type Match = {
  id: string
  monitor_id: string
  item_id: string
  matched_keyword: string | null
  created_at: string | null
}

type Item = {
  id: string
  source_id: string | null
  title: string
  url: string
  published_at: string | null
  detected_at: string | null
}

type Source = {
  id: string
  name: string
  base_url: string | null
}

function formatDate(value: string | null | undefined) {
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

function AdminUserDetailsPage() {
  const { userId } = Route.useParams()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [telegramChatId, setTelegramChatId] = useState('')
  const [newMonitorName, setNewMonitorName] = useState('')
  const [newMonitorDescription, setNewMonitorDescription] = useState('')
  const [newKeywordByMonitor, setNewKeywordByMonitor] = useState<
    Record<string, string>
  >({})

  async function loadData() {
    setLoading(true)
    setMessage('')

    const profileRes = await supabase
      .from('user_profiles')
      .select('user_id,email,telegram_chat_id,created_at,updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    const monitorsRes = await supabase
      .from('user_monitors')
      .select(
        'id,user_id,name,description,status,notify_telegram,telegram_chat_id,created_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    const userMonitors = (monitorsRes.data || []) as Monitor[]
    const monitorIds = userMonitors.map((monitor) => monitor.id)

    let keywordData: Keyword[] = []
    let matchData: Match[] = []
    let itemData: Item[] = []
    let sourceData: Source[] = []

    if (monitorIds.length > 0) {
      const [keywordsRes, matchesRes] = await Promise.all([
        supabase
          .from('monitor_keywords')
          .select('id,monitor_id,keyword,match_type')
          .in('monitor_id', monitorIds)
          .order('keyword', { ascending: true }),
        supabase
          .from('monitor_matches')
          .select('id,monitor_id,item_id,matched_keyword,created_at')
          .in('monitor_id', monitorIds)
          .order('created_at', { ascending: false })
          .limit(200),
      ])

      keywordData = (keywordsRes.data || []) as Keyword[]
      matchData = (matchesRes.data || []) as Match[]

      const itemIds = Array.from(
        new Set(matchData.map((match) => match.item_id).filter(Boolean))
      )

      if (itemIds.length > 0) {
        const itemsRes = await supabase
          .from('monitored_items')
          .select('id,source_id,title,url,published_at,detected_at')
          .in('id', itemIds)

        itemData = (itemsRes.data || []) as Item[]

        const sourceIds = Array.from(
          new Set(itemData.map((item) => item.source_id).filter(Boolean))
        ) as string[]

        if (sourceIds.length > 0) {
          const sourcesRes = await supabase
            .from('sources')
            .select('id,name,base_url')
            .in('id', sourceIds)

          sourceData = (sourcesRes.data || []) as Source[]
        }
      }
    }

    if (profileRes.error) {
      setMessage(profileRes.error.message)
    }
    if (monitorsRes.error) {
      setMessage(monitorsRes.error.message)
    }

    const profileData = profileRes.data as UserProfile | null
    setProfile(profileData)
    setTelegramChatId(profileData?.telegram_chat_id || '')
    setMonitors(userMonitors)
    setKeywords(keywordData)
    setMatches(matchData)
    setItems(itemData)
    setSources(sourceData)
    setLoading(false)
  }

  const recentRows = useMemo(() => {
    return matches.slice(0, 20).map((match) => {
      const item = items.find((row) => row.id === match.item_id) || null
      const source = sources.find((row) => row.id === item?.source_id) || null

      return { match, item, source }
    })
  }, [matches, items, sources])

  const stats = useMemo(() => {
    return {
      activeMonitors: monitors.filter((monitor) => monitor.status === 'active')
        .length,
      inactiveMonitors: monitors.filter(
        (monitor) => monitor.status !== 'active'
      ).length,
      keywordCount: keywords.length,
      resultCount: matches.length,
    }
  }, [monitors, keywords, matches])

  async function saveTelegram() {
    const value = telegramChatId.trim() || null

    const { error: profileError } = await supabase.from('user_profiles').upsert(
      {
        user_id: userId,
        telegram_chat_id: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    const { error: monitorError } = await supabase
      .from('user_monitors')
      .update({ telegram_chat_id: value })
      .eq('user_id', userId)

    if (profileError || monitorError) {
      setMessage(
        profileError?.message || monitorError?.message || 'Xəta baş verdi'
      )
      return
    }

    await loadData()
  }

  async function createMonitor() {
    const name = newMonitorName.trim()
    if (!name) return

    const { error } = await supabase.from('user_monitors').insert({
      user_id: userId,
      name,
      description: newMonitorDescription.trim() || null,
      status: 'active',
      notify_telegram: true,
      telegram_chat_id:
        telegramChatId.trim() || profile?.telegram_chat_id || null,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setNewMonitorName('')
    setNewMonitorDescription('')
    await loadData()
  }

  async function toggleMonitor(monitor: Monitor) {
    const nextStatus = monitor.status === 'active' ? 'inactive' : 'active'
    const { error } = await supabase
      .from('user_monitors')
      .update({ status: nextStatus })
      .eq('id', monitor.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadData()
  }

  async function deleteMonitor(monitor: Monitor) {
    const ok = window.confirm(
      `"${monitor.name}" monitoru silinsin? Bu monitorun açar sözləri və uyğunluq qeydləri də silinəcək.`
    )

    if (!ok) return

    const monitorMatches = matches.filter(
      (match) => match.monitor_id === monitor.id
    )
    const matchIds = monitorMatches.map((match) => match.id)

    if (matchIds.length > 0) {
      const { error: alertError } = await supabase
        .from('notification_logs')
        .delete()
        .in('match_id', matchIds)

      if (alertError) {
        setMessage(alertError.message)
        return
      }
    }

    const { error: keywordError } = await supabase
      .from('monitor_keywords')
      .delete()
      .eq('monitor_id', monitor.id)

    if (keywordError) {
      setMessage(keywordError.message)
      return
    }

    const { error: matchError } = await supabase
      .from('monitor_matches')
      .delete()
      .eq('monitor_id', monitor.id)

    if (matchError) {
      setMessage(matchError.message)
      return
    }

    const { error: monitorError } = await supabase
      .from('user_monitors')
      .delete()
      .eq('id', monitor.id)

    if (monitorError) {
      setMessage(monitorError.message)
      return
    }

    await loadData()
  }

  async function addKeyword(monitorId: string) {
    const value = (newKeywordByMonitor[monitorId] || '').trim()
    if (!value) return

    const { error } = await supabase.from('monitor_keywords').insert({
      monitor_id: monitorId,
      keyword: value,
      match_type: 'contains',
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setNewKeywordByMonitor((current) => ({ ...current, [monitorId]: '' }))
    await loadData()
  }

  async function deleteKeyword(keyword: Keyword) {
    const ok = window.confirm(`"${keyword.keyword}" açar sözü silinsin?`)
    if (!ok) return

    const { error } = await supabase
      .from('monitor_keywords')
      .delete()
      .eq('id', keyword.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadData()
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [userId])

  if (loading) return <div className='p-6'>Yüklənir...</div>

  return (
    <div className='grid gap-6 p-6'>
      <div>
        <Link
          to='/admin/users'
          className='text-sm text-primary hover:underline'
        >
          ← Müştərilərə qayıt
        </Link>
        <h1 className='mt-3 text-3xl font-bold tracking-tight'>
          {profile?.email || 'Email qeyd edilməyib'}
        </h1>
        <p className='text-muted-foreground'>{userId}</p>
      </div>

      {message ? (
        <div className='rounded-xl border bg-card p-4 text-sm text-orange-600'>
          {message}
        </div>
      ) : null}

      <div className='grid gap-4 md:grid-cols-4'>
        <div className='rounded-xl border border-emerald-100 bg-emerald-50 p-4'>
          <div className='text-sm text-muted-foreground'>Aktiv monitor</div>
          <div className='text-2xl font-bold text-emerald-700'>
            {stats.activeMonitors}
          </div>
        </div>
        <div className='rounded-xl border border-red-100 bg-red-50 p-4'>
          <div className='text-sm text-muted-foreground'>Passiv monitor</div>
          <div className='text-2xl font-bold text-red-700'>
            {stats.inactiveMonitors}
          </div>
        </div>
        <div className='rounded-xl border border-violet-100 bg-violet-50 p-4'>
          <div className='text-sm text-muted-foreground'>Açar söz</div>
          <div className='text-2xl font-bold text-violet-700'>
            {stats.keywordCount}
          </div>
        </div>
        <div className='rounded-xl border border-sky-100 bg-sky-50 p-4'>
          <div className='text-sm text-muted-foreground'>Son nəticələr</div>
          <div className='text-2xl font-bold text-sky-700'>
            {stats.resultCount}
          </div>
        </div>
      </div>

      <div className='grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_auto]'>
        <div>
          <div className='mb-2 text-sm font-medium'>Telegram bağlantısı</div>
          <input
            value={telegramChatId}
            onChange={(event) => setTelegramChatId(event.target.value)}
            placeholder='Telegram chat id'
            className='w-full rounded-lg border bg-background px-3 py-2'
          />
        </div>
        <button
          type='button'
          onClick={saveTelegram}
          className='self-end rounded-lg bg-primary px-4 py-2 text-primary-foreground'
        >
          Telegramı yenilə
        </button>
      </div>

      <div className='rounded-xl border bg-card p-4'>
        <div className='mb-3 font-semibold'>Yeni monitor yarat</div>
        <div className='grid gap-3 md:grid-cols-[1fr_1fr_auto]'>
          <input
            value={newMonitorName}
            onChange={(event) => setNewMonitorName(event.target.value)}
            placeholder='Monitor adı'
            className='rounded-lg border bg-background px-3 py-2'
          />
          <input
            value={newMonitorDescription}
            onChange={(event) => setNewMonitorDescription(event.target.value)}
            placeholder='Qısa təsvir'
            className='rounded-lg border bg-background px-3 py-2'
          />
          <button
            type='button'
            onClick={createMonitor}
            className='rounded-lg border bg-card px-4 py-2 hover:bg-muted'
          >
            Yarat
          </button>
        </div>
      </div>

      <div className='grid gap-4'>
        {monitors.map((monitor) => {
          const monitorKeywords = keywords.filter(
            (keyword) => keyword.monitor_id === monitor.id
          )
          const monitorMatches = matches.filter(
            (match) => match.monitor_id === monitor.id
          )

          return (
            <div key={monitor.id} className='rounded-xl border bg-card p-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <div className='text-lg font-semibold'>{monitor.name}</div>
                  <div className='text-sm text-muted-foreground'>
                    {monitor.description || 'Təsvir yoxdur'}
                  </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs ${
                      monitor.status === 'active'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {monitor.status === 'active' ? 'Aktiv' : 'Passiv'}
                  </span>
                  <button
                    type='button'
                    onClick={() => toggleMonitor(monitor)}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      monitor.status === 'active'
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {monitor.status === 'active' ? 'Passiv et' : 'Aktiv et'}
                  </button>
                  <button
                    type='button'
                    onClick={() => deleteMonitor(monitor)}
                    className='rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100'
                  >
                    Sil
                  </button>
                </div>
              </div>

              <div className='mt-4 grid gap-3 md:grid-cols-3'>
                <div className='rounded-lg bg-violet-50 p-3'>
                  <div className='text-lg font-bold text-violet-700'>
                    {monitorKeywords.length}
                  </div>
                  <div className='text-xs text-muted-foreground'>Açar söz</div>
                </div>
                <div className='rounded-lg bg-sky-50 p-3'>
                  <div className='text-lg font-bold text-sky-700'>
                    {monitorMatches.length}
                  </div>
                  <div className='text-xs text-muted-foreground'>Nəticə</div>
                </div>
                <div className='rounded-lg bg-emerald-50 p-3'>
                  <div className='text-lg font-bold text-emerald-700'>
                    {formatDate(monitor.created_at)}
                  </div>
                  <div className='text-xs text-muted-foreground'>Yaradılıb</div>
                </div>
              </div>

              <div className='mt-4'>
                <div className='mb-2 text-sm font-medium'>Açar sözlər</div>
                <div className='flex flex-wrap gap-2'>
                  {monitorKeywords.map((keyword) => (
                    <button
                      key={keyword.id}
                      type='button'
                      onClick={() => deleteKeyword(keyword)}
                      className='rounded-full border px-3 py-1 text-sm hover:bg-red-50 hover:text-red-700'
                      title='Silmək üçün kliklə'
                    >
                      {keyword.keyword}
                    </button>
                  ))}
                  {monitorKeywords.length === 0 ? (
                    <span className='text-sm text-muted-foreground'>
                      Açar söz yoxdur
                    </span>
                  ) : null}
                </div>
                <div className='mt-3 grid gap-2 md:grid-cols-[1fr_auto]'>
                  <input
                    value={newKeywordByMonitor[monitor.id] || ''}
                    onChange={(event) =>
                      setNewKeywordByMonitor((current) => ({
                        ...current,
                        [monitor.id]: event.target.value,
                      }))
                    }
                    placeholder='Yeni açar söz'
                    className='rounded-lg border bg-background px-3 py-2'
                  />
                  <button
                    type='button'
                    onClick={() => addKeyword(monitor.id)}
                    className='rounded-lg border px-4 py-2 hover:bg-muted'
                  >
                    Əlavə et
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {monitors.length === 0 ? (
          <div className='rounded-xl border bg-card p-8 text-center text-muted-foreground'>
            Bu istifadəçinin monitoru yoxdur. Buradan yeni monitor yarada
            bilərsən.
          </div>
        ) : null}
      </div>

      <div className='rounded-xl border bg-card p-4'>
        <div className='mb-3 font-semibold'>Son tapılan xəbərlər</div>
        <div className='grid gap-2'>
          {recentRows.map(({ match, item, source }) => (
            <a
              key={match.id}
              href={item?.url || '#'}
              target='_blank'
              rel='noreferrer'
              className='rounded-lg border p-3 hover:bg-muted/40'
            >
              <div className='font-medium'>
                {item?.title || 'Başlıq yoxdur'}
              </div>
              <div className='mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground'>
                <span>{source?.name || 'Mənbə yoxdur'}</span>
                <span>{match.matched_keyword || 'Açar söz yoxdur'}</span>
                <span>
                  {formatDate(item?.published_at || match.created_at)}
                </span>
              </div>
            </a>
          ))}
          {recentRows.length === 0 ? (
            <div className='text-sm text-muted-foreground'>Nəticə yoxdur.</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/(auth)/admin/users/$userId')({
  component: AdminUserDetailsPage,
})
