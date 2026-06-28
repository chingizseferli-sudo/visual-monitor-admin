import { createFileRoute } from "@tanstack/react-router";
import { Building2, ShieldCheck, Sparkles } from "lucide-react";
import { PublicCard, PublicPageHero, PublicPageShell, SectionHeading } from "@/components/public-site/public-site-shell";

const principles = [
  { title: "Lokal bazar üçün", text: "Azərbaycan media və təşkilat reallıqlarına uyğun monitorinq yanaşması.", icon: Building2 },
  { title: "Etibarlı əməliyyat", text: "Workspace və admin qatları ayrı saxlanılır, təhlükəsizlik application daxilində qorunur.", icon: ShieldCheck },
  { title: "Qərar üçün siqnal", text: "Məqsəd daha çox data yox, daha aydın gündəlik kommunikasiya siqnalıdır.", icon: Sparkles },
];

function AboutPage() {
  return (
    <PublicPageShell>
      <main>
        <PublicPageHero eyebrow="Haqqımızda" title="Vizual.Az kommunikasiya komandaları üçün qurulur" description="Platformanın məqsədi media görünürlüğünü, vebsayt dəyişikliklərini və vacib kommunikasiya siqnallarını daha aydın izlənən gündəlik iş axınına çevirməkdir." />
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <SectionHeading eyebrow="Prinsiplər" title="Public website application deyil" description="Məhsul üç ayrı dünyadan ibarətdir: public website, customer workspace və admin." />
          <div className="grid gap-4 md:grid-cols-3">
            {principles.map((item) => (
              <PublicCard key={item.title}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1463ff]"><item.icon className="h-5 w-5" /></div>
                <h2 className="mt-5 text-xl font-extrabold">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
              </PublicCard>
            ))}
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}

export const Route = createFileRoute("/about")({ component: AboutPage });