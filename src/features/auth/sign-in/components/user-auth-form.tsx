import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { IconFacebook, IconGithub } from '@/assets/brand-icons'
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
      toast.error(signInError?.message || 'Giriş mümkün olmadı.')
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
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder='name@example.com' {...field} />
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
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='absolute inset-e-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75'
              >
                Şifrəni unutmusunuz?
              </Link>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          Daxil ol
        </Button>

        <div className='relative my-2'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background px-2 text-muted-foreground'>
              Və ya davam edin
            </span>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconGithub className='h-4 w-4' /> GitHub
          </Button>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconFacebook className='h-4 w-4' /> Facebook
          </Button>
        </div>
      </form>
    </Form>
  )
}
