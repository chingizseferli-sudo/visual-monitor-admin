import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bell, CheckCircle2, Newspaper, Radio, ShieldCheck } from "lucide-react";

const summaryItems = [
  { label: "Yeni media materialı", value: "14", note: "Bu gün tapılan uyğun nəticələr", icon: Newspaper },
  { label: "Vacib bildiriş", value: "2", note: "Diqqət tələb edən qeydlər", icon: Bell },
  { label: "Aktiv monitor", value: "3", note: "Hazırda izlənən mövzular", icon: Radio },
  { label: "Sistem statusu", value: "Normal", note: "Monitorinq sakit işləyir", icon: ShieldCheck },
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
  { label: "Nəticələrə bax", description: "Tapılan media materiallarını açın", to: "/monitor/results" as const },
  { label: "Açar sözləri yenilə", description: "Monitor mövzularını dəqiqləşdirin", to: "/monitor/monitors" as const },
  { label: "Bildirişləri yoxla", description: "Göndərilən bildiriş tarixçəsinə baxın", to: "/monitor/alerts" as const },
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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 border-b border-slate-100 pb-3">
        <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function WorkspacePreviewPage() {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.75fr] lg:items-end">
          <div>
            <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
              Workspace Preview
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">Sabahınız xeyir.</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Bu gün təşkilatınız haqqında nə baş verir?
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Bu iş masası gələcək müştəri təcrübəsi üçün ilkin baxışdır. Məqsəd gündəlik nəticələri,
              bildirişləri və növbəti addımları admin panel hissi yaratmadan bir yerdə göstərməkdir.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Günün statusu
            </div>
            <p className="mt-3 text-2xl font-black text-slate-950">Normal</p>
            <p className="mt-2 text-sm text-slate-600">Monitorinq aktivdir. Kritik problem görünmür.</p>
          </div>
        </div>
      </section>

      <SectionShell title="Bugünkü xülasə" description="Günün əsas göstəriciləri qərarverməyə uyğun qısa formada.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                <item.icon className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-950">{item.value}</p>
              <p className="mt-1 text-sm text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionShell title="Vacib siqnallar" description="Səhər baxışında diqqət tələb edən qısa qeydlər.">
          <div className="grid gap-2">
            {signals.map((signal) => (
              <div key={signal} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm font-semibold text-slate-700">
                {signal}
              </div>
            ))}
          </div>
        </SectionShell>

        <SectionShell title="Media axını" description="Açar sözlər üzrə tapılmış son media materialları.">
          <div className="grid gap-2">
            {feedItems.map((item) => (
              <article key={item.title} className="rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                      <span>{item.source}</span>
                      <span>{item.keyword}</span>
                      <span>{item.time}</span>
                    </div>
                    <h3 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-slate-950">{item.title}</h3>
                  </div>
                  <button type="button" className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-white">
                    Mənbəyə bax
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionShell>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionShell title="Növbəti ən yaxşı addım" description="İstifadəçinin səhər iş axınında ata biləcəyi ən məntiqli addımlar.">
          <div className="grid gap-3 md:grid-cols-3">
            {actions.map((action) => (
              <Link key={action.label} to={action.to} className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/60">
                <div className="font-extrabold text-slate-950">{action.label}</div>
                <p className="mt-1 text-sm text-slate-500">{action.description}</p>
              </Link>
            ))}
          </div>
        </SectionShell>

        <SectionShell title="Workspace sağlamlığı" description="Sistemin gündəlik iş üçün hazır olub-olmadığını göstərən sakit status bloku.">
          <div className="grid gap-2">
            {[
              ["Monitorinq", "Aktiv"],
              ["Bildirişlər", "İşlək"],
              ["Plan istifadəsi", "Normal"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                <span className="text-sm text-slate-500">{label}</span>
                <span className="text-sm font-extrabold text-slate-950">{value}</span>
              </div>
            ))}
          </div>
        </SectionShell>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/(auth)/monitor/workspace-preview")({
  component: WorkspacePreviewPage,
});