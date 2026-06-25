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

type AuthUser = {
  id: string
  email: string | null
  phone: string | null
  created_at: string | null
  updated_at: string | null
  last_sign_in_at: string | null
}

type UserMonitor = {
  id: string
  user_id: string
  name: string
  status: string | null
  created_at: string | null
}

type Keyword = {
  id: string
  monitor_id: string
  keyword: string
}

type MonitorMatch = {
  id: string
  monitor_id: string
  created_at: string | null
}

type UserRow = UserProfile & {
  monitors: UserMonitor[]
  keywordCount: number
  resultCount: number
  lastActivity: string | null
  issueLabels: string[]
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

function UsersPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([])
  const [monitors, setMonitors] = useState<UserMonitor[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [matches, setMatches] = useState<MonitorMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  async function loadUsers() {
    setLoading(true)
    setMessage('')

    const [profilesRes, monitorsRes, keywordsRes, matchesRes, authUsersRes] =
      await Promise.all([
        supabase
          .from('user_profiles')
          .select('user_id,email,telegram_chat_id,created_at,updated_at')
          .order('updated_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('user_monitors')
          .select('id,user_id,name,status,created_at')
          .order('created_at', { ascending: false }),
        supabase.from('monitor_keywords').select('id,monitor_id,keyword'),
        supabase
          .from('monitor_matches')
          .select('id,monitor_id,created_at')
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase.functions.invoke<{ users: AuthUser[] }>('admin-users', {
          body: {},
        }),
      ])

    const errors = [
      profilesRes.error,
      monitorsRes.error,
      keywordsRes.error,
      matchesRes.error,
      authUsersRes.error,
    ]
      .filter(Boolean)
      .map((error) => error?.message)

    if (errors.length > 0) {
      setMessage(errors.join(' | '))
    }

    setProfiles((profilesRes.data || []) as UserProfile[])
    setAuthUsers((authUsersRes.data?.users || []) as AuthUser[])
    setMonitors((monitorsRes.data || []) as UserMonitor[])
    setKeywords((keywordsRes.data || []) as Keyword[])
    setMatches((matchesRes.data || []) as MonitorMatch[])
    setLoading(false)
  }

  const rows = useMemo<UserRow[]>(() => {
    const profileByUserId = new Map(
      profiles.map((profile) => [profile.user_id, profile])
    )
    const authByUserId = new Map(authUsers.map((user) => [user.id, user]))
    const userIds = new Set([
      ...authUsers.map((user) => user.id),
      ...profiles.map((profile) => profile.user_id),
      ...monitors.map((monitor) => monitor.user_id),
    ])

    return Array.from(userIds).map((userId) => {
      const authUser = authByUserId.get(userId)
      const profile = profileByUserId.get(userId) || {
        user_id: userId,
        email: authUser?.email || null,
        telegram_chat_id: null,
        created_at: authUser?.created_at || null,
        updated_at: authUser?.updated_at || authUser?.last_sign_in_at || null,
      }
      const userMonitors = monitors.filter(
        (monitor) => monitor.user_id === userId
      )
      const monitorIds = new Set(userMonitors.map((monitor) => monitor.id))
      const userMatches = matches.filter((match) =>
        monitorIds.has(match.monitor_id)
      )
      const keywordCount = keywords.filter((keyword) =>
        monitorIds.has(keyword.monitor_id)
      ).length
      const activeCount = userMonitors.filter(
        (monitor) => monitor.status === 'active'
      ).length
      const issueLabels = [
        !profile.telegram_chat_id ? 'Telegram yoxdur' : '',
        userMonitors.length === 0 ? 'Monitor yoxdur' : '',
        userMonitors.length > 0 && activeCount === 0
          ? 'Aktiv monitor yoxdur'
          : '',
        userMonitors.length > 0 && keywordCount === 0 ? 'Açar söz yoxdur' : '',
      ].filter(Boolean)

      return {
        ...profile,
        monitors: userMonitors,
        keywordCount,
        resultCount: userMatches.length,
        issueLabels,
        lastActivity:
          userMatches[0]?.created_at ||
          userMonitors[0]?.created_at ||
          profile.updated_at ||
          authUser?.last_sign_in_at ||
          profile.created_at ||
          null,
      }
    })
  }, [authUsers, profiles, monitors, keywords, matches])

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim()

    return rows.filter((row) => {
      const hasTelegram = Boolean(row.telegram_chat_id)
      const hasProblem = row.issueLabels.length > 0
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'problem' && hasProblem) ||
        (statusFilter === 'telegram' && hasTelegram) ||
        (statusFilter === 'no_telegram' && !hasTelegram) ||
        (statusFilter === 'has_monitor' && row.monitors.length > 0) ||
        (statusFilter === 'no_monitor' && row.monitors.length === 0)

      if (!matchesStatus) return false
      if (!q) return true

      return (
        (row.email || '').toLowerCase().includes(q) ||
        row.user_id.toLowerCase().includes(q) ||
        (row.telegram_chat_id || '').toLowerCase().includes(q) ||
        row.monitors.some((monitor) => monitor.name.toLowerCase().includes(q))
      )
    })
  }, [rows, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginatedRows = filteredRows.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  )

  const stats = useMemo(() => {
    return {
      total: rows.length,
      problem: rows.filter((row) => row.issueLabels.length > 0).length,
      telegram: rows.filter((row) => row.telegram_chat_id).length,
      withMonitor: rows.filter((row) => row.monitors.length > 0).length,
    }
  }, [rows])

  function resetFilteredView() {
    setPage(1)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  if (loading) {
    return <div className='p-6'>Yüklənir...</div>
  }

  return (
    <div className='grid gap-6 p-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>
          Müştəri idarəetməsi
        </h1>
        <p className='text-muted-foreground'>
          İstifadəçini aç, monitorlarını, açar sözlərini, Telegram bağlantısını
          və nəticələrini eyni yerdən idarə et.
        </p>
      </div>

      {message ? (
        <div className='rounded-xl border bg-card p-4 text-sm text-orange-600'>
          {message}
        </div>
      ) : null}

      <div className='grid gap-4 md:grid-cols-4'>
        <button
          type='button'
          onClick={() => {
            setStatusFilter('all')
            resetFilteredView()
          }}
          className='rounded-xl border border-sky-100 bg-sky-50 p-4 text-left shadow-sm'
        >
          <div className='text-sm text-muted-foreground'>Ümumi istifadəçi</div>
          <div className='text-2xl font-bold text-sky-700'>{stats.total}</div>
        </button>
        <button
          type='button'
          onClick={() => {
            setStatusFilter('problem')
            resetFilteredView()
          }}
          className='rounded-xl border border-orange-100 bg-orange-50 p-4 text-left shadow-sm'
        >
          <div className='text-sm text-muted-foreground'>Müdaxilə lazımdır</div>
          <div className='text-2xl font-bold text-orange-700'>
            {stats.problem}
          </div>
        </button>
        <button
          type='button'
          onClick={() => {
            setStatusFilter('telegram')
            resetFilteredView()
          }}
          className='rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-left shadow-sm'
        >
          <div className='text-sm text-muted-foreground'>Telegram bağlı</div>
          <div className='text-2xl font-bold text-emerald-700'>
            {stats.telegram}
          </div>
        </button>
        <button
          type='button'
          onClick={() => {
            setStatusFilter('has_monitor')
            resetFilteredView()
          }}
          className='rounded-xl border border-violet-100 bg-violet-50 p-4 text-left shadow-sm'
        >
          <div className='text-sm text-muted-foreground'>Monitoru olan</div>
          <div className='text-2xl font-bold text-violet-700'>
            {stats.withMonitor}
          </div>
        </button>
      </div>

      <div className='grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_auto]'>
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            resetFilteredView()
          }}
          placeholder='Email, user id, Telegram və ya monitor üzrə axtar...'
          className='rounded-lg border bg-background px-3 py-2'
        />

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value)
            resetFilteredView()
          }}
          className='rounded-lg border bg-background px-3 py-2'
        >
          <option value='all'>Bütün istifadəçilər</option>
          <option value='problem'>Müdaxilə lazımdır</option>
          <option value='telegram'>Telegram bağlıdır</option>
          <option value='no_telegram'>Telegram yoxdur</option>
          <option value='has_monitor'>Monitoru var</option>
          <option value='no_monitor'>Monitoru yoxdur</option>
        </select>
      </div>

      <div className='grid gap-3'>
        {paginatedRows.map((row) => (
          <Link
            key={row.user_id}
            to='/admin/users/$userId'
            params={{ userId: row.user_id }}
            className='rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:bg-muted/20'
          >
            <div className='grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-center'>
              <div>
                <div className='font-semibold'>
                  {row.email || 'Email qeyd edilməyib'}
                </div>
                <div className='line-clamp-1 text-xs text-muted-foreground'>
                  {row.user_id}
                </div>
                <div className='mt-2 flex flex-wrap gap-2'>
                  {row.issueLabels.length > 0 ? (
                    row.issueLabels.map((label) => (
                      <span
                        key={label}
                        className='rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-xs text-orange-700'
                      >
                        {label}
                      </span>
                    ))
                  ) : (
                    <span className='rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700'>
                      Problem görünmür
                    </span>
                  )}
                </div>
              </div>

              <div className='grid grid-cols-3 gap-2 text-center'>
                <div className='rounded-lg bg-sky-50 p-3'>
                  <div className='text-lg font-bold text-sky-700'>
                    {row.monitors.length}
                  </div>
                  <div className='text-xs text-muted-foreground'>Monitor</div>
                </div>
                <div className='rounded-lg bg-violet-50 p-3'>
                  <div className='text-lg font-bold text-violet-700'>
                    {row.keywordCount}
                  </div>
                  <div className='text-xs text-muted-foreground'>Açar söz</div>
                </div>
                <div className='rounded-lg bg-emerald-50 p-3'>
                  <div className='text-lg font-bold text-emerald-700'>
                    {row.resultCount}
                  </div>
                  <div className='text-xs text-muted-foreground'>Nəticə</div>
                </div>
              </div>

              <div>
                <div
                  className={`inline-flex rounded-full border px-2 py-1 text-xs ${
                    row.telegram_chat_id
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {row.telegram_chat_id
                    ? 'Telegram qoşulub'
                    : 'Telegram yoxdur'}
                </div>
                <div className='mt-2 text-xs text-muted-foreground'>
                  Son aktivlik: {formatDate(row.lastActivity)}
                </div>
              </div>

              <div className='rounded-lg border px-4 py-2 text-center text-sm font-medium'>
                İdarə et
              </div>
            </div>
          </Link>
        ))}

        {filteredRows.length === 0 ? (
          <div className='rounded-xl border bg-card p-10 text-center text-muted-foreground'>
            İstifadəçi tapılmadı.
          </div>
        ) : null}
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4'>
        <div className='text-sm text-muted-foreground'>
          Səhifə <b>{safePage}</b> / <b>{totalPages}</b> · Hər səhifədə{' '}
          <b>{pageSize}</b> istifadəçi
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
    </div>
  )
}

export const Route = createFileRoute('/(auth)/admin/users/')({
  component: UsersPage,
})
