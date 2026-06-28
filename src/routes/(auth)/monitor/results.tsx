import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Clock3, Download, ExternalLink, FileCode2, FileJson2, FileText, Hash, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { customerQueryKeys } from "@/lib/query-keys";
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

type ExportRange = "1" | "7" | "30" | "all";

const exportRangeLabels: Record<ExportRange, string> = {
  "1": "Son 1 gün",
  "7": "Son 7 gün",
  "30": "Son 30 gün",
  all: "Bütün nəticələr",
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

function getRowDate(row: ResultRow) {
  return row.monitored_items?.detected_at || row.created_at || row.monitored_items?.published_at || null;
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  downloadFile(filename, `\ufeff${csv}`, "text/csv;charset=utf-8");
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mapExportRow(row: ResultRow) {
  const item = row.monitored_items;
  return {
    monitor: row.user_monitors?.name || "Monitor",
    keyword: row.matched_keyword || "-",
    title: item?.title ? decodeHtml(item.title) : "Xəbər tapılmadı",
    source: getHost(item?.url),
    url: item?.url || "",
    published_at: formatDate(item?.published_at || null),
    detected_at: formatDate(item?.detected_at || row.created_at),
  };
}

function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  compact = false,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
}) {
  if (totalItems === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Əvvəlki
        </button>
        <span className="text-sm font-extrabold text-slate-700">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Növbəti
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-500">
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

type ResultsData = {
  rows: ResultRow[];
  errorMessage: string;
};

async function fetchResultsData(): Promise<ResultsData> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { rows: [], errorMessage: "Sessiya tapılmadı. Zəhmət olmasa yenidən daxil olun." };
  }

  const { data: monitors, error: monitorsError } = await supabase
    .from("user_monitors")
    .select("id")
    .eq("user_id", user.id);

  if (monitorsError) {
    console.error("User monitor load error:", monitorsError);
    return { rows: [], errorMessage: "Monitorlar yüklənmədi. Bir az sonra yenidən yoxlayın." };
  }

  const monitorIds = (monitors || []).map((item) => item.id);

  if (monitorIds.length === 0) return { rows: [], errorMessage: "" };

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
    return { rows: [], errorMessage: "Nəticələri yükləmək mümkün olmadı." };
  }

  return { rows: (data || []) as unknown as ResultRow[], errorMessage: "" };
}

