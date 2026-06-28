import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Contact,
  FileText,
  Globe2,
  Landmark,
  Megaphone,
  Newspaper,
  PlayCircle,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  University,
} from "lucide-react";

const services = [
  {
    title: "Media Monitoring",
    description: "Açar sözlərə görə media materiallarını izləyin və nəticələri workspace-də görün.",
    icon: Newspaper,
    status: "Aktiv",
  },
  {
    title: "Website Change Monitoring",
    description: "Seçilmiş veb səhifə hissələrində dəyişiklikləri izləyin.",
    icon: RadioTower,
    status: "Aktiv",
  },
  {
    title: "PR Intelligence",
    description: "PR siqnallarını və kommunikasiya təsirini daha geniş analiz edin.",
    icon: Megaphone,
    status: "Coming Soon",
  },
  {
    title: "Social Intelligence",
    description: "Sosial platformalardakı ictimai reaksiyaları gələcək mərhələdə izləyin.",
    icon: Globe2,
    status: "Coming Soon",
  },
  {
    title: "Global News Discovery",
    description: "Qlobal xəbər mənbələrindən mövzu və təşkilat görünürlüğünü izləyin.",
    icon: Search,
    status: "Coming Soon",
  },
];

const audiences = [
  { title: "Dövlət qurumları", icon: Landmark },
  { title: "Universitetlər", icon: University },
  { title: "Banklar", icon: ShieldCheck },
  { title: "Şirkətlər", icon: Building2 },
  { title: "PR Agentlikləri", icon: Megaphone },
  { title: "Media", icon: Newspaper },
];

const plans = [
  {
    name: "Free",
    price: "0 AZN",
    description: "Kiçik sınaq və ilkin tanışlıq üçün.",
    features: ["15 monitor limiti", "Əsas nəticələr", "Standart tarixçə"],
  },
  {
    name: "Starter",
    price: "29 AZN",
    description: "Kiçik komanda və gündəlik izləmə üçün.",
    features: ["Daha çox monitor", "Telegram bildirişləri", "CSV ixrac"],
  },
  {
    name: "Professional",
    price: "79 AZN",
    description: "Qurumlar, şirkətlər və PR komandaları üçün.",
    features: ["Geniş monitorinq", "Komanda istifadəsi", "Prioritet dəstək"],
  },
  {
    name: "Enterprise",
    price: "Razılaşma",
    description: "Fərdi mənbələr, proseslər və geniş ehtiyaclar üçün.",
    features: ["Fərdi limitlər", "Xüsusi onboarding", "Əməliyyat dəstəyi"],
  },
];

const demoItems = [
  {
    title: "Qəbul prosesi ilə bağlı yeni açıqlama yayımlandı",
    source: "edu.gov.az",
    keyword: "qəbul prosesi",
    time: "09:12",
  },
  {
    title: "Təşkilat adı media gündəmində 3 fərqli mənbədə qeyd olundu",
    source: "azertag.az",
    keyword: "təşkilat adı",
    time: "08:47",
  },
  {
    title: "Vacib uyğunluq üzrə Telegram bildirişi göndərildi",
    source: "workspace",
    keyword: "bildiriş",
    time: "08:21",
  },
];

const blogItems = [
  "Media monitorinq nə üçün vacibdir?",
  "PR komandaları gündəlik xəbər axınını necə idarə etməlidir?",
  "SEO və kommunikasiya görünürlüğü arasında əlaqə",
];

function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f7f9fd]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <a href="#top" className="flex items-center gap-3 font-extrabold text-slate-950">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 text-white">
            V
          </span>
          <span>Vizual.Az</span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
          <a href="#services" className="hover:text-slate-950">Xidmətlər</a>
          <a href="#audience" className="hover:text-slate-950">Kimlər üçündür?</a>
          <a href="#demo" className="hover:text-slate-950">Demo</a>
          <a href="#pricing" className="hover:text-slate-950">Qiymətlər</a>
          <a href="#blog" className="hover:text-slate-950">Blog</a>
          <a href="#contact" className="hover:text-slate-950">Əlaqə</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/sign-in" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
            Login
          </Link>
          <a href="#demo" className="rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-bold text-white shadow-[0_12px_26px_rgba(20,99,255,0.22)] hover:bg-blue-700">
            Demo istə
          </a>
        </div>
      </div>
    </header>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center">
      <p className="text-sm font-extrabold uppercase tracking-wide text-[#1463ff]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-7 text-slate-600">{description}</p> : null}
    </div>
  );
}

