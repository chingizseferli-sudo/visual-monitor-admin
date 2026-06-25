import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCircle2, ExternalLink, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 12;

type AlertRow = {
  id: string;
  match_id: string | null;
  channel: string | null;
  recipient: string | null;
  status: string | null;
  sent_at: string | null;
  monitor_matches: {
    id: string;
    matched_keyword: string | null;
    user_monitors: {
      name: string;
    } | null;
    monitored_items: {
      title: string;
      url: string;
    } | null;
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

function getHost(url: string | undefined) {
  if (!url) return "-";

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {totalItems} bildiriş | səhifə {page} / {totalPages}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Əvvəlki
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Növbəti
        </button>
      </div>
    </div>
  );
}

function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  async function loadAlerts() {
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

    if (monitorIds.length === 0) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const { data: matches } = await supabase
      .from("monitor_matches")
      .select("id")
      .in("monitor_id", monitorIds);

    const matchIds = (matches || []).map((item) => item.id);

    if (matchIds.length === 0) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("monitor_alerts")
      .select(
        "id,match_id,channel,recipient,status,sent_at,monitor_matches(id,matched_keyword,user_monitors(name),monitored_items(title,url))"
      )
      .in("match_id", matchIds)
      .order("sent_at", { ascending: false })
      .limit(300);

    if (error) {
      console.error("User alerts error:", error);
      setAlerts([]);
    } else {
      setAlerts((data || []) as AlertRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const filteredAlerts = useMemo(() => {
    if (filter === "all") return alerts;
    return alerts.filter((alert) => (alert.channel || "web") === filter);
  }, [alerts, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedAlerts = filteredAlerts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = useMemo(
    () => ({
      all: alerts.length,
      telegram: alerts.filter((item) => item.channel === "telegram").length,
      web: alerts.filter((item) => (item.channel || "web") === "web").length,
      sent: alerts.filter((item) => item.status === "sent" || item.status === "new").length,
    }),
    [alerts]
  );

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-6">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Yüklənir...</span>
      </div>
    );
  }

  return (
    <div className="grid gap-5 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bildirişlərim</h1>
        <p className="text-muted-foreground">Monitorlarınıza aid xəbər bildirişləri</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Hamısı</div>
              <div className="mt-1 text-2xl font-semibold">{stats.all}</div>
            </div>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Telegram</div>
              <div className="mt-1 text-2xl font-semibold">{stats.telegram}</div>
            </div>
            <Send className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Panel</div>
              <div className="mt-1 text-2xl font-semibold">{stats.web}</div>
            </div>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Aktiv</div>
              <div className="mt-1 text-2xl font-semibold">{stats.sent}</div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "Hamısı"],
            ["telegram", "Telegram"],
            ["web", "Panel"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={
                filter === value
                  ? "rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  : "rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalItems={filteredAlerts.length}
        onPageChange={setPage}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paginatedAlerts.map((alert) => {
          const match = alert.monitor_matches;
          const item = match?.monitored_items;
          const title = item ? decodeHtml(item.title) : "Xəbər tapılmadı";

          return (
            <article key={alert.id} className="flex aspect-square min-h-64 flex-col overflow-hidden rounded-lg border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border px-2 py-1 text-xs">
                  {match?.user_monitors?.name || "Monitor"}
                </span>
                <span className="rounded-full border px-2 py-1 text-xs">
                  {match?.matched_keyword || "-"}
                </span>
                <span className="rounded-full border px-2 py-1 text-xs">
                  {alert.channel || "web"}
                </span>
              </div>

              <div className="text-xs text-muted-foreground">{getHost(item?.url)}</div>

              {item ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 line-clamp-4 text-base font-semibold leading-snug hover:underline"
                >
                  {title}
                </a>
              ) : (
                <div className="mt-3 text-base font-semibold text-muted-foreground">{title}</div>
              )}

              <div className="mt-auto grid gap-1 pt-4 text-sm text-muted-foreground">
                <span>Status: {alert.status || "new"}</span>
                <span>Vaxt: {formatDate(alert.sent_at)}</span>
              </div>

              {item ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Aç
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </article>
          );
        })}

        {paginatedAlerts.length === 0 && (
          <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground md:col-span-2 xl:col-span-3">
            Bildiriş tapılmadı.
          </div>
        )}
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalItems={filteredAlerts.length}
        onPageChange={setPage}
      />
    </div>
  );
}

export const Route = createFileRoute("/(auth)/monitor/alerts")({
  component: AlertsPage,
});