function ResultsPage() {
  const { data, isLoading } = useQuery({
    queryKey: customerQueryKeys.results(),
    queryFn: fetchResultsData,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
  const rows = data?.rows || [];
  const errorMessage = data?.errorMessage || "";
  const [search, setSearch] = useState("");
  const [monitorFilter, setMonitorFilter] = useState(ALL);
  const [keywordFilter, setKeywordFilter] = useState(ALL);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [dateFilter, setDateFilter] = useState("");
  const [exportRange, setExportRange] = useState<ExportRange>("1");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, monitorFilter, keywordFilter, sourceFilter, dateFilter]);

  const monitorOptions = useMemo<FilterOption[]>((() => {
    const map = new Map<string, string>();
    rows.forEach((row) => map.set(row.monitor_id, row.user_monitors?.name || "Monitor"));
    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, "az")
    );
  }) as () => FilterOption[], [rows]);

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

  const exportRows = useMemo(() => {
    if (exportRange === "all") return filteredRows;

    const start = new Date();
    start.setDate(start.getDate() - Number(exportRange));

    return filteredRows.filter((row) => {
      const value = getRowDate(row);
      return value ? new Date(value) >= start : false;
    });
  }, [filteredRows, exportRange]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const uniqueMonitors = new Set(rows.map((row) => row.monitor_id)).size;
  const uniqueKeywords = new Set(rows.map((row) => row.matched_keyword).filter(Boolean)).size;

  function exportResults(format: "csv" | "json" | "html") {
    const mappedRows = exportRows.map(mapExportRow);

    if (format === "csv") {
      downloadCsv("tapilan-xeberler.csv", [
        ["Monitor", "Açar söz", "Başlıq", "Mənbə", "Link", "Dərc tarixi", "Tapılma vaxtı"],
        ...mappedRows.map((row) => [row.monitor, row.keyword, row.title, row.source, row.url, row.published_at, row.detected_at]),
      ]);
      return;
    }

    if (format === "json") {
      downloadFile("tapilan-xeberler.json", JSON.stringify(mappedRows, null, 2), "application/json;charset=utf-8");
      return;
    }

    const tableRows = mappedRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.monitor)}</td>
            <td>${escapeHtml(row.keyword)}</td>
            <td>${escapeHtml(row.title)}</td>
            <td>${escapeHtml(row.source)}</td>
            <td><a href="${escapeHtml(row.url)}">${escapeHtml(row.url)}</a></td>
            <td>${escapeHtml(row.published_at)}</td>
            <td>${escapeHtml(row.detected_at)}</td>
          </tr>`
      )
      .join("");

    downloadFile(
      "tapilan-xeberler.html",
      `<!doctype html><html lang="az"><head><meta charset="utf-8"><title>Tapılan xəbərlər</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#172033}table{width:100%;border-collapse:collapse}th,td{border:1px solid #dbe3ef;padding:10px;text-align:left;vertical-align:top}th{background:#f4f7fb}</style></head><body><h1>Tapılan xəbərlər</h1><p>${escapeHtml(exportRangeLabels[exportRange])} üzrə ${mappedRows.length} nəticə</p><table><thead><tr><th>Monitor</th><th>Açar söz</th><th>Başlıq</th><th>Mənbə</th><th>Link</th><th>Dərc tarixi</th><th>Tapılma vaxtı</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`,
      "text/html;charset=utf-8"
    );
  }

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-6">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Nəticələr yüklənir...</span>
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">Tapılan xəbərlər</h1>
          <p className="mt-2 text-slate-500">Açar sözlərinizə uyğun gələn son media nəticələri.</p>
        </div>
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filteredRows.length}
          onPageChange={setPage}
          compact
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-xl bg-blue-50 p-2 text-blue-700">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-blue-700">Export</h2>
              <p className="mt-1 text-sm text-slate-500">
                Seçilən interval üzrə {exportRows.length} nəticə eksport ediləcək.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={exportRange}
              onChange={(event) => setExportRange(event.target.value as ExportRange)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
            >
              {Object.entries(exportRangeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => exportResults("csv")}
              disabled={exportRows.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => exportResults("json")}
              disabled={exportRows.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileJson2 className="h-4 w-4" />
              JSON
            </button>
            <button
              type="button"
              onClick={() => exportResults("html")}
              disabled={exportRows.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileCode2 className="h-4 w-4" />
              HTML
            </button>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Nəticələr nə vaxt görünür?</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sistem mənbələri mütəmadi yoxlayır. Açar sözlərinizə uyğun yeni material tapıldıqda burada görünür.
          Nəticələrin yaranması mənbələrin nə qədər tez yenilənməsindən asılıdır.
        </p>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Tapılan media materialı</div>
              <div className="mt-1 text-2xl font-semibold">{rows.length}</div>
            </div>
            <Bell className="h-5 w-5 text-slate-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Monitor</div>
              <div className="mt-1 text-2xl font-semibold">{uniqueMonitors}</div>
            </div>
            <Clock3 className="h-5 w-5 text-slate-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Açar söz</div>
              <div className="mt-1 text-2xl font-semibold">{uniqueKeywords}</div>
            </div>
            <Hash className="h-5 w-5 text-slate-500" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Başlıq, monitor, link və ya açar söz üzrə axtar..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3"
          />
        </div>

        <select
          value={monitorFilter}
          onChange={(event) => setMonitorFilter(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
            <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {row.user_monitors?.name || "Monitor"}
                    </span>
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {row.matched_keyword || "Açar söz yoxdur"}
                    </span>
                    <span className="rounded-full border px-2 py-1 text-xs text-slate-500">
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
                    <div className="text-base font-semibold text-slate-500">{title}</div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
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

        {paginatedRows.length === 0 && !errorMessage && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="font-medium">Hələ nəticə yoxdur</div>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Sistem mənbələri yoxladıqca uyğun media materialları burada görünəcək. Əgər uzun müddət nəticə
              yaranmırsa, monitorlarınızdakı açar sözləri daha aydın və konkret yazmağı yoxlayın.
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