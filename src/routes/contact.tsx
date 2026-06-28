import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { PublicCard, PublicPageHero, PublicPageShell } from "@/components/public-site/public-site-shell";

const contactItems = [
  { title: "Email", value: "info@vizual.az", icon: Mail },
  { title: "Demo", value: "Canlı təqdimat üçün əlaqə saxlayın", icon: MessageCircle },
  { title: "Enterprise", value: "Fərdi ehtiyaclar üçün danışaq", icon: Phone },
];

function ContactPage() {
  return (
    <PublicPageShell>
      <main>
        <PublicPageHero eyebrow="Əlaqə" title="Komandanız üçün uyğun demo ssenarisini danışaq" description="Vizual.Az-ı dövlət qurumu, universitet, bank, şirkət və PR agentliyi ehtiyaclarına görə necə istifadə edə biləcəyinizi birlikdə nəzərdən keçirək." />
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-16 md:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="grid gap-4">
            {contactItems.map((item) => (
              <PublicCard key={item.title}>
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1463ff]"><item.icon className="h-5 w-5" /></div>
                  <div>
                    <h2 className="font-extrabold">{item.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.value}</p>
                  </div>
                </div>
              </PublicCard>
            ))}
          </div>
          <PublicCard>
            <h2 className="text-2xl font-extrabold">Demo sorğusu üçün məlumat</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Hazırda public form aktiv deyil. Spam və təhlükəsizlik qoruması planlaşdırıldıqdan sonra form əlavə ediləcək. İndilik demo üçün email ilə əlaqə saxlayın.</p>
            <a href="mailto:info@vizual.az" className="mt-6 inline-flex h-11 items-center rounded-lg bg-[#1463ff] px-4 text-sm font-bold text-white hover:bg-blue-700">info@vizual.az</a>
          </PublicCard>
        </section>
      </main>
    </PublicPageShell>
  );
}

export const Route = createFileRoute("/contact")({ component: ContactPage });