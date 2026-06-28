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

    const generatedAt = new Date().toLocaleString("az-AZ", {
      timeZone: "Asia/Baku",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const tableRows = mappedRows
      .map((row) => {
        const dateValue = row.published_at !== "-" ? row.published_at : row.detected_at;
        const [datePart = "-", timePart = "-"] = dateValue.split(",").map((part) => part.trim());

        return `
          <tr>
            <td><span class="monitor-pill">${escapeHtml(row.monitor)}</span></td>
            <td>${escapeHtml(row.source)}</td>
            <td><a href="${escapeHtml(row.url)}" target="_blank" rel="noreferrer">${escapeHtml(row.title)}</a></td>
            <td><span class="keyword-pill">${escapeHtml(row.keyword)}</span></td>
            <td>
              <div class="date-cell">
                <strong>${escapeHtml(datePart)}</strong>
                <span>${escapeHtml(timePart)}</span>
              </div>
            </td>
          </tr>`;
      })
      .join("");

    const tableSection = mappedRows.length > 0
      ? `<table>
          <thead>
            <tr>
              <th>Monitor</th>
              <th>Mənbə</th>
              <th>Başlıq</th>
              <th>Açar söz</th>
              <th>Dərc vaxtı</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>`
      : `<div class="empty">Seçilən interval üzrə ixrac ediləcək nəticə yoxdur.</div>`;

    downloadFile(
      "tapilan-xeberler.html",
      `<!doctype html>
<html lang="az">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Visual Monitor Export</title>
    <style>
      *{box-sizing:border-box}
      body{
        margin:0;
        color:#172033;
        background:#f5f8ff;
        font-family:"Segoe UI",Tahoma,Arial,sans-serif;
        -webkit-font-smoothing:antialiased;
        text-rendering:geometricPrecision;
      }
      .page{max-width:1180px;margin:0 auto;padding:34px}
      .hero{
        overflow:hidden;
        border-radius:22px;
        padding:28px;
        color:white;
        background:
          radial-gradient(circle at 18% 20%, rgba(255,255,255,.28), transparent 28%),
          linear-gradient(135deg,#1463ff 0%,#14b8a6 58%,#f59e0b 120%);
        box-shadow:0 24px 70px rgba(20,99,255,.2);
      }
      .brand{display:flex;align-items:center;gap:12px;margin-bottom:26px}
      .logo{
        display:grid;
        width:46px;
        height:46px;
        place-items:center;
        border-radius:14px;
        color:#1463ff;
        background:white;
        font-weight:900;
        letter-spacing:0;
      }
      .brand strong{font-size:20px}
      h1{margin:0;font-size:34px;line-height:1.05;letter-spacing:0}
      .hero p{max-width:760px;margin:12px 0 0;color:rgba(255,255,255,.88);font-size:16px;line-height:1.55}
      .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:22px}
      .stat{
        border:1px solid rgba(255,255,255,.22);
        border-radius:14px;
        padding:14px;
        background:rgba(255,255,255,.14);
      }
      .stat span{display:block;color:rgba(255,255,255,.78);font-size:12px;font-weight:800;text-transform:uppercase}
      .stat strong{display:block;margin-top:6px;font-size:24px}
      .table-wrap{
        margin-top:24px;
        overflow:hidden;
        border:1px solid #dce6f3;
        border-radius:18px;
        background:white;
        box-shadow:0 18px 50px rgba(40,55,85,.08);
      }
      table{width:100%;border-collapse:collapse}
      th,td{padding:14px 16px;text-align:left;vertical-align:top;border-bottom:1px solid #e8eef7}
      th{color:#315078;background:#eef5ff;font-size:12px;text-transform:uppercase;letter-spacing:0;font-weight:900}
      th:last-child,td:last-child{width:150px}
      tr:nth-child(even) td{background:#fbfdff}
      tr:hover td{background:#f5fbff}
      a{color:#0f4fd7;font-weight:800;text-decoration:none}
      .monitor-pill,.keyword-pill{
        display:inline-flex;
        min-height:28px;
        align-items:center;
        border-radius:999px;
        padding:0 10px;
        font-size:12px;
        font-weight:900;
        white-space:nowrap;
      }
      .monitor-pill{color:#0f4fd7;background:#eaf1ff}
      .keyword-pill{color:#0f766e;background:#dcfdfa}
      .date-cell{display:grid;gap:6px;min-width:118px}
      .date-cell strong{font-size:14px;white-space:nowrap}
      .date-cell span{
        display:inline-flex;
        width:fit-content;
        min-height:26px;
        align-items:center;
        border-radius:999px;
        padding:0 10px;
        color:#0f4fd7;
        background:#eaf1ff;
        font-size:12px;
        font-weight:900;
      }
      .empty{padding:34px;text-align:center;color:#61708a}
      .footer{margin-top:18px;color:#61708a;font-size:12px}
      @media (max-width: 760px){
        .page{padding:18px}
        .stats{grid-template-columns:1fr}
        .table-wrap{overflow-x:auto}
        table{min-width:820px}
      }
      @media print{
        body{background:white}
        .page{padding:0}
        .hero,.table-wrap{box-shadow:none}
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="brand">
          <div class="logo">VM</div>
          <strong>Visual Monitor</strong>
        </div>
        <h1>Media Monitorinq Hesabatı</h1>
        <p>Seçilmiş dövr üzrə tapılan uyğun xəbər nəticələri. Hesabat mənbə, dərc vaxtı, açar söz və keçid məlumatlarını bir yerdə göstərir.</p>
        <div class="stats">
          <div class="stat"><span>Interval</span><strong>${escapeHtml(exportRangeLabels[exportRange])}</strong></div>
          <div class="stat"><span>Nəticə sayı</span><strong>${mappedRows.length}</strong></div>
          <div class="stat"><span>Hazırlandı</span><strong>${escapeHtml(generatedAt)}</strong></div>
        </div>
      </section>

      <section class="table-wrap">${tableSection}</section>
      <div class="footer">Visual Monitor tərəfindən avtomatik yaradılıb.</div>
    </main>
  </body>
</html>`,
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
    <div className="grid gap-3 p-3 md:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">Tapılan xəbərlər</h1>
          <p className="mt-1 text-sm text-slate-500">Açar sözlərinizə uyğun gələn son media nəticələri.</p>
        </div>
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filteredRows.length}
          onPageChange={setPage}
          compact
        />
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 font-extrabold text-blue-700">
              <Download className="h-4 w-4" />
              Export
            </span>
            <span className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-slate-600">
              {exportRows.length} nəticə
            </span>
            <span className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-slate-600">
              {rows.length} media
            </span>
            <span className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-slate-600">
              {uniqueMonitors} monitor
            </span>
            <span className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-slate-600">
              {uniqueKeywords} açar söz
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={exportRange}
              onChange={(event) => setExportRange(event.target.value as ExportRange)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
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
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => exportResults("json")}
              disabled={exportRows.length === 0}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileJson2 className="h-4 w-4" />
              JSON
            </button>
            <button
              type="button"
              onClick={() => exportResults("html")}
              disabled={exportRows.length === 0}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileCode2 className="h-4 w-4" />
              HTML
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Başlıq, monitor, link və ya açar söz üzrə axtar..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm"
            />
          </div>

          <select
            value={monitorFilter}
            onChange={(event) => setMonitorFilter(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
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
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
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
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
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
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          />
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Sistem mənbələri mütəmadi yoxlayır; uyğun yeni material tapıldıqda bu siyahıya əlavə olunur.
        </p>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm text-slate-500">
          <span>{filteredRows.length} nəticə | səhifə {safePage} / {totalPages}</span>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={filteredRows.length}
            onPageChange={setPage}
            compact
          />
        </div>

        <div className="divide-y divide-slate-100">
          {paginatedRows.map((row) => {
            const item = row.monitored_items;
            const title = item ? decodeHtml(item.title) : "Xəbər tapılmadı";
            const detectedAt = item?.detected_at || row.created_at;

            return (
              <article key={row.id} className="px-3 py-2.5 transition hover:bg-slate-50">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5">{row.user_monitors?.name || "Monitor"}</span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{row.matched_keyword || "Açar söz yoxdur"}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5">{getHost(item?.url)}</span>
                    </div>

                    {item ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate text-sm font-extrabold leading-5 text-slate-950 hover:text-blue-700 hover:underline"
                      >
                        {title}
                      </a>
                    ) : (
                      <div className="mt-1 truncate text-sm font-extrabold text-slate-500">{title}</div>
                    )}

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>Dərc: {formatDate(item?.published_at || null)}</span>
                      <span>Tapıldı: {formatDate(detectedAt)}</span>
                    </div>
                  </div>

                  {item ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-bold hover:bg-slate-50"
                    >
                      Aç
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}

          {paginatedRows.length === 0 && !errorMessage && (
            <div className="p-6 text-center">
              <div className="font-medium">Hələ nəticə yoxdur</div>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Sistem mənbələri yoxladıqca uyğun media materialları burada görünəcək. Uzun müddət nəticə yaranmırsa,
                açar sözləri daha konkret yazmağı yoxlayın.
              </p>
              <Link to="/monitor/monitors" className="mt-3 inline-flex rounded-lg border px-3 py-2 text-sm hover:bg-muted">
                Monitorlara bax
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export const Route = createFileRoute("/(auth)/monitor/results")({
  component: ResultsPage,
});