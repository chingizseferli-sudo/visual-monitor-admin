import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/health/env')({
  component: EnvHealthPage,
})

function getProjectRef(value: string | undefined) {
  if (!value) return 'missing'

  try {
    const hostname = new URL(value).hostname
    return hostname.split('.')[0] || 'unknown'
  } catch {
    return 'invalid_url'
  }
}

function getKeyPrefix(value: string | undefined) {
  if (!value) return 'missing'
  if (value.startsWith('sb_publishable')) return 'sb_publishable'
  if (value.startsWith('eyJ')) return 'eyJ...'
  return 'unknown'
}

function EnvHealthPage() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  const diagnostics = {
    supabaseUrlExists: Boolean(supabaseUrl),
    supabaseProjectRef: getProjectRef(supabaseUrl),
    supabaseAnonKeyExists: Boolean(anonKey),
    supabaseAnonKeyPrefix: getKeyPrefix(anonKey),
    supabaseAnonKeyLength: anonKey?.length ?? 0,
  }

  return (
    <main style={{ fontFamily: 'monospace', padding: 24, whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(diagnostics, null, 2)}
    </main>
  )
}