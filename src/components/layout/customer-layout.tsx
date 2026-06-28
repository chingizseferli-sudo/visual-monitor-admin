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
          <div className='min-h-svh w-full bg-[#f7f9fd] text-[#172033]'>
            <CustomerSidebar />
            <SidebarInset className='bg-transparent'>
              <header className='sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-[#f7f9fd]/90 px-4 backdrop-blur md:px-6'>
                <div className='flex min-w-0 items-center gap-3'>
                  <SidebarTrigger variant='outline' className='bg-white' />
                  <div className='min-w-0'>
                    <div className='truncate text-sm font-extrabold text-slate-950'>
                      İstifadəçi workspace-i
                    </div>
                    <div className='truncate text-xs text-slate-500'>
                      Monitorlar, nəticələr və bildirişlər
                    </div>
                  </div>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='shrink-0 gap-2 rounded-lg border-slate-200 bg-white'
                  onClick={() => setOpenSignOut(true)}
                >
                  <LogOut className='size-4' />
                  Çıxış
                </Button>
              </header>
              <div className='mx-auto w-full max-w-7xl'>
                <Outlet />
              </div>
              <SignOutDialog open={!!openSignOut} onOpenChange={setOpenSignOut} />
            </SidebarInset>
          </div>
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}