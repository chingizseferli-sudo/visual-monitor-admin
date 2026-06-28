import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MessageCircle,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const summaryCards = [
  {
    label: "Yeni media materialı",
    value: "14",
    description: "Bu gün açar sözlərinizə uyğun tapılıb",
    icon: Search,
    tone: "from-sky-500/12 to-blue-500/6 text-sky-700",
  },
  {
    label: "Vacib bildiriş",
    value: "2",
    description: "Komandanın diqqətinə çıxarılıb",
    icon: Bell,
    tone: "from-violet-500/12 to-fuchsia-500/6 text-violet-700",
  },
  {
    label: "Aktiv monitor",
    value: "3",
    description: "Media mənbələrini izləyir",
    icon: Radio,
    tone: "from-emerald-500/12 to-teal-500/6 text-emerald-700",
  },
  {
    label: "Son yoxlama",
    value: "08:58",
    description: "Mənbələr son dəfə yenilənib",
    icon: Clock3,
    tone: "from-amber-500/14 to-orange-500/6 text-amber-700",
  },
];

const importantSignals = [
  {
    title: "Qəbul prosesi ilə bağlı 5 yeni xəbər tapılıb",
    description: "Mövzu bu gün bir neçə mənbədə görünür və izlənməyə dəyər.",
  },
  {
    title: "Universitet adı 3 fərqli mənbədə qeyd olunub",
    description: "Qeyd olunan materiallar nəticələr bölməsində qruplaşdırılıb.",
  },
  {
    title: "Telegram bildirişi göndərilib",
    description: "Vacib uyğunluq barədə bildiriş tarixçəyə yazılıb.",
  },
];

const mediaItems = [
  {
    title: "Qəbul prosesi ilə bağlı yeni açıqlama yayımlandı",
    source: "edu.gov.az",
    keyword: "qəbul prosesi",
    time: "09:12",
  },
  {
    title: "Universitetin beynəlxalq əməkdaşlığı haqqında xəbər dərc edilib",
    source: "azertag.az",
    keyword: "universitet adı",
    time: "08:47",
  },
  {
    title: "Təhsil layihəsi media gündəmində yenidən qeyd olunub",
    source: "report.az",
    keyword: "təhsil layihəsi",
    time: "08:21",
  },
];

const nextActions = [
  {
    title: "Yeni açar söz əlavə et",
    description: "İzləmək istədiyiniz mövzu, təşkilat və ya layihə adını əlavə edin.",
    to: "/monitor/monitors" as const,
  },
  {
    title: "Nəticələrə bax",
    description: "Tapılan media materiallarını mənbə və açar söz üzrə nəzərdən keçirin.",
    to: "/monitor/results" as const,
  },
  {
    title: "Bildirişləri yoxla",
    description: "Vacib uyğunluqlar üzrə göndərilən bildiriş tarixçəsini izləyin.",
    to: "/monitor/alerts" as const,
  },
];

