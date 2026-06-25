import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  CheckCircle2,
  Clock3,
  Hash,
  Loader2,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type Monitor = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  telegram_chat_id: string | null;
  created_at: string | null;
};

type Keyword = {
  id: string;
  monitor_id: string;
  keyword: string;
  match_type: string | null;
  created_at: string | null;
};

type Match = {
  id: string;
  monitor_id: string;
  created_at: string | null;
};

type UserProfile = {
  user_id: string;
  telegram_chat_id: string | null;
};

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

function parseKeywordInput(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueKeywords(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const key = item.toLocaleLowerCase("az-AZ");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function StatBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  );
}

function MonitorsPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [message, setMessage] = useState("");
  const [newMonitorName, setNewMonitorName] = useState("");
  const [newMonitorDescription, setNewMonitorDescription] = useState("");
  const [newMonitorKeywords, setNewMonitorKeywords] = useState("");
  const [keywordDrafts, setKeywordDrafts] = useState<Record<string, string>>({});
  const telegramBotUsername = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setMessage("İstifadəçi sessiyası tapılmadı.");
      return;
    }

    setCurrentUserId(user.id);

    const [profileRes, monitorRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("user_id,telegram_chat_id")
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("user_monitors")
        .select("id,name,description,status,telegram_chat_id,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (profileRes.error) {
      console.error("Profil oxuma xətası:", profileRes.error);
      setProfile(null);
    } else {
      setProfile((profileRes.data || null) as UserProfile | null);
    }

    if (monitorRes.error) {
      console.error("Monitor oxuma xətası:", monitorRes.error);
      setMonitors([]);
      setKeywords([]);
      setMatches([]);
      setLoading(false);
      setMessage(`Monitorlar oxunmadı: ${monitorRes.error.message}`);
      return;
    }

    const nextMonitors = (monitorRes.data || []) as Monitor[];
    const monitorIds = nextMonitors.map((item) => item.id);
    setMonitors(nextMonitors);

    if (monitorIds.length === 0) {
      setKeywords([]);
      setMatches([]);
      setLoading(false);
      return;
    }

    const [keywordsRes, matchesRes] = await Promise.all([
      supabase
        .from("monitor_keywords")
        .select("id,monitor_id,keyword,match_type,created_at")
        .in("monitor_id", monitorIds)
        .order("created_at", { ascending: false }),

      supabase
        .from("monitor_matches")
        .select("id,monitor_id,created_at")
        .in("monitor_id", monitorIds)
        .order("created_at", { ascending: false }),
    ]);

    if (keywordsRes.error) {
      console.error("Keyword oxuma xətası:", keywordsRes.error);
      setKeywords([]);
      setMessage(`Açar sözlər oxunmadı: ${keywordsRes.error.message}`);
    } else {
      setKeywords((keywordsRes.data || []) as Keyword[]);
    }

    if (matchesRes.error) {
      console.error("Nəticə oxuma xətası:", matchesRes.error);
      setMatches([]);
    } else {
      setMatches((matchesRes.data || []) as Match[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("az-AZ");

    return monitors
      .filter((monitor) => {
        if (!q) return true;
        return [monitor.name, monitor.description || "", monitor.status || ""]
          .join(" ")
          .toLocaleLowerCase("az-AZ")
          .includes(q);
      })
      .map((monitor) => {
        const monitorKeywords = keywords.filter((item) => item.monitor_id === monitor.id);
        const monitorMatches = matches.filter((item) => item.monitor_id === monitor.id);

        return {
          ...monitor,
          keywordCount: monitorKeywords.length,
          resultCount: monitorMatches.length,
          keywords: monitorKeywords,
          lastMatch: monitorMatches[0]?.created_at || null,
        };
      });
  }, [monitors, keywords, matches, search]);

  const stats = useMemo(
    () => ({
      monitors: monitors.length,
      active: monitors.filter((item) => item.status === "active").length,
      keywords: keywords.length,
      matches: matches.length,
    }),
    [monitors, keywords, matches]
  );

  async function addKeywordsToMonitor(monitorId: string, value: string) {
    const incoming = uniqueKeywords(parseKeywordInput(value));

    if (incoming.length === 0) {
      setMessage("Açar söz yazılmalıdır.");
      return false;
    }

    const existing = new Set(
      keywords
        .filter((item) => item.monitor_id === monitorId)
        .map((item) => item.keyword.trim().toLocaleLowerCase("az-AZ"))
    );

    const fresh = incoming.filter((item) => !existing.has(item.toLocaleLowerCase("az-AZ")));

    if (fresh.length === 0) {
      setMessage("Bu açar sözlər artıq əlavə edilib.");
      return false;
    }

    const { data, error } = await supabase
      .from("monitor_keywords")
      .insert(
        fresh.map((keyword) => ({
          monitor_id: monitorId,
          keyword,
          match_type: "contains",
        }))
      )
      .select("id,monitor_id,keyword,match_type,created_at");

    if (error) {
      console.error("Açar söz əlavə xətası:", error);
      setMessage(`Açar söz əlavə olunmadı: ${error.message}`);
      return false;
    }

    setKeywords((prev) => [...((data || []) as Keyword[]), ...prev]);
    setMessage(`${fresh.length} açar söz əlavə olundu.`);
    return true;
  }

  async function createMonitor() {
    const name = newMonitorName.trim();

    if (!name) {
      setMessage("Monitor adı yazılmalıdır.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("İstifadəçi sessiyası tapılmadı.");
      return;
    }

    const { data, error } = await supabase
      .from("user_monitors")
      .insert({
        user_id: user.id,
        name,
        description: newMonitorDescription.trim() || null,
        status: "active",
        notify_telegram: true,
      })
      .select("id,name,description,status,telegram_chat_id,created_at")
      .single();

    if (error || !data) {
      setSaving(false);
      console.error("Monitor yaratma xətası:", error);
      setMessage(`Monitor yaradılmadı: ${error?.message || "Naməlum xəta"}`);
      return;
    }

    const created = data as Monitor;
    setMonitors((prev) => [created, ...prev]);

    if (newMonitorKeywords.trim()) {
      await addKeywordsToMonitor(created.id, newMonitorKeywords);
    } else {
      setMessage("Monitor yaradıldı.");
    }

    setNewMonitorName("");
    setNewMonitorDescription("");
    setNewMonitorKeywords("");
    setSaving(false);
  }

  async function addKeyword(monitorId: string) {
    const value = keywordDrafts[monitorId] || "";
    const ok = await addKeywordsToMonitor(monitorId, value);

    if (ok) {
      setKeywordDrafts((prev) => ({
        ...prev,
        [monitorId]: "",
      }));
    }
  }

  async function deleteKeyword(keywordId: string, keyword: string) {
    const confirmed = window.confirm(`"${keyword}" açar sözü silinsin?`);

    if (!confirmed) return;

    const { error } = await supabase.from("monitor_keywords").delete().eq("id", keywordId);

    if (error) {
      console.error("Açar söz silmə xətası:", error);
      setMessage(`Açar söz silinmədi: ${error.message}`);
      return;
    }

    setKeywords((prev) => prev.filter((item) => item.id !== keywordId));
    setMessage(`Açar söz silindi: ${keyword}`);
  }

  async function toggleMonitorStatus(monitor: Monitor) {
    const nextStatus = monitor.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("user_monitors")
      .update({ status: nextStatus })
      .eq("id", monitor.id);

    if (error) {
      console.error("Monitor status xətası:", error);
      setMessage(`Monitor statusu dəyişmədi: ${error.message}`);
      return;
    }

    setMonitors((prev) =>
      prev.map((item) =>
        item.id === monitor.id ? { ...item, status: nextStatus } : item
      )
    );
    setMessage(nextStatus === "active" ? "Monitor aktiv edildi." : "Monitor passiv edildi.");
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-6">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Yüklənir...</span>
      </div>
    );
  }

  const telegramConnected = Boolean(profile?.telegram_chat_id);
  const telegramLink =
    telegramBotUsername && currentUserId
      ? `https://t.me/${telegramBotUsername}?start=${currentUserId}`
      : "";

  return (
    <div className="grid gap-5 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitorlarım</h1>
          <p className="text-muted-foreground">Açar sözlər, Telegram və son nəticələr</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {telegramLink ? (
            <a
              href={telegramLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Send className="h-4 w-4" />
              Telegram-a qoş
            </a>
          ) : (
            <span className="rounded-lg border px-4 py-2 text-sm text-muted-foreground">
              Telegram bot adı aktiv deyil
            </span>
          )}
        </div>
      </div>

      {message ? (
        <div className="rounded-lg border bg-card px-4 py-3 text-sm">{message}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <StatBox label="Monitor" value={stats.monitors} icon={Activity} />
        <StatBox label="Aktiv" value={stats.active} icon={CheckCircle2} />
        <StatBox label="Açar söz" value={stats.keywords} icon={Hash} />
        <StatBox label="Nəticə" value={stats.matches} icon={Bell} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border bg-card p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Yeni monitor</h2>
            <p className="text-sm text-muted-foreground">Mövzu adı və açar söz siyahısı</p>
          </div>

          <div className="grid gap-3">
            <input
              value={newMonitorName}
              onChange={(event) => setNewMonitorName(event.target.value)}
              placeholder="Monitor adı"
              className="rounded-lg border bg-background px-3 py-2"
            />

            <input
              value={newMonitorDescription}
              onChange={(event) => setNewMonitorDescription(event.target.value)}
              placeholder="Qısa təsvir"
              className="rounded-lg border bg-background px-3 py-2"
            />

            <textarea
              value={newMonitorKeywords}
              onChange={(event) => setNewMonitorKeywords(event.target.value)}
              placeholder="Açar sözləri vergül və ya yeni sətrlə yaz"
              className="min-h-28 rounded-lg border bg-background px-3 py-2"
            />

            <button
              type="button"
              onClick={createMonitor}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Monitor yarat
            </button>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Telegram statusu</h2>
              <p className="text-sm text-muted-foreground">Bildirişlərin göndəriləcəyi hesab</p>
            </div>

            <span
              className={
                telegramConnected
                  ? "rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm text-green-700"
                  : "rounded-full border px-3 py-1 text-sm text-muted-foreground"
              }
            >
              {telegramConnected ? "Qoşulub" : "Qoşulmayıb"}
            </span>
          </div>

          <div className="grid gap-3">
            <div className="rounded-lg border bg-background p-3 text-sm">
              <div className="text-muted-foreground">Telegram chat</div>
              <div className="mt-1 font-medium">
                {profile?.telegram_chat_id || "Hələ aktiv deyil"}
              </div>
            </div>

            {telegramLink ? (
              <a
                href={telegramLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 font-medium hover:bg-muted"
              >
                <Send className="h-4 w-4" />
                Telegram-a qoş
              </a>
            ) : (
              <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                VITE_TELEGRAM_BOT_USERNAME env dəyəri əlavə olunmalıdır.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Monitor axtar"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {rows.map((monitor) => (
          <section key={monitor.id} className="rounded-lg border bg-card">
            <div className="grid gap-4 border-b p-4 lg:grid-cols-[1.4fr_0.5fr_0.5fr_0.7fr_auto]">
              <div>
                <h2 className="text-lg font-semibold">{monitor.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {monitor.description || "Təsvir yoxdur"}
                </p>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <span className="mt-1 inline-flex rounded-full border px-2 py-1 text-xs">
                  {monitor.status || "unknown"}
                </span>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Nəticə</div>
                <div className="mt-1 text-xl font-semibold">{monitor.resultCount}</div>
              </div>

              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  Son uyğunluq
                </div>
                <div className="mt-1 text-sm">{formatDate(monitor.lastMatch)}</div>
              </div>

              <div className="flex items-start lg:justify-end">
                <button
                  type="button"
                  onClick={() => toggleMonitorStatus(monitor)}
                  className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  {monitor.status === "active" ? "Passiv et" : "Aktiv et"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <textarea
                  value={keywordDrafts[monitor.id] || ""}
                  onChange={(event) =>
                    setKeywordDrafts((prev) => ({
                      ...prev,
                      [monitor.id]: event.target.value,
                    }))
                  }
                  placeholder="Yeni açar sözlər"
                  className="min-h-20 rounded-lg border bg-background px-3 py-2"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && event.ctrlKey) addKeyword(monitor.id);
                  }}
                />

                <button
                  type="button"
                  onClick={() => addKeyword(monitor.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 font-medium hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                  Əlavə et
                </button>
              </div>

              {monitor.keywords.length === 0 ? (
                <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                  Açar söz yoxdur.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {monitor.keywords.map((item) => (
                    <div
                      key={item.id}
                      className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm"
                    >
                      <span>{item.keyword}</span>
                      <button
                        type="button"
                        onClick={() => deleteKeyword(item.id, item.keyword)}
                        className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                        title="Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}

        {rows.length === 0 && (
          <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
            Monitor tapılmadı. Yuxarıdakı formadan ilk monitorunu yarat.
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/(auth)/monitor/monitors")({
  component: MonitorsPage,
});
