import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Radio,
  Search,
  ShieldCheck,
} from "lucide-react";

const summaryCards = [
  {
    label: "Yeni material",
    value: "14",
    description: "Açar sözlər üzrə tapılıb",
    icon: Search,
  },
  {
    label: "Bildiriş",
    value: "2",
    description: "Vacib uyğunluq göndərilib",
    icon: Bell,
  },
  {
    label: "Aktiv monitor",
    value: "3",
    description: "Mənbələr izlənir",
    icon: Radio,
  },
  {
    label: "Son yoxlama",
    value: "08:58",
    description: "Sistem yenilənib",
    icon: Clock3,
  },
];

const importantSignals = [
  "Qəbul prosesi ilə bağlı 5 yeni xəbər tapılıb",
  "Universitet adı 3 fərqli mənbədə qeyd olunub",
  "Telegram bildirişi göndərilib",
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
    title: "Açar söz əlavə et",
    to: "/monitor/monitors" as const,
  },
  {
    title: "Nəticələrə bax",
    to: "/monitor/results" as const,
  },
  {
    title: "Bildirişləri yoxla",
    to: "/monitor/alerts" as const,
  },
];

function WorkspacePreviewPage() {
  return (
    <div className="min-h-full bg-[#f7f9fd] text-slate-950">
      <main className="mx-auto grid w-full max-w-7xl gap-5 p-4 md:p-6 xl:p-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(30,55,105,0.08)] md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                <ShieldCheck className="h-4 w-4" />
                Workspace preview
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Sabahınız xeyir.</p>
                <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
                  Bu gün təşkilatınız haqqında nə baş verir?
                </h1>
              </div>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Yeni nəticələr, vacib bildirişlər və növbəti addımlar bir yerdə.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Ümumi status</p>
                  <p className="mt-1 text-2xl font-bold">Normal</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  Aktiv
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                  <div className="mt-2 text-3xl font-bold tracking-tight">{card.value}</div>
                </div>
                <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{card.description}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.4fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold">Vacib siqnallar</h2>
              <p className="text-sm text-slate-600">Bu gün diqqət tələb edən əsas qeydlər.</p>
            </div>

            <div className="grid gap-3">
              {importantSignals.map((signal) => (
                <div key={signal} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold leading-6 text-slate-800">{signal}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Media axını</h2>
                <p className="text-sm text-slate-600">Son tapılan materiallar.</p>
              </div>
              <Link to="/monitor/results" className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                Hamısına bax
              </Link>
            </div>

            <div className="grid gap-3">
              {mediaItems.map((item) => (
                <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">{item.source}</span>
                        <span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">{item.keyword}</span>
                        <span>{item.time}</span>
                      </div>
                      <h3 className="mt-3 text-base font-bold leading-snug">{item.title}</h3>
                    </div>
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
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

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold">Növbəti addımlar</h2>
            <p className="text-sm text-slate-600">İşi davam etdirmək üçün qısa keçidlər.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {nextActions.map((action) => (
              <Link key={action.title} to={action.to} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-700">
                {action.title}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/(auth)/monitor/workspace-preview")({
  component: WorkspacePreviewPage,
});