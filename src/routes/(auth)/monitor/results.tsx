import { createFileRoute } from "@tanstack/react-router";
import { Bell, Clock3, ExternalLink, Hash, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 12;

type ResultRow = {
  id: string;
  monitor_id: string;
  item_id: string;
  matched_keyword: string | null;
  created_at: string | null;
  user_monitors: {
    name: string;
  } | null;
  monitored_items: {
    title: string;
    url: string;
    published_at: string | null;
    detected_at: string | null;
    status: string | null;
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
        {totalItems} nəticə | səhifə {page} / {totalPages}
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

function ResultsPage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  async function loadResults() {
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
      setRows([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("monitor_matches")
      .select(
        "id,monitor_id,item_id,matched_keyword,created_at,user_monitors(name),monitored_items(title,url,published_at,detected_at,status)"
      )
      .in("monitor_id", monitorIds)
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      console.error("User results error:", error);
      setRows([]);
    } else {
      setRows((data || []) as ResultRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadResults();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredRows = useMemo(() => {
    const q = search.toLocaleLowerCase("az-AZ").trim();
    if (!q) return rows;

    return rows.filter((row) => {
      const item = row.monitored_items;

      return (
        (item?.title || "").toLocaleLowerCase("az-AZ").includes(q) ||
        (item?.url || "").toLocaleLowerCase("az-AZ").includes(q) ||
        (row.matched_keyword || "").toLocaleLowerCase("az-AZ").includes(q) ||
        (row.user_monitors?.name || "").toLocaleLowerCase("az-AZ").includes(q)
      );
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const uniqueMonitors = new Set(rows.map((row) => row.monitor_id)).size;
  const uniqueKeywords = new Set(rows.map((row) => row.matched_keyword).filter(Boolean)).size;

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
        <h1 className="text-3xl font-bold tracking-tight">Nəticələrim</h1>
        <p className="text-muted-foreground">Monitorlarınıza uyğun tapılan xəbərlər</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Nəticə</div>
              <div className="mt-1 text-2xl font-semibold">{rows.length}</div>
            </div>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Monitor</div>
              <div className="mt-1 text-2xl font-semibold">{uniqueMonitors}</div>
            </div>
            <Clock3 className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Açar söz</div>
              <div className="mt-1 text-2xl font-semibold">{uniqueKeywords}</div>
            </div>
            <Hash className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Başlıq, monitor, link və ya açar söz üzrə axtar"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3"
          />
        </div>
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalItems={filteredRows.length}
        onPageChange={setPage}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paginatedRows.map((row) => {
          const item = row.monitored_items;
          const title = item ? decodeHtml(item.title) : "Xəbər tapılmadı";
          const detectedAt = item?.detected_at || row.created_at;

          return (
            <article key={row.id} className="flex aspect-square min-h-64 flex-col overflow-hidden rounded-lg border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border px-2 py-1 text-xs">
                  {row.user_monitors?.name || "Monitor"}
                </span>
                <span className="rounded-full border px-2 py-1 text-xs">
                  {row.matched_keyword || "-"}
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
                <span>Dərc: {formatDate(item?.published_at || null)}</span>
                <span>Tapıldı: {formatDate(detectedAt)}</span>
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

        {paginatedRows.length === 0 && (
          <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground md:col-span-2 xl:col-span-3">
            Nəticə tapılmadı.
          </div>
        )}
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalItems={filteredRows.length}
        onPageChange={setPage}
      />
    </div>
  );
}

export const Route = createFileRoute("/(auth)/monitor/results")({
  component: ResultsPage,
});
