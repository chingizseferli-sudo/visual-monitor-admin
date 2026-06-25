import { useEffect, useState } from 'react'
import { Outlet } from '@tanstack/react-router'
import {
  CurrentProfile,
  getCurrentSupabaseProfile,
} from '@/lib/auth-session'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

function getRoleLabel(role?: string | null) {
  if (role === 'superadmin') return 'Superadmin'
  if (role === 'admin') return 'Admin'
  if (role === 'customer') return 'Müştəri'
  return 'Visual Monitor'
}

function getSidebarUser(session: CurrentProfile | null) {
  const email = session?.profile?.email ?? session?.user?.email

  if (!email) {
    return undefined
  }

  return {
    name: getRoleLabel(session?.profile?.role),
    email,
    avatar: '/avatars/shadcn.jpg',
  }
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [sessionProfile, setSessionProfile] = useState<CurrentProfile | null>(
    null
  )
  const defaultOpen = getCookie('sidebar_state') !== 'false'

  useEffect(() => {
    let mounted = true

    getCurrentSupabaseProfile().then((profile) => {
      if (mounted) {
        setSessionProfile(profile)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <SearchProvider>
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <AppSidebar user={getSidebarUser(sessionProfile)} />
          <SidebarInset
            className={cn(
              // Set content container, so we can use container queries
              '@container/content',

              // If layout is fixed, set the height
              // to 100svh to prevent overflow
              'has-data-[layout=fixed]:h-svh',

              // If layout is fixed and sidebar is inset,
              // set the height to 100svh - spacing (total margins) to prevent overflow
              'peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]'
            )}
          >
            {children ?? <Outlet />}
          </SidebarInset>
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
