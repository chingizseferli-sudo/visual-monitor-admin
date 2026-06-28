import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  CurrentProfile,
  getCurrentSupabaseProfile,
} from '@/lib/auth-session'

type ProtectedRouteProps = {
  allowedRoles: string[]
  unauthorizedRedirect?: '/monitor' | '/sign-in'
  children: React.ReactNode
}

export function ProtectedRoute({
  allowedRoles,
  unauthorizedRedirect = '/sign-in',
  children,
}: ProtectedRouteProps) {
  const navigate = useNavigate()
  const [sessionProfile, setSessionProfile] = useState<CurrentProfile | null>(
    null
  )
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    getCurrentSupabaseProfile().then((profile) => {
      if (!mounted) return

      setSessionProfile(profile)
      setIsChecking(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (isChecking || !sessionProfile) return

    if (
      !sessionProfile.isAuthenticated ||
      sessionProfile.isBlocked ||
      sessionProfile.error ||
      !sessionProfile.profile
    ) {
      void navigate({ to: '/sign-in', replace: true })
      return
    }

    const role = sessionProfile.profile.role ?? 'customer'

    if (!allowedRoles.includes(role)) {
      void navigate({ to: unauthorizedRedirect, replace: true })
    }
  }, [allowedRoles, isChecking, navigate, sessionProfile, unauthorizedRedirect])

  if (isChecking || !sessionProfile) {
    return <div className='p-6 text-sm text-muted-foreground'>Yüklənir...</div>
  }

  if (
    !sessionProfile.isAuthenticated ||
    sessionProfile.isBlocked ||
    sessionProfile.error ||
    !sessionProfile.profile
  ) {
    return <div className='p-6 text-sm text-muted-foreground'>Yüklənir...</div>
  }

  const role = sessionProfile.profile.role ?? 'customer'

  if (!allowedRoles.includes(role)) {
    return <div className='p-6 text-sm text-muted-foreground'>Yüklənir...</div>
  }

  return children
}
