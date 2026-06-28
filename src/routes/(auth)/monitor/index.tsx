import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, ExternalLink, Hash, Loader2, Radio, Send } from "lucide-react";
import { useEffect, useState } from "react";

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

function MetricCard({
  label,
  value,
  to,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  to: "/monitor/monitors" | "/monitor/results" | "/monitor/alerts";
  icon: typeof Bell;
}) {
  return (
    <Link to={to} className="rounded-lg border bg-card p-4 hover:bg-muted/30">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </Link>
  );
}

function UserMonitorDashboard() {
  const [loading, setLoading] = useState(true);
  const [monitorCount, setMonitorCount] = useState(0);
  const [keywordCount, setKeywordCount] = useState(0);
  const [resultCount, setResultCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [recentMatches, setRecentMatches] = useState<MatchRow[]>([]);

  async function loadDashboard() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: monitors } = await supabase
      .from("user_monitors")
      .select("id")
      .eq("user_id", user.id);

    const monitorIds = (monitors || []).map((item) => item.id);

    setMonitorCount(monitorIds.length);

    if (monitorIds.length === 0) {
      setKeywordCount(0);
      setResultCount(0);
      setAlertCount(0);
      setRecentMatches([]);
      setLoading(false);
      return;
    }

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

    const matches = (matchesRes.data || []) as MatchRow[];
    const matchIds = matches.map((item) => item.id);

    setKeywordCount(keywordsRes.count || 0);
    setResultCount(matchIds.length);
    setRecentMatches(matches);

    if (matchIds.length > 0) {
      const { count } = await supabase
        .from("monitor_alerts")
        .select("id", { count: "exact", head: true })
        .in("match_id", matchIds);

      setAlertCount(count || 0);
    } else {
      setAlertCount(0);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-6">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Yüklənir...</span>
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monitorinq panelim</h1>
          <p className="text-muted-foreground">Monitorlar, açar sözlər və son uyğun xəbərlər</p>
        </div>

        <Link
          to="/monitor/monitors"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Send className="h-4 w-4" />
          Monitorları idarə et
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Monitor" value={monitorCount} to="/monitor/monitors" icon={Radio} />
        <MetricCard label="Açar söz" value={keywordCount} to="/monitor/monitors" icon={Hash} />
        <MetricCard label="Nəticə" value={resultCount} to="/monitor/results" icon={Bell} />
        <MetricCard label="Bildiriş" value={alertCount} to="/monitor/alerts" icon={Send} />
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">Son uyğunluqlar</h2>
            <p className="text-sm text-muted-foreground">Ən yeni monitor nəticələri</p>
          </div>

          <Link to="/monitor/results" className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">
            Hamısı
          </Link>
        </div>

        {recentMatches.length === 0 ? (
          <div className="grid gap-2 p-8 text-center">
            <div className="font-medium">Hələ nəticə yoxdur</div>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Monitorlarınız yeni uyğun xəbər tapdıqda son nəticələr burada görünəcək.
            </p>
            <Link to="/monitor/monitors" className="mx-auto mt-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
              Monitorları yoxla
            </Link>
          </div>
        ) : (
          <div className="grid gap-0">
            {recentMatches.map((match) => {
              const item = match.monitored_items;

              return (
                <article key={match.id} className="border-t p-4 first:border-t-0">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border px-2 py-1 text-xs">
                          {match.user_monitors?.name || "Monitor"}
                        </span>
                        <span className="rounded-full border px-2 py-1 text-xs">
                          {match.matched_keyword || "-"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(match.created_at)}
                        </span>
                      </div>

                      {item ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 font-semibold hover:underline"
                        >
                          {decodeHtml(item.title)}
                        </a>
                      ) : (
                        <div className="font-semibold text-muted-foreground">Xəbər tapılmadı</div>
                      )}
                    </div>

                    {item ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
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
