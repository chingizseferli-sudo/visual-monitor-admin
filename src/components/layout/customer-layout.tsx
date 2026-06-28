import { Outlet } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { getCookie } from '@/lib/cookies'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import useDialogState from '@/hooks/use-dialog-state'
import { Button } from '@/components/ui/button'
import { CustomerSidebar } from '@/components/layout/customer-sidebar'
import { SignOutDialog } from '@/components/sign-out-dialog'

export function CustomerLayout() {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  const [openSignOut, setOpenSignOut] = useDialogState()

  return (
    <SearchProvider>
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <CustomerSidebar />
          <SidebarInset>
            <header className='sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur'>
              <div className='flex min-w-0 items-center gap-3'>
                <SidebarTrigger variant='outline' />
                <div className='min-w-0'>
                  <div className='truncate text-sm font-semibold'>
                    Ä°stifadÉ™Ã§i paneli
                  </div>
                  <div className='truncate text-xs text-muted-foreground'>
                    Monitorlar, nÉ™ticÉ™lÉ™r vÉ™ bildiriÅŸlÉ™r
                  </div>
                </div>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='shrink-0 gap-2'
                onClick={() => setOpenSignOut(true)}
              >
                <LogOut className='size-4' />
                Ã‡Ä±xÄ±ÅŸ
              </Button>
            </header>
            <Outlet />
            <SignOutDialog open={!!openSignOut} onOpenChange={setOpenSignOut} />
          </SidebarInset>
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