function IndexPage() {
  return (
    <div id="top" className="min-h-screen bg-[#f7f9fd] text-[#172033]">
      <PublicHeader />

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-sm font-bold text-[#1463ff]">
              <Sparkles className="h-4 w-4" />
              Communication Intelligence Platform
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight text-slate-950 md:text-7xl">
              Vizual.Az
            </h1>
            <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              Monitor. Understand. Decide.
            </p>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Media, vebsayt dəyişiklikləri və kommunikasiya siqnallarını bir platformada izləyin. Public website məlumat üçündür; iş mühiti login-dən sonra başlayır.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#demo" className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#1463ff] px-5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(20,99,255,0.24)] hover:bg-blue-700">
                Demo istə
                <ChevronRight className="h-4 w-4" />
              </a>
              <Link to="/sign-in" className="inline-flex h-12 items-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 hover:bg-slate-50">
                Workspace-ə daxil ol
              </Link>
            </div>
          </div>

          <div className="relative rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 p-5 shadow-[0_34px_90px_rgba(22,42,84,0.25)]">
            <div className="grid gap-3 rounded-2xl border border-white/15 bg-white/90 p-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <p className="text-sm font-bold text-slate-500">Demo Workspace</p>
                  <p className="text-xl font-extrabold text-slate-950">Bu gün nə baş verir?</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Aktiv</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Material</p>
                  <p className="mt-1 text-2xl font-black">14</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Bildiriş</p>
                  <p className="mt-1 text-2xl font-black">2</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Monitor</p>
                  <p className="mt-1 text-2xl font-black">3</p>
                </div>
              </div>
              <div className="grid gap-3">
                {demoItems.map((item) => (
                  <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                      <span>{item.source}</span>
                      <span>•</span>
                      <span>{item.keyword}</span>
                      <span>•</span>
                      <span>{item.time}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-extrabold leading-6 text-slate-950">{item.title}</h3>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <SectionHeading
            eyebrow="Xidmətlər"
            title="Media və kommunikasiya izləməsi üçün əsas modullar"
            description="Aktiv məhsullar və yaxın dövr üçün planlanan istiqamətlər aydın ayrılır."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {services.map((service) => (
              <article key={service.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1463ff]">
                  <service.icon className="h-5 w-5" />
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <h3 className="font-extrabold text-slate-950">{service.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{service.description}</p>
                <span className="mt-4 inline-flex rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600">
                  {service.status}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section id="audience" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <SectionHeading eyebrow="Kimlər üçündür?" title="Kommunikasiya gündəmini izləyən komandalar üçün" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((audience) => (
              <article key={audience.title} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <audience.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-950">{audience.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">Media görünürlüğü və reputasiya siqnalları.</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="demo" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="grid gap-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wide text-[#1463ff]">Demo</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">Məhsulu görmədən qərar verməyin</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Demo video və ya demo workspace vasitəsilə Vizual.Az-ın gündəlik iş axınında necə istifadə olunacağını göstərə bilərik.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/monitor/workspace-preview" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#1463ff] px-4 text-sm font-bold text-white hover:bg-blue-700">
                  Demo Workspace
                  <PlayCircle className="h-4 w-4" />
                </Link>
                <a href="#contact" className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-800 hover:bg-slate-50">
                  Canlı demo istə
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <PlayCircle className="mx-auto h-12 w-12 text-slate-500" />
              <p className="mt-4 text-lg font-extrabold text-slate-950">Demo videosu üçün yer</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Burada məhsulun qısa tanıtım videosu və ya statik demo təqdimatı yerləşdirilə bilər.</p>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <SectionHeading eyebrow="Qiymətlər" title="Başlamaq üçün sadə, böyümək üçün çevik" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <article key={plan.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xl font-extrabold text-slate-950">{plan.name}</h3>
                <p className="mt-3 text-3xl font-black text-slate-950">{plan.price}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
                <ul className="mt-5 grid gap-3 text-sm text-slate-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-[#1463ff]">
                <BadgeCheck className="h-5 w-5" />
                <p className="text-sm font-extrabold uppercase tracking-wide">Kampaniyalar</p>
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-slate-950">Yeni funksiyalar və erkən istifadəçi təklifləri</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">Yeni modullar, endirimlər və demo kampaniyaları bu bölmədə təqdim olunacaq.</p>
            </article>
            <article id="blog" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-[#1463ff]">
                <FileText className="h-5 w-5" />
                <p className="text-sm font-extrabold uppercase tracking-wide">Blog</p>
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-slate-950">Media, PR, SEO və kommunikasiya</h2>
              <div className="mt-4 grid gap-2">
                {blogItems.map((item) => (
                  <p key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{item}</p>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 p-6 text-white md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-wide text-cyan-100">Haqqımızda və əlaqə</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">Vizual.Az kommunikasiya komandaları üçün gündəlik monitorinq qatıdır</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50">
                  Media görünürlüğünü, vebsayt dəyişikliklərini və vacib siqnalları daha aydın izləmək istəyən komandalar üçün hazırlanır.
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 text-slate-950">
                <Contact className="h-6 w-6 text-[#1463ff]" />
                <h3 className="mt-4 text-xl font-extrabold">Demo üçün əlaqə saxlayın</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Komandanız üçün uyğun istifadə ssenarisini birlikdə nəzərdən keçirək.</p>
                <a href="mailto:info@vizual.az" className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#1463ff] px-4 text-sm font-bold text-white hover:bg-blue-700">
                  info@vizual.az
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Vizual.Az. Communication Intelligence Platform.</p>
          <div className="flex justify-center gap-4">
            <Link to="/sign-in" className="font-semibold text-slate-700 hover:text-slate-950">Login</Link>
            <Link to="/sign-up" className="font-semibold text-slate-700 hover:text-slate-950">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});