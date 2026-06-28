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
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  return (
    <AuthLayout>
      <Card className='max-w-sm gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Hesab yaradın
          </CardTitle>
          <CardDescription>
            Hesab yaratmaq üçün email və şifrənizi yazın. <br />
            Artıq hesabınız var?{' '}
            <Link
              to='/sign-in'
              className='underline underline-offset-4 hover:text-primary'
            >
              Daxil olun
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            Hesab yaratmaqla{' '}
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
