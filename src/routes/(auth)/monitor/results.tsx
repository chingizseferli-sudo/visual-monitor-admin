import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Clock3, Download, ExternalLink, Hash, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 12;

const ALL = "all";

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

type FilterOption = {
  value: string;
  label: string;
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

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Baku" });
}

function getHost(url: string | undefined) {
  if (!url) return "-";

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [monitorFilter, setMonitorFilter] = useState(ALL);
  const [keywordFilter, setKeywordFilter] = useState(ALL);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);

  async function loadResults() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setRows([]);
      setErrorMessage("Sessiya tapılmadı. Zəhmət olmasa yenidən daxil olun.");
      setLoading(false);
      return;
    }

    const { data: monitors, error: monitorsError } = await supabase
      .from("user_monitors")
      .select("id")
      .eq("user_id", user.id);

    if (monitorsError) {
      console.error("User monitor load error:", monitorsError);
      setRows([]);
      setErrorMessage("Monitorlar yüklənmədi. Bir az sonra yenidən yoxlayın.");
      setLoading(false);
      return;
    }

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
      setErrorMessage("Nəticələr yüklənmədi. Bağlantını yoxlayıb yenidən cəhd edin.");
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
  }, [search, monitorFilter, keywordFilter, sourceFilter, dateFilter]);

  const monitorOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => map.set(row.monitor_id, row.user_monitors?.name || "Monitor"));
    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, "az")
    );
  }, [rows]);

  const keywordOptions = useMemo<FilterOption[]>(() => {
    const values = Array.from(new Set(rows.map((row) => row.matched_keyword).filter(Boolean))) as string[];
    return values.sort((a, b) => a.localeCompare(b, "az")).map((value) => ({ value, label: value }));
  }, [rows]);

  const sourceOptions = useMemo<FilterOption[]>(() => {
    const values = Array.from(new Set(rows.map((row) => getHost(row.monitored_items?.url)).filter((value) => value !== "-")));
    return values.sort((a, b) => a.localeCompare(b, "az")).map((value) => ({ value, label: value }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.toLocaleLowerCase("az-AZ").trim();

    return rows.filter((row) => {
      const item = row.monitored_items;
      const host = getHost(item?.url);
      const detectedDate = toDateInputValue(item?.detected_at || row.created_at);
      const publishedDate = toDateInputValue(item?.published_at || null);

      const matchesSearch =
        !q ||
        (item?.title || "").toLocaleLowerCase("az-AZ").includes(q) ||
        (item?.url || "").toLocaleLowerCase("az-AZ").includes(q) ||
        (row.matched_keyword || "").toLocaleLowerCase("az-AZ").includes(q) ||
        (row.user_monitors?.name || "").toLocaleLowerCase("az-AZ").includes(q);

      return (
        matchesSearch &&
        (monitorFilter === ALL || row.monitor_id === monitorFilter) &&
        (keywordFilter === ALL || row.matched_keyword === keywordFilter) &&
        (sourceFilter === ALL || host === sourceFilter) &&
        (!dateFilter || detectedDate === dateFilter || publishedDate === dateFilter)
      );
    });
  }, [rows, search, monitorFilter, keywordFilter, sourceFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const uniqueMonitors = new Set(rows.map((row) => row.monitor_id)).size;
  const uniqueKeywords = new Set(rows.map((row) => row.matched_keyword).filter(Boolean)).size;

  function exportResults() {
    downloadCsv("monitor-results.csv", [
      ["Monitor", "Açar söz", "Başlıq", "Mənbə", "Link", "Dərc tarixi", "Tapılma vaxtı"],
      ...filteredRows.map((row) => {
        const item = row.monitored_items;
        return [
          row.user_monitors?.name || "Monitor",
          row.matched_keyword || "-",
          item?.title ? decodeHtml(item.title) : "Xəbər tapılmadı",
          getHost(item?.url),
          item?.url || "",
          formatDate(item?.published_at || null),
          formatDate(item?.detected_at || row.created_at),
        ];
      }),
    ]);
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-6">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Nəticələr yüklənir...</span>
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nəticələrim</h1>
          <p className="text-muted-foreground">Monitorlarınıza uyğun tapılan xəbərlər</p>
        </div>
        <button
          type="button"
          onClick={exportResults}
          disabled={filteredRows.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          CSV ixrac
        </button>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

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

      <div className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Başlıq, monitor, link və ya açar söz üzrə axtar"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3"
          />
        </div>

        <select
          value={monitorFilter}
          onChange={(event) => setMonitorFilter(event.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value={ALL}>Bütün monitorlar</option>
          {monitorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={keywordFilter}
          onChange={(event) => setKeywordFilter(event.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value={ALL}>Bütün açar sözlər</option>
          {keywordOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value={ALL}>Bütün mənbələr</option>
          {sourceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        />
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalItems={filteredRows.length}
        onPageChange={setPage}
      />

      <div className="grid gap-3">
        {paginatedRows.map((row) => {
          const item = row.monitored_items;
          const title = item ? decodeHtml(item.title) : "Xəbər tapılmadı";
          const detectedAt = item?.detected_at || row.created_at;

          return (
            <article key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {row.user_monitors?.name || "Monitor"}
                    </span>
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {row.matched_keyword || "Açar söz yoxdur"}
                    </span>
                    <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                      {getHost(item?.url)}
                    </span>
                  </div>

                  {item ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 text-base font-semibold leading-snug hover:underline"
                    >
                      {title}
                    </a>
                  ) : (
                    <div className="text-base font-semibold text-muted-foreground">{title}</div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>Dərc: {formatDate(item?.published_at || null)}</span>
                    <span>Tapıldı: {formatDate(detectedAt)}</span>
                  </div>
                </div>

                {item ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Aç
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}

        {paginatedRows.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center">
            <div className="font-medium">Nəticə tapılmadı</div>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Filtrləri dəyişin, axtarışı təmizləyin və ya monitorlarınıza uyğun yeni xəbər tapılmasını gözləyin.
            </p>
            <Link to="/monitor/monitors" className="mt-3 inline-flex rounded-lg border px-3 py-2 text-sm hover:bg-muted">
              Monitorlara bax
            </Link>
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