function WorkspacePreviewPage() {
  return (
    <div className="min-h-full overflow-hidden bg-[#f7f9fd] text-[#172033]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-12%] top-[-20%] h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute right-[-10%] top-10 h-[28rem] w-[28rem] rounded-full bg-violet-300/18 blur-3xl" />
        <div className="absolute bottom-[-18%] left-[32%] h-96 w-96 rounded-full bg-teal-300/16 blur-3xl" />
      </div>

      <main className="mx-auto grid w-full max-w-7xl gap-5 p-4 md:p-6 xl:p-8">
        <section className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(30,55,105,0.12)] backdrop-blur">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_40%_30%,rgba(14,165,233,0.22),transparent_28%),linear-gradient(135deg,rgba(20,99,255,0.12),rgba(124,58,237,0.16)_55%,rgba(20,184,166,0.12))] lg:block" />
          <div className="relative grid gap-8 p-6 md:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1 text-sm font-semibold text-blue-700">
                <Sparkles className="h-4 w-4" />
                Vizual.Az workspace preview
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Sabahınız xeyir.</p>
                <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                  Bu gün təşkilatınız haqqında nə baş verir?
                </h1>
              </div>
              <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Media mənbələri yoxlanılıb, yeni nəticələr və bildirişlər aşağıda sakit, aydın və qərarverməyə hazır formada göstərilir.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/monitor/results"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1463ff] px-5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(20,99,255,0.24)] transition hover:bg-blue-700"
                >
                  Nəticələrə bax
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/monitor/monitors"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Monitorları idarə et
                </Link>
              </div>
            </div>

            <div className="grid content-end gap-3">
              <div className="rounded-2xl border border-white/60 bg-white/88 p-4 shadow-[0_18px_50px_rgba(30,55,105,0.14)] backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Workspace statusu
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Monitorinq aktivdir. Vacib siqnallar ayrıca önə çıxarılır, gündəlik axın isə media feed-də saxlanılır.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/60 bg-white/82 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trend</p>
                  <div className="mt-2 flex items-end gap-2">
                    <strong className="text-2xl">+18%</strong>
                    <TrendingUp className="mb-1 h-4 w-4 text-emerald-600" />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/82 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ton</p>
                  <strong className="mt-2 block text-2xl">Normal</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl border border-white/70 bg-gradient-to-br ${card.tone} p-4 shadow-[0_14px_40px_rgba(30,55,105,0.08)]`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-600">{card.label}</p>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{card.value}</div>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/80 p-2 shadow-sm">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.35fr]">
          <section className="rounded-[24px] border border-white/70 bg-white/82 p-5 shadow-[0_18px_58px_rgba(30,55,105,0.09)] backdrop-blur">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">Vacib siqnallar</h2>
              <p className="text-sm leading-6 text-slate-600">Bu gün diqqətə layiq olan əsas media siqnalları.</p>
            </div>

            <div className="grid gap-3">
              {importantSignals.map((signal) => (
                <div key={signal.title} className="group flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-blue-50/50">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_10px_24px_rgba(20,99,255,0.24)]">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-950">{signal.title}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{signal.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-white/70 bg-white/82 p-5 shadow-[0_18px_58px_rgba(30,55,105,0.09)] backdrop-blur">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Media axını</h2>
                <p className="text-sm leading-6 text-slate-600">Açar sözlərinizə uyğun tapılan son materiallar.</p>
              </div>
              <Link to="/monitor/results" className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                Bütün nəticələr
              </Link>
            </div>

            <div className="grid gap-3">
              {mediaItems.map((item) => (
                <article key={item.title} className="rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:border-blue-200 hover:shadow-[0_14px_38px_rgba(30,55,105,0.08)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-semibold">{item.source}</span>
                        <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 font-semibold text-blue-700">{item.keyword}</span>
                        <span>{item.time}</span>
                      </div>
                      <h3 className="mt-3 text-base font-bold leading-snug text-slate-950">{item.title}</h3>
                    </div>
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      Mənbəyə bax
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-[24px] border border-white/70 bg-white/82 p-5 shadow-[0_18px_58px_rgba(30,55,105,0.09)] backdrop-blur">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">Növbəti ən yaxşı addım</h2>
              <p className="text-sm leading-6 text-slate-600">İş axınınızı davam etdirmək üçün ən faydalı qısa keçidlər.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {nextActions.map((action) => (
                <Link key={action.title} to={action.to} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-blue-50/60">
                  <div className="font-bold text-slate-950">{action.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-white/70 bg-white/82 p-5 shadow-[0_18px_58px_rgba(30,55,105,0.09)] backdrop-blur">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">Workspace sağlamlığı</h2>
              <p className="text-sm leading-6 text-slate-600">Sistem sakit və işlək vəziyyətdədir.</p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3">
                <span className="font-medium text-slate-700">Monitorinq</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">aktivdir</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3">
                <span className="font-medium text-slate-700">Telegram</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">aktiv</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3">
                <span className="font-medium text-slate-700">Plan istifadəsi</span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">normal</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/(auth)/monitor/workspace-preview")({
  component: WorkspacePreviewPage,
});
