import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe2, Megaphone, Newspaper, RadioTower, Search } from "lucide-react";
import { PublicCard, PublicPageHero, PublicPageShell, SectionHeading } from "@/components/public-site/public-site-shell";

const services = [
  { title: "Media Monitoring", status: "Aktiv", icon: Newspaper, text: "Açar sözlərə görə media materiallarını izləyin, nəticələri workspace-də görün və vacib uyğunluqlar üzrə bildiriş alın." },
  { title: "Website Change Monitoring", status: "Aktiv", icon: RadioTower, text: "Seçilmiş veb səhifə hissələrində dəyişiklikləri izləyin və yeni dəyişiklikləri tarixçədə görün." },
  { title: "PR Intelligence", status: "Coming Soon", icon: Megaphone, text: "PR siqnalları, reputasiya riskləri və kommunikasiya təsiri üçün geniş analitika qatı." },
  { title: "Social Intelligence", status: "Coming Soon", icon: Globe2, text: "Sosial platformalarda ictimai reaksiyaları izləmək üçün gələcək modul." },
  { title: "Global News Discovery", status: "Coming Soon", icon: Search, text: "Qlobal xəbər mənbələrində təşkilat və mövzu görünürlüğünü izləmək üçün gələcək modul." },
];

function SolutionsPage() {
  return (
    <PublicPageShell>
      <main>
        <PublicPageHero
          eyebrow="Xidmətlər"
          title="Kommunikasiya siqnallarını bir yerdə izləyin"
          description="Vizual.Az media monitorinq, vebsayt dəyişikliklərinin izlənməsi və gələcək PR intelligence modulları üçün vahid platforma kimi qurulur."
        >
          <Link to="/demo" className="inline-flex h-11 items-center rounded-lg bg-[#1463ff] px-4 text-sm font-bold text-white hover:bg-blue-700">
            Demo istə
          </Link>
        </PublicPageHero>

        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {services.map((service) => (
              <PublicCard key={service.title}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1463ff]">
                  <service.icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 font-extrabold text-slate-950">{service.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{service.text}</p>
                <span className="mt-4 inline-flex rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600">{service.status}</span>
              </PublicCard>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <SectionHeading eyebrow="İstifadə ssenariləri" title="Hər modul konkret iş problemini həll edir" />
          <div className="grid gap-4 md:grid-cols-3">
            <PublicCard><h3 className="font-extrabold">Gündəlik media xülasəsi</h3><p className="mt-2 text-sm leading-6 text-slate-600">Komanda səhər ilk olaraq yeni media materiallarını və vacib bildirişləri görür.</p></PublicCard>
            <PublicCard><h3 className="font-extrabold">Reputasiya izləmə</h3><p className="mt-2 text-sm leading-6 text-slate-600">Təşkilat adı, rəhbər şəxs, layihə və kampaniya mövzuları izlənir.</p></PublicCard>
            <PublicCard><h3 className="font-extrabold">Veb dəyişiklik izləmə</h3><p className="mt-2 text-sm leading-6 text-slate-600">Seçilmiş səhifə sahələri dəyişdikdə tarixçə və bildiriş yaranır.</p></PublicCard>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}

export const Route = createFileRoute("/solutions")({ component: SolutionsPage });