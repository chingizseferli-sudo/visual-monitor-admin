import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCircle2, ExternalLink, Hash, Loader2, Radio, Send } from "lucide-react";

import { customerQueryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

type MatchRow = {
  id: string;
  monitor_id: string;
  matched_keyword: string | null;
  created_at: string | null;
  user_monitors: {
    name: string;
  } | null;
  monitored_items: {
    title: string;
    url: string;
  } | null;
};

type DashboardData = {
  monitorCount: number;
  keywordCount: number;
  resultCount: number;
  alertCount: number;
  recentMatches: MatchRow[];
};

const EMPTY_DASHBOARD: DashboardData = {
  monitorCount: 0,
  keywordCount: 0,
  resultCount: 0,
  alertCount: 0,
  recentMatches: [],
};

function decodeHtml(text: string) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("az-AZ", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchDashboardData(): Promise<DashboardData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return EMPTY_DASHBOARD;

  const { data: monitors } = await supabase
    .from("user_monitors")
    .select("id")
    .eq("user_id", user.id);

  const monitorIds = (monitors || []).map((item) => item.id);

  if (monitorIds.length === 0) return EMPTY_DASHBOARD;

  const [keywordsRes, matchesRes] = await Promise.all([
    supabase
      .from("monitor_keywords")
      .select("id", { count: "exact", head: true })
      .in("monitor_id", monitorIds),

    supabase
      .from("monitor_matches")
      .select("id,monitor_id,matched_keyword,created_at,user_monitors(name),monitored_items(title,url)")
      .in("monitor_id", monitorIds)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const matches = (matchesRes.data || []) as unknown as MatchRow[];
  const matchIds = matches.map((item) => item.id);
  let alertCount = 0;

  if (matchIds.length > 0) {
    const { count } = await supabase
      .from("monitor_alerts")
      .select("id", { count: "exact", head: true })
      .in("match_id", matchIds);
    alertCount = count || 0;
  }

  return {
    monitorCount: monitorIds.length,
    keywordCount: keywordsRes.count || 0,
    resultCount: matchIds.length,
    alertCount,
    recentMatches: matches,
  };
}

function MetricCard({
  label,
  description,
  value,
  to,
  icon: Icon,
}: {
  label: string;
  description: string;
  value: string | number;
  to: "/monitor/monitors" | "/monitor/results" | "/monitor/alerts";
  icon: typeof Bell;
}) {
  return (
    <Link to={to} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-500">{label}</div>
          <div className="mt-1 text-3xl font-black text-slate-950">{value}</div>
          <div className="mt-1 text-xs text-slate-500">{description}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#1463ff]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function FirstRunGuide() {
  const steps = [
    "Monitor yaradın",
    "Açar söz əlavə edin",
    "Nəticələri və bildirişləri izləyin",
  ];

  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[#1463ff]">İlk addım</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Vizual.Az-a xoş gəlmisiniz</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Vizual.Az seçdiyiniz açar sözləri media mənbələrində izləyir. Uyğun material tapıldıqda nəticələr paneldə görünür və bildiriş tarixçəsi yaranır.
            </p>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Başlamaq üçün ilk monitorunuzu yaradın, sonra izlənəcək açar sözləri əlavə edin. Sistem mənbələri yoxladıqca uyğun xəbərlər burada görünəcək.
          </p>
          <Link
            to="/monitor/monitors"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
            İlk monitoru yarat
          </Link>
        </div>

        <div className="grid gap-2">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#f7f9fd] p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1463ff] text-sm font-bold text-white">
                {index + 1}
              </div>
              <div className="text-sm font-semibold text-slate-800">{step}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UserMonitorDashboard() {
  const { data = EMPTY_DASHBOARD, isLoading } = useQuery({
    queryKey: customerQueryKeys.dashboard(),
    queryFn: fetchDashboardData,
    staleTime: 30 * 1000,
  });

  const { monitorCount, keywordCount, resultCount, alertCount, recentMatches } = data;
  const hasNoMonitors = monitorCount === 0;

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-6 text-slate-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Yüklənir...</span>
      </div>
    );
  }

  return (
    <div className="grid gap-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between md:p-6">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-[#1463ff]">Workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Monitorinq panelim</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Cari vəziyyəti görün, növbəti addımı seçin və monitorinq nəticələrinə tez keçin.
          </p>
        </div>

        <Link
          to="/monitor/monitors"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          <Send className="h-4 w-4" />
          Monitorları idarə et
        </Link>
      </div>

      {hasNoMonitors ? <FirstRunGuide /> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Monitorlar"
          description="İzlənən mövzular"
          value={monitorCount}
          to="/monitor/monitors"
          icon={Radio}
        />
        <MetricCard
          label="Açar sözlər"
          description="İzlənən ifadələr"
          value={keywordCount}
          to="/monitor/monitors"
          icon={Hash}
        />
        <MetricCard
          label="Tapılan media materialı"
          description="Uyğun nəticələr"
          value={resultCount}
          to="/monitor/results"
          icon={Bell}
        />
        <MetricCard
          label="Göndərilmiş bildiriş"
          description="Bildiriş tarixçəsi"
          value={alertCount}
          to="/monitor/alerts"
          icon={Send}
        />
      </div>

      {!hasNoMonitors ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">Monitorinq necə işləyir?</h2>
              <p className="text-sm leading-6 text-slate-600">
                Sistem açar sözlərinizi media mənbələrində yoxlayır. Uyğun material tapıldıqda nəticələr və bildirişlər bölməsində görünür.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Monitor aktivdir
              </span>
              <span className="rounded-full border border-slate-200 px-2 py-1 text-slate-600">Nəticələr avtomatik yenilənir</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Son uyğunluqlar</h2>
            <p className="text-sm text-slate-500">Ən yeni monitor nəticələri</p>
          </div>

          <Link to="/monitor/results" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
            Hamısı
          </Link>
        </div>

        {recentMatches.length === 0 ? (
          <div className="grid gap-2 p-8 text-center">
            <div className="font-semibold text-slate-950">
              {hasNoMonitors ? "Başlamaq üçün monitor yaradın" : "Hələ nəticə yoxdur"}
            </div>
            <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">
              {hasNoMonitors
                ? "İlk monitoru yaratdıqdan və açar söz əlavə etdikdən sonra sistem uyğun media materiallarını izləməyə başlayacaq."
                : "Monitorlarınız yeni uyğun media materialı tapdıqda son nəticələr burada görünəcək."}
            </p>
            <Link to="/monitor/monitors" className="mx-auto mt-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
              {hasNoMonitors ? "İlk monitoru yarat" : "Monitorları yoxla"}
            </Link>
          </div>
        ) : (
          <div className="grid gap-0">
            {recentMatches.map((match) => {
              const item = match.monitored_items;

              return (
                <article key={match.id} className="border-t border-slate-100 p-4 first:border-t-0">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600">
                          {match.user_monitors?.name || "Monitor"}
                        </span>
                        <span className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600">
                          {match.matched_keyword || "-"}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(match.created_at)}
                        </span>
                      </div>

                      {item ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 font-bold text-slate-950 hover:underline"
                        >
                          {decodeHtml(item.title)}
                        </a>
                      ) : (
                        <div className="font-semibold text-slate-500">Xəbər tapılmadı</div>
                      )}
                    </div>

                    {item ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                      >
                        Aç
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export const Route = createFileRoute("/(auth)/monitor/")({
  component: UserMonitorDashboard,
});