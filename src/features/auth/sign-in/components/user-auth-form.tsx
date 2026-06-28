import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { getAuthErrorMessage } from '../../auth-messages'

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Email ünvanınızı daxil edin.' : undefined),
  }),
  password: z
    .string()
    .min(1, 'Şifrənizi daxil edin.')
    .min(7, 'Şifrə ən azı 7 simvol olmalıdır.'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

type UserProfile = {
  user_id: string
  email: string | null
  role: string | null
  status: string | null
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    const { data: authData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

    if (signInError || !authData.user) {
      setIsLoading(false)
      toast.error(getAuthErrorMessage(signInError?.message))
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id,email,role,status')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (profileError || !profileData) {
      await supabase.auth.signOut()
      setIsLoading(false)
      toast.error('Profil tapılmadı. Adminlə əlaqə saxlayın.')
      return
    }

    const profile = profileData as UserProfile

    if (profile.status === 'blocked') {
      await supabase.auth.signOut()
      setIsLoading(false)
      toast.error('Hesab bloklanıb.')
      return
    }

    const role = profile.role || 'customer'
    const isAdmin = role === 'admin' || role === 'superadmin'
    const fallbackPath = isAdmin ? '/admin' : '/monitor'
    const safeRedirect =
      redirectTo &&
      ((isAdmin && redirectTo.startsWith('/admin')) ||
        (!isAdmin && redirectTo.startsWith('/monitor')))
        ? redirectTo
        : fallbackPath

    setIsLoading(false)
    toast.success('Giriş uğurludur.')
    await navigate({
      to: safeRedirect,
      replace: true,
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-4', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder='name@example.com' autoComplete='email' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>Şifrə</FormLabel>
              <FormControl>
                <PasswordInput placeholder='••••••••' autoComplete='current-password' {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='absolute inset-e-0 -top-0.5 text-sm font-medium text-muted-foreground hover:text-[#1463ff]'
              >
                Şifrəni unutmusunuz?
              </Link>
            </FormItem>
          )}
        />
        <Button className='mt-2 h-11 bg-[#1463ff] font-bold hover:bg-blue-700' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          {isLoading ? 'Daxil olunur...' : 'Daxil ol'}
        </Button>
      </form>
    </Form>
  )
}