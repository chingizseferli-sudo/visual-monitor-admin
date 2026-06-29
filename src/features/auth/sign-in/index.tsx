import { Link } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

type SignInProps = {
  mode?: 'customer' | 'admin'
  redirectTo?: string
}

function AdminSignIn({ redirectTo }: { redirectTo?: string }) {
  return (
    <main className='flex min-h-svh items-center justify-center bg-slate-50 px-4 py-10 text-slate-950'>
      <div className='w-full max-w-md'>
        <div className='mb-6 flex items-center justify-center gap-3'>
          <span className='grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white'>
            V
          </span>
          <div>
            <div className='text-lg font-black'>Vizual.Az</div>
            <div className='text-xs font-medium text-slate-500'>Admin panel</div>
          </div>
        </div>

        <Card className='rounded-2xl border-slate-200 bg-white shadow-sm'>
          <CardHeader className='space-y-3 text-center'>
            <div className='mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-900'>
              <ShieldCheck className='h-6 w-6' />
            </div>
            <div>
              <CardTitle className='text-2xl font-black tracking-tight'>
                Admin panelə giriş
              </CardTitle>
              <CardDescription className='mt-2 leading-6'>
                Bu giriş yalnız admin və superadmin hesabları üçündür.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <UserAuthForm redirectTo={redirectTo} mode='admin' />
          </CardContent>
          <CardFooter>
            <p className='w-full text-center text-xs leading-5 text-muted-foreground'>
              Admin icazəsi ayrıca yoxlanılır. İstifadəçi workspace-i üçün ayrıca girişdən istifadə edin.
            </p>
          </CardFooter>
        </Card>

        <div className='mt-5 text-center text-sm text-slate-500'>
          <Link to='/' className='font-semibold text-slate-700 hover:text-slate-950'>
            Sayta qayıt
          </Link>
        </div>
      </div>
    </main>
  )
}

export function SignIn({ mode = 'customer', redirectTo }: SignInProps) {
  if (mode === 'admin') {
    return <AdminSignIn redirectTo={redirectTo} />
  }

  return (
    <AuthLayout>
      <Card className='gap-4 rounded-3xl border-slate-200 bg-white/95 shadow-[0_28px_70px_rgba(22,42,84,0.16)]'>
        <CardHeader className='space-y-3'>
          <div className='inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1463ff]'>
            İstifadəçi workspace-i
          </div>
          <CardTitle className='text-2xl font-black tracking-tight text-slate-950'>
            Hesabınıza daxil olun
          </CardTitle>
          <CardDescription className='leading-6'>
            Monitorlarınızı, nəticələri və bildirişləri görmək üçün email və şifrənizi yazın.
            Hesabınız yoxdur?{' '}
            <Link
              to='/sign-up'
              className='font-semibold text-[#1463ff] underline underline-offset-4 hover:text-blue-700'
            >
              Qeydiyyatdan keçin
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirectTo} mode='customer' />
        </CardContent>
        <CardFooter>
          <p className='px-2 text-center text-xs leading-5 text-muted-foreground'>
            Bu giriş istifadəçi workspace-i üçündür. Admin panelə ayrıca admin girişindən daxil olun.
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
