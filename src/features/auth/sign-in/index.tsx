import { Link } from '@tanstack/react-router'
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

export function SignIn({ mode = 'customer', redirectTo }: SignInProps) {
  const isAdmin = mode === 'admin'

  return (
    <AuthLayout>
      <Card className='gap-4 rounded-3xl border-slate-200 bg-white/95 shadow-[0_28px_70px_rgba(22,42,84,0.16)]'>
        <CardHeader className='space-y-3'>
          <div className='inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1463ff]'>
            {isAdmin ? 'Admin panel' : 'İstifadəçi workspace-i'}
          </div>
          <CardTitle className='text-2xl font-black tracking-tight text-slate-950'>
            {isAdmin ? 'Admin hesabına daxil olun' : 'Hesabınıza daxil olun'}
          </CardTitle>
          <CardDescription className='leading-6'>
            {isAdmin ? (
              'Bu giriş yalnız admin və superadmin hesabları üçündür.'
            ) : (
              <>
                Monitorlarınızı, nəticələri və bildirişləri görmək üçün email və şifrənizi yazın.
                Hesabınız yoxdur?{' '}
                <Link
                  to='/sign-up'
                  className='font-semibold text-[#1463ff] underline underline-offset-4 hover:text-blue-700'
                >
                  Qeydiyyatdan keçin
                </Link>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirectTo} mode={mode} />
        </CardContent>
        <CardFooter>
          <p className='px-2 text-center text-xs leading-5 text-muted-foreground'>
            {isAdmin
              ? 'Admin girişi rol əsaslı yoxlama ilə qorunur. İstifadəçi hesabları bu girişdən keçə bilməz.'
              : 'Bu giriş yalnız istifadəçi workspace-i üçündür. Admin hesabları ayrıca admin girişindən istifadə etməlidir.'}
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}