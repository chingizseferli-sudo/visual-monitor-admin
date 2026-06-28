import { Link, useSearch } from '@tanstack/react-router'
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

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

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
              to='/contact'
              className='font-semibold text-[#1463ff] underline underline-offset-4 hover:text-blue-700'
            >
              Demo üçün əlaqə saxlayın
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter>
          <p className='px-2 text-center text-xs leading-5 text-muted-foreground'>
            Giriş mövcud Supabase Auth axını ilə qorunur. Daxil olduqdan sonra rolunuza uyğun sahəyə yönləndiriləcəksiniz.
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}