import { Outlet } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookies'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { CustomerSidebar } from '@/components/layout/customer-sidebar'

export function CustomerLayout() {
  const defaultOpen = getCookie('sidebar_state') !== 'false'

  return (
    <SearchProvider>
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <CustomerSidebar />
          <SidebarInset>
            <header className='sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur'>
              <SidebarTrigger variant='outline' />
              <div className='min-w-0'>
                <div className='truncate text-sm font-semibold'>
                  İstifadəçi paneli
                </div>
                <div className='truncate text-xs text-muted-foreground'>
                  Monitorlar, nəticələr və bildirişlər
                </div>
              </div>
            </header>
            <Outlet />
          </SidebarInset>
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
