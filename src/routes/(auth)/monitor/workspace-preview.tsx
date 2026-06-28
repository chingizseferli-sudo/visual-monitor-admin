import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MessageCircle,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const summaryCards = [
  {
    label: "Yeni media materialı",
    value: "14",
    description: "Bu gün açar sözlərinizə uyğun tapılıb",
    icon: Search,
  },
  {
    label: "Vacib bildiriş",
    value: "2",
    description: "Komandanın diqqətinə çıxarılıb",
    icon: Bell,
  },
  {
    label: "Aktiv monitor",
    value: "3",
    description: "Media mənbələrini izləyir",
    icon: Radio,
  },
  {
    label: "Son yoxlama",
    value: "08:58",
    description: "Mənbələr son dəfə yenilənib",
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
    title: "Yeni açar söz əlavə et",
    description: "İzləmək istədiyiniz yeni mövzu və ya təşkilat adını əlavə edin.",
    to: "/monitor/monitors" as const,
  },
  {
    title: "Nəticələrə bax",
    description: "Tapılan media materiallarını mənbə və açar söz üzrə nəzərdən keçirin.",
    to: "/monitor/results" as const,
  },
  {
    title: "Telegram bildirişlərini yoxla",
    description: "Vacib uyğunluqlar üzrə bildiriş tarixçəsini izləyin.",
    to: "/monitor/alerts" as const,
  },
];

function WorkspacePreviewPage() {
  return (
    <div className="min-h-full bg-muted/20">
      <div className="mx-auto grid w-full max-w-7xl gap-5 p-4 md:p-6">
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="grid gap-6 p-5 md:grid-cols-[1.35fr_0.65fr] md:p-7">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Communication workspace preview
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sabahınız xeyir.</p>
                <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
                  Bu gün təşkilatınız haqqında nə baş verir?
                </h1>
              </div>
              <p className="max-w-2xl text-base text-muted-foreground">
                Media mənbələri yoxlanılıb, yeni nəticələr və bildirişlər aşağıda göstərilir.
              </p>
            </div>

            <div className="rounded-xl border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Workspace statusu
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Monitorinq sakit rejimdə işləyir. Vacib siqnallar ayrıca önə çıxarılır.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</div>
                </div>
                <div className="rounded-lg border bg-background p-2">
                  <card.icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{card.description}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.35fr]">
          <section className="rounded-2xl border bg-card p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Vacib siqnallar</h2>
              <p className="text-sm text-muted-foreground">
                Bu gün diqqətə layiq olan əsas dəyişikliklər.
              </p>
            </div>

            <div className="grid gap-3">
              {importantSignals.map((signal) => (
                <div key={signal} className="flex gap-3 rounded-xl border bg-background p-4">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{signal}</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Nəticə və bildiriş bölmələrində daha ətraflı baxa bilərsiniz.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Media axını</h2>
                <p className="text-sm text-muted-foreground">
                  Açar sözlərinizə uyğun tapılan son materiallar.
                </p>
              </div>
              <Link to="/monitor/results" className="inline-flex rounded-lg border px-3 py-2 text-sm hover:bg-muted">
                Bütün nəticələr
              </Link>
            </div>

            <div className="grid gap-3">
              {mediaItems.map((item) => (
                <article key={item.title} className="rounded-xl border bg-background p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border px-2 py-1">{item.source}</span>
                        <span className="rounded-full border px-2 py-1">{item.keyword}</span>
                        <span>{item.time}</span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold leading-snug">{item.title}</h3>
                    </div>
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
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
          <section className="rounded-2xl border bg-card p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Növbəti ən yaxşı addım</h2>
              <p className="text-sm text-muted-foreground">
                İş axınınızı davam etdirmək üçün ən faydalı qısa keçidlər.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {nextActions.map((action) => (
                <Link key={action.title} to={action.to} className="rounded-xl border bg-background p-4 hover:bg-muted/40">
                  <div className="font-medium">{action.title}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{action.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Workspace sağlamlığı</h2>
              <p className="text-sm text-muted-foreground">Sistem sakit və işlək vəziyyətdədir.</p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-xl border bg-background p-3">
                <span>Monitorinq</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                  aktivdir
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-background p-3">
                <span>Telegram</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                  aktiv
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-background p-3">
                <span>Plan istifadəsi</span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  normal
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/(auth)/monitor/workspace-preview")({
  component: WorkspacePreviewPage,
});
