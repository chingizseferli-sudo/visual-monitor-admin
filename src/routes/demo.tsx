import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { PublicCard, PublicPageHero, PublicPageShell } from "@/components/public-site/public-site-shell";

const demoRows = [
  { source: "edu.gov.az", topic: "qəbul prosesi", title: "Qəbul prosesi ilə bağlı yeni açıqlama yayımlandı" },
  { source: "azertag.az", topic: "təşkilat adı", title: "Təşkilat adı media gündəmində qeyd olundu" },
  { source: "workspace", topic: "bildiriş", title: "Vacib uyğunluq üzrə bildiriş göndərildi" },
];

function DemoPage() {
  return (
    <PublicPageShell>
      <main>
        <PublicPageHero eyebrow="Demo" title="Məhsulu real iş axını kimi görün" description="Demo səhifəsi application deyil. Burada Vizual.Az-ın gündəlik iş məntiqi təhlükəsiz və statik formada göstərilir.">
          <div className="flex flex-wrap gap-3">
            <Link to="/monitor/workspace-preview" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#1463ff] px-4 text-sm font-bold text-white hover:bg-blue-700"><PlayCircle className="h-4 w-4" />Demo Workspace</Link>
            <Link to="/contact" className="inline-flex h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50">Canlı demo istə</Link>
          </div>
        </PublicPageHero>
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-16 md:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <PublicCard>
            <h2 className="text-xl font-extrabold">Demo videosu</h2>
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <PlayCircle className="mx-auto h-12 w-12 text-slate-500" />
              <p className="mt-4 font-bold text-slate-700">Video placeholder</p>
            </div>
          </PublicCard>
          <PublicCard>
            <h2 className="text-xl font-extrabold">Demo Workspace axını</h2>
            <div className="mt-5 grid gap-3">
              {demoRows.map((row) => (
                <article key={row.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">{row.source} • {row.topic}</p>
                  <h3 className="mt-2 text-sm font-extrabold leading-6">{row.title}</h3>
                </article>
              ))}
            </div>
          </PublicCard>
        </section>
      </main>
    </PublicPageShell>
  );
}

export const Route = createFileRoute("/demo")({ component: DemoPage });