import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  LogOut,
  Radio,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import {
  CurrentProfile,
  getCurrentSupabaseProfile,
} from '@/lib/auth-session'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { prefetchCustomerRoute } from '@/lib/customer-prefetch'
import { SignOutDialog } from '@/components/sign-out-dialog'

const customerNavItems = [
  {
    title: 'Panel',
    url: '/monitor',
    icon: LayoutDashboard,
  },
  {
    title: 'Monitorlar',
    url: '/monitor/monitors',
    icon: Radio,
  },
  {
    title: 'Nəticələr',
    url: '/monitor/results',
    icon: BarChart3,
  },
  {
    title: 'Bildirişlər',
    url: '/monitor/alerts',
    icon: Bell,
  },
  {
    title: 'Profil',
    url: '/monitor/profile',
    icon: UserRound,
  },
] as const

function isActivePath(href: string, url: string) {
  const pathname = href.split('?')[0]

  if (url === '/monitor') {
    return pathname === url
  }

  return pathname === url || pathname.startsWith(`${url}/`)
}

function getDisplayEmail(session: CurrentProfile | null) {
  return session?.profile?.email ?? session?.user?.email ?? '—'
}

function getDisplayRole(session: CurrentProfile | null) {
  const role = session?.profile?.role

  if (role === 'superadmin') return 'Superadmin'
  if (role === 'admin') return 'Admin'
  if (role === 'customer') return 'İstifadəçi'

  return 'İstifadəçi'
}

export function CustomerSidebar() {
  const href = useLocation({ select: (location) => location.href })
  const { setOpenMobile } = useSidebar()
  const queryClient = useQueryClient()
  const [openSignOut, setOpenSignOut] = useDialogState()
  const [sessionProfile, setSessionProfile] = useState<CurrentProfile | null>(
    null
  )

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
    <>
      <Sidebar collapsible='icon'>
        <SidebarHeader>
          <div className='flex items-center gap-2 rounded-lg px-2 py-2'>
            <div className='flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
              <ShieldCheck className='size-5' />
            </div>
            <div className='grid min-w-0 group-data-[collapsible=icon]:hidden'>
              <span className='truncate text-sm font-semibold'>
                Visual Monitor
              </span>
              <span className='truncate text-xs text-muted-foreground'>
                İstifadəçi paneli
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Monitorinq</SidebarGroupLabel>
            <SidebarMenu>
              {customerNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActivePath(href, item.url)}
                    tooltip={item.title}
                  >
                    <Link
                      to={item.url}
                      preload='intent'
                      onMouseEnter={() => prefetchCustomerRoute(queryClient, item.url)}
                      onFocus={() => prefetchCustomerRoute(queryClient, item.url)}
                      onClick={() => setOpenMobile(false)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className='grid gap-2 rounded-lg border bg-background p-2 group-data-[collapsible=icon]:hidden'>
            <div className='min-w-0'>
              <div className='truncate text-sm font-medium'>
                {getDisplayRole(sessionProfile)}
              </div>
              <div className='truncate text-xs text-muted-foreground'>
                {getDisplayEmail(sessionProfile)}
              </div>
            </div>
            <button
              type='button'
              onClick={() => setOpenSignOut(true)}
              className='inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted'
            >
              <LogOut className='size-4' />
              Çıxış
            </button>
          </div>
          <SidebarMenu className='hidden group-data-[collapsible=icon]:flex'>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip='Çıxış'
                onClick={() => setOpenSignOut(true)}
              >
                <LogOut />
                <span>Çıxış</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SignOutDialog open={!!openSignOut} onOpenChange={setOpenSignOut} />
    </>
  )
}
