import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

const summaryItems = [
  { label: "Yeni media materialı", value: "14", note: "Bu gün tapılan uyğun nəticələr" },
  { label: "Vacib bildiriş", value: "2", note: "Diqqət tələb edən qeydlər" },
  { label: "Aktiv monitor", value: "3", note: "Hazırda izlənən mövzular" },
  { label: "Son yoxlama", value: "08:58", note: "Mənbələrin son yenilənməsi" },
];

const signals = [
  "Qəbul prosesi mövzusu bir neçə mənbədə görünür.",
  "Təşkilat adı bu gün 3 fərqli media materialında qeyd olunub.",
  "Bir uyğun nəticə üzrə Telegram bildirişi göndərilib.",
];

const feedItems = [
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

const actions = [
  { label: "Nəticələrə bax", to: "/monitor/results" as const },
  { label: "Açar sözləri yenilə", to: "/monitor/monitors" as const },
  { label: "Bildirişləri yoxla", to: "/monitor/alerts" as const },
];

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 border-b pb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function WorkspacePreviewPage() {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-4 p-4 md:p-6">
      <SectionShell
        title="Morning Brief"
        description="Günün əvvəlində görülməli ən vacib media və bildiriş xülasəsi."
      >
        <div className="grid gap-4 md:grid-cols-[1.5fr_0.7fr]">
          <div>
            <p className="text-sm font-medium text-slate-500">Sabahınız xeyir.</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Bu gün təşkilatınız haqqında nə baş verir?
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Bu səhifə gündəlik işə başlamazdan əvvəl ən vacib nəticələri, bildirişləri və növbəti addımları bir yerdə göstərmək üçün nəzərdə tutulur.
            </p>
          </div>
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-sm font-medium">Günün statusu</p>
            <p className="mt-2 text-xl font-semibold">Normal</p>
            <p className="mt-2 text-sm text-slate-500">Monitorinq aktivdir. Kritik problem görünmür.</p>
          </div>
        </div>
      </SectionShell>

      <SectionShell title="Today Summary" description="Günün əsas rəqəmləri qısa və qərarverməyə uyğun formada.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-md border p-4">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              <p className="mt-2 text-sm text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell title="Important Signals" description="Səhər baxışında diqqət tələb edən qısa siqnallar.">
        <div className="grid gap-2">
          {signals.map((signal) => (
            <div key={signal} className="rounded-md border p-3 text-sm">
              {signal}
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell title="Media Feed" description="Açar sözlər üzrə tapılmış ən son media materialları.">
        <div className="grid gap-3">
          {feedItems.map((item) => (
            <article key={item.title} className="rounded-md border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{item.keyword}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold leading-6 md:text-base">{item.title}</h3>
                </div>
                <button type="button" className="w-fit rounded-md border px-3 py-2 text-sm font-medium">
                  Mənbəyə bax
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell title="Next Best Action" description="İstifadəçinin səhər iş axınında ata biləcəyi ən məntiqli addımlar.">
        <div className="grid gap-3 md:grid-cols-3">
          {actions.map((action) => (
            <Link key={action.label} to={action.to} className="rounded-md border p-4 text-sm font-medium hover:bg-muted/40">
              {action.label}
            </Link>
          ))}
        </div>
      </SectionShell>

      <SectionShell title="Workspace Health" description="Sistemin gündəlik iş üçün hazır olub-olmadığını göstərən sakit status bloku.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border p-4">
            <p className="text-sm text-slate-500">Monitorinq</p>
            <p className="mt-2 font-semibold">Aktiv</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-slate-500">Bildirişlər</p>
            <p className="mt-2 font-semibold">İşlək</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-slate-500">Plan istifadəsi</p>
            <p className="mt-2 font-semibold">Normal</p>
          </div>
        </div>
      </SectionShell>
    </main>
  );
}

export const Route = createFileRoute("/(auth)/monitor/workspace-preview")({
  component: WorkspacePreviewPage,
});