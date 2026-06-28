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
      <Sidebar collapsible='icon' className='border-slate-200 bg-white/95'>
        <SidebarHeader>
          <div className='flex items-center gap-2 rounded-2xl px-2 py-2'>
            <div className='grid size-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 text-sm font-black text-white'>
              V
            </div>
            <div className='grid min-w-0 group-data-[collapsible=icon]:hidden'>
              <span className='truncate text-sm font-extrabold text-slate-950'>
                Vizual.Az
              </span>
              <span className='truncate text-xs text-slate-500'>
                İstifadəçi workspace-i
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className='text-slate-500'>Monitorinq</SidebarGroupLabel>
            <SidebarMenu>
              {customerNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActivePath(href, item.url)}
                    tooltip={item.title}
                    className='rounded-xl'
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
          <div className='grid gap-2 rounded-2xl border border-slate-200 bg-[#f7f9fd] p-3 group-data-[collapsible=icon]:hidden'>
            <div className='min-w-0'>
              <div className='truncate text-sm font-semibold text-slate-950'>
                {getDisplayRole(sessionProfile)}
              </div>
              <div className='truncate text-xs text-slate-500'>
                {getDisplayEmail(sessionProfile)}
              </div>
            </div>
            <button
              type='button'
              onClick={() => setOpenSignOut(true)}
              className='inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50'
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