import { supabase } from '@/lib/supabase'

export type CurrentProfile = {
  user: {
    id: string
    email: string | null
  } | null
  profile: {
    user_id: string
    email: string | null
    role: string | null
    status: string | null
    telegram_chat_id: string | null
  } | null
  isAuthenticated: boolean
  isAdmin: boolean
  isBlocked: boolean
  error: string | null
}

const unauthenticatedProfile: CurrentProfile = {
  user: null,
  profile: null,
  isAuthenticated: false,
  isAdmin: false,
  isBlocked: false,
  error: null,
}

export async function getCurrentSupabaseProfile(): Promise<CurrentProfile> {
  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession()

    if (sessionError) {
      return { ...unauthenticatedProfile, error: sessionError.message }
    }

    if (!sessionData.session) {
      return unauthenticatedProfile
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      return {
        ...unauthenticatedProfile,
        error: userError?.message ?? 'Session user could not be loaded.',
      }
    }

    const user = {
      id: userData.user.id,
      email: userData.user.email ?? null,
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id,email,role,status,telegram_chat_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return {
        user,
        profile: null,
        isAuthenticated: true,
        isAdmin: false,
        isBlocked: false,
        error: profileError?.message ?? 'Profile not found.',
      }
    }

    const role = profile.role ?? ''
    const status = profile.status ?? ''

    return {
      user,
      profile,
      isAuthenticated: true,
      isAdmin: role === 'admin' || role === 'superadmin',
      isBlocked: status === 'blocked',
      error: null,
    }
  } catch (error) {
    return {
      ...unauthenticatedProfile,
      error:
        error instanceof Error
          ? error.message
          : 'Session could not be restored.',
    }
  }
}
