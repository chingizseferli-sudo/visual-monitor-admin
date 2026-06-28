import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f7f9fd]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link to="/" className="flex items-center gap-3 font-extrabold text-slate-950">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 text-white">
            V
          </span>
          <span>Vizual.Az</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
          <Link to="/solutions" className="hover:text-slate-950">Xidmətlər</Link>
          <Link to="/demo" className="hover:text-slate-950">Demo</Link>
          <Link to="/pricing" className="hover:text-slate-950">Qiymətlər</Link>
          <Link to="/blog" className="hover:text-slate-950">Blog</Link>
          <Link to="/about" className="hover:text-slate-950">Haqqımızda</Link>
          <Link to="/contact" className="hover:text-slate-950">Əlaqə</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/sign-in" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
            Login
          </Link>
          <Link to="/demo" className="rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-bold text-white shadow-[0_12px_26px_rgba(20,99,255,0.22)] hover:bg-blue-700">
            Demo istə
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p>© 2026 Vizual.Az. Communication Intelligence Platform.</p>
        <div className="flex justify-center gap-4">
          <Link to="/sign-in" className="font-semibold text-slate-700 hover:text-slate-950">Login</Link>
          <Link to="/sign-up" className="font-semibold text-slate-700 hover:text-slate-950">Register</Link>
        </div>
      </div>
    </footer>
  );
}

export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f9fd] text-[#172033]">
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}

export function PublicPageHero({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
      <div className="max-w-3xl">
        <p className="text-sm font-extrabold uppercase tracking-wide text-[#1463ff]">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">{description}</p>
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center">
      <p className="text-sm font-extrabold uppercase tracking-wide text-[#1463ff]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-7 text-slate-600">{description}</p> : null}
    </div>
  );
}

export function PublicCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <article className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</article>;
}