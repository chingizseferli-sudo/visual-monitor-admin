import { createFileRoute } from "@tanstack/react-router";
import { Bell, CalendarDays, CreditCard, Loader2, Mail, Radio, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type ProfileRow = {
  user_id: string;
  email: string | null;
  role: string | null;
  status: string | null;
  telegram_chat_id: string | null;
};

type PlanInfo = {
  name: string | null;
  max_watches: number | null;
  minimum_interval_minutes: number | null;
  history_days: number | null;
  telegram_enabled: boolean | null;
};

type ProfileState = {
  email: string;
  role: string;
  status: string;
  createdAt: string | null;
  telegramChatId: string | null;
  monitorCount: number;
  plan: PlanInfo | null;
  planAvailable: boolean;
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

function getRoleLabel(role: string | null) {
  if (role === "superadmin") return "Superadmin";
  if (role === "admin") return "Admin";
  if (role === "customer") return "İstifadəçi";
  return "İstifadəçi";
}

function getStatusLabel(status: string | null) {
  if (status === "active") return "Aktiv";
  if (status === "blocked") return "Bloklanıb";
  return status || "-";
}

async function loadOptionalPlan(userId: string): Promise<{ plan: PlanInfo | null; available: boolean }> {
  const profilePlan = await supabase
    .from("user_profiles")
    .select("plan_id")
    .eq("user_id", userId)
    .maybeSingle();

  const planId = (profilePlan.data as { plan_id?: string | null } | null)?.plan_id;

  if (profilePlan.error || !planId) {
    return { plan: null, available: false };
  }

  const planResult = await supabase
    .from("subscription_plans")
    .select("name,max_watches,minimum_interval_minutes,history_days,telegram_enabled")
    .eq("id", planId)
    .maybeSingle();

  if (planResult.error || !planResult.data) {
    return { plan: null, available: false };
  }

  return { plan: planResult.data as PlanInfo, available: true };
}

function formatRole(role: string) {
  if (role === "customer") return "İstifadəçi";
  if (role === "admin") return "Admin";
  if (role === "superadmin") return "Superadmin";
  return role || "-";
}

function formatStatus(status: string) {
  if (status === "active") return "Aktiv";
  if (status === "blocked") return "Bloklanıb";
  if (status === "inactive") return "Passiv";
  return status || "-";
}

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [profileState, setProfileState] = useState<ProfileState | null>(null);

  async function loadProfile() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProfileState(null);
      setErrorMessage("Sessiya tapılmadı. Zəhmət olmasa yenidən daxil olun.");
      setLoading(false);
      return;
    }

    const [profileResult, monitorCountResult, planResult] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("user_id,email,role,status,telegram_chat_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_monitors")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      loadOptionalPlan(user.id),
    ]);

    if (profileResult.error) {
      console.error("Customer profile load error:", profileResult.error);
      setErrorMessage("Profil məlumatları tam yüklənmədi. Əsas hesab məlumatları göstərilir.");
    }

    if (monitorCountResult.error) {
      console.error("Customer monitor count error:", monitorCountResult.error);
    }

    const profile = (profileResult.data || null) as ProfileRow | null;

    setProfileState({
      email: profile?.email || user.email || "-",
      role: getRoleLabel(profile?.role || null),
      status: getStatusLabel(profile?.status || null),
      createdAt: user.created_at || null,
      telegramChatId: profile?.telegram_chat_id || null,
      monitorCount: monitorCountResult.count || 0,
      plan: planResult.plan,
      planAvailable: planResult.available,
    });

    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-6">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Profil məlumatları yüklənir...</span>
      </div>
    );
  }

  if (!profileState) {
    return (
      <div className="grid gap-4 p-6">
        <h1 className="text-2xl font-bold tracking-tight">İstifadəçi profili və ayarları</h1>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage || "Profil məlumatları yüklənmədi."}
        </div>
      </div>
    );
  }

  const planLimit = profileState.plan?.max_watches ?? null;

  return (
    <div className="grid gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">İstifadəçi profili və ayarları</h1>
        <p className="text-muted-foreground">Hesab, plan və bildiriş məlumatlarınız</p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Hesab məlumatları</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <div className="mt-2 break-all font-medium">{profileState.email}</div>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <div className="text-sm text-muted-foreground">Rol</div>
              <div className="mt-2 font-medium">{formatRole(profileState.role)}</div>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="mt-2 font-medium">{formatStatus(profileState.status)}</div>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Qeydiyyat tarixi
              </div>
              <div className="mt-2 font-medium">{formatDate(profileState.createdAt)}</div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Telegram</h2>
          </div>

          {profileState.telegramChatId ? (
            <div className="rounded-lg border bg-background p-4">
              <div className="text-sm text-muted-foreground">Bağlantı statusu</div>
              <div className="mt-2 font-medium text-emerald-700">Aktivdir</div>
              <div className="mt-1 break-all text-sm text-muted-foreground">
                Chat ID: {profileState.telegramChatId}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Telegram bağlantısı ayrıca aktivləşdiriləcək.
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Plan və limitlər</h2>
          </div>

          {profileState.planAvailable && profileState.plan ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-background p-4">
                <div className="text-sm text-muted-foreground">Plan</div>
                <div className="mt-2 font-medium">{profileState.plan.name || "-"}</div>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <div className="text-sm text-muted-foreground">Monitor limiti</div>
                <div className="mt-2 font-medium">{planLimit ?? "Limitsiz"}</div>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <div className="text-sm text-muted-foreground">Minimum interval</div>
                <div className="mt-2 font-medium">
                  {profileState.plan.minimum_interval_minutes
                    ? `${profileState.plan.minimum_interval_minutes} dəq`
                    : "-"}
                </div>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <div className="text-sm text-muted-foreground">Tarixçə</div>
                <div className="mt-2 font-medium">
                  {profileState.plan.history_days ? `${profileState.plan.history_days} gün` : "-"}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Plan məlumatı hələ aktiv deyil.
            </div>
          )}
        </section>

        <section className="rounded-lg border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Radio className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">İstifadə</h2>
          </div>

          <div className="rounded-lg border bg-background p-4">
            <div className="text-sm text-muted-foreground">Cari monitor sayı</div>
            <div className="mt-2 text-2xl font-semibold">{profileState.monitorCount}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {planLimit ? `${planLimit} limitindən istifadə olunur` : "Limit məlumatı yoxdur"}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/(auth)/monitor/profile")({
  component: ProfilePage,
});
