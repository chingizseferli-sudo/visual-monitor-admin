import { Link } from '@tanstack/react-router'
import { ShieldCheck, Sparkles } from 'lucide-react'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className='min-h-svh bg-[#f7f9fd] text-[#172033]'>
      <div className='mx-auto grid min-h-svh max-w-7xl gap-8 px-4 py-6 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-10'>
        <section className='hidden lg:block'>
          <Link to='/' className='inline-flex items-center gap-3 font-extrabold text-slate-950'>
            <span className='grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 text-white'>
              V
            </span>
            <span>Vizual.Az</span>
          </Link>

          <div className='mt-16 max-w-xl'>
            <div className='inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-sm font-bold text-[#1463ff]'>
              <Sparkles className='h-4 w-4' />
              Communication Intelligence Platform
            </div>
            <h1 className='mt-6 text-5xl font-black tracking-tight text-slate-950'>
              Monitor. Understand. Decide.
            </h1>
            <p className='mt-5 text-lg leading-8 text-slate-600'>
              İstifadəçi workspace-inə təhlükəsiz giriş edin, monitorlarınızı,
              nəticələri və bildirişləri bir yerdə izləyin.
            </p>
          </div>

          <div className='mt-10 grid max-w-xl gap-3'>
            {[
              'Media materialları açar sözlər üzrə izlənir',
              'Bildirişlər və nəticələr istifadəçi hesabına bağlıdır',
              'Admin və istifadəçi sahələri ayrı qorunur',
            ].map((item) => (
              <div key={item} className='flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
                <ShieldCheck className='h-5 w-5 text-[#1463ff]' />
                <span className='text-sm font-semibold text-slate-700'>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className='flex min-h-[calc(100svh-3rem)] items-center justify-center lg:min-h-0'>
          <div className='w-full max-w-md'>
            <div className='mb-6 flex items-center justify-center gap-3 lg:hidden'>
              <span className='grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 text-sm font-black text-white'>
                V
              </span>
              <div>
                <div className='font-extrabold text-slate-950'>Vizual.Az</div>
                <div className='text-xs text-slate-500'>İstifadəçi girişi</div>
              </div>
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}