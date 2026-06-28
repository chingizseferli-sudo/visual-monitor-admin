import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PublicCard, PublicPageHero, PublicPageShell } from "@/components/public-site/public-site-shell";

const plans = [
  { name: "Free", price: "0 AZN", text: "İlkin tanışlıq və kiçik sınaq üçün.", features: ["15 monitor limiti", "Əsas nəticələr", "Standart tarixçə"] },
  { name: "Starter", price: "29 AZN", text: "Kiçik komanda və gündəlik izləmə üçün.", features: ["Daha çox monitor", "Telegram bildirişləri", "CSV ixrac"] },
  { name: "Professional", price: "79 AZN", text: "Qurumlar, şirkətlər və PR komandaları üçün.", features: ["Geniş monitorinq", "Komanda istifadəsi", "Prioritet dəstək"] },
  { name: "Enterprise", price: "Razılaşma", text: "Fərdi mənbələr və geniş əməliyyat ehtiyacları üçün.", features: ["Fərdi limitlər", "Xüsusi onboarding", "Əməliyyat dəstəyi"] },
];

function PricingPage() {
  return (
    <PublicPageShell>
      <main>
        <PublicPageHero eyebrow="Qiymətlər" title="Başlamaq üçün sadə, böyümək üçün çevik" description="Planlar monitorinq həcminə, bildiriş ehtiyacına və komanda ölçüsünə görə seçilir." />
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <PublicCard key={plan.name}>
                <h2 className="text-xl font-extrabold text-slate-950">{plan.name}</h2>
                <p className="mt-3 text-3xl font-black text-slate-950">{plan.price}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{plan.text}</p>
                <ul className="mt-5 grid gap-3 text-sm text-slate-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{feature}</span></li>
                  ))}
                </ul>
              </PublicCard>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-xl font-extrabold">Enterprise ehtiyacınız var?</h2>
            <p className="mt-2 text-sm text-slate-600">Fərdi mənbələr, yüksək limitlər və komanda onboarding-i üçün bizimlə əlaqə saxlayın.</p>
            <Link to="/contact" className="mt-5 inline-flex h-11 items-center rounded-lg bg-[#1463ff] px-4 text-sm font-bold text-white hover:bg-blue-700">Əlaqə saxla</Link>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}

export const Route = createFileRoute("/pricing")({ component: PricingPage });