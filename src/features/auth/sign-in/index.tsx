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
      <Card className='max-w-sm gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>Daxil ol</CardTitle>
          <CardDescription>
            Hesabınıza daxil olmaq üçün email və şifrənizi yazın.{' '}
            <br className='max-sm:hidden' /> Hesabınız yoxdur?{' '}
            <Link
              to='/sign-up'
              className='text-nowrap underline underline-offset-4 hover:text-primary'
            >
              Hesab yaradın
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            Daxil olmaqla{' '}
            <a
              href='/terms'
              className='underline underline-offset-4 hover:text-primary'
            >
              İstifadə şərtləri
            </a>{' '}
            və{' '}
            <a
              href='/privacy'
              className='underline underline-offset-4 hover:text-primary'
            >
              Məxfilik siyasəti
            </a>{' '}
            ilə razılaşırsınız.
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
