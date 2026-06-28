import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, CalendarDays, CreditCard, Loader2, Mail, Radio, ShieldCheck } from "lucide-react";
import { customerQueryKeys } from "@/lib/query-keys";
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

async function fetchProfileData(): Promise<{ profileState: ProfileState | null; errorMessage: string }> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        profileState: null,
        errorMessage: "Sessiya tapılmadı. Zəhmət olmasa yenidən daxil olun.",
      };
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
    }

    if (monitorCountResult.error) {
      console.error("Customer monitor count error:", monitorCountResult.error);
    }

    const profile = (profileResult.data || null) as ProfileRow | null;

    return {
      profileState: {
        email: profile?.email || user.email || "-",
        role: getRoleLabel(profile?.role || null),
        status: getStatusLabel(profile?.status || null),
        createdAt: user.created_at || null,
        telegramChatId: profile?.telegram_chat_id || null,
        monitorCount: monitorCountResult.count || 0,
        plan: planResult.plan,
        planAvailable: planResult.available,
      },
      errorMessage: profileResult.error
        ? "Profil məlumatları tam yüklənmədi. Əsas hesab məlumatları göstərilir."
        : "",
    };
}

function ProfilePage() {
  const { data, isLoading } = useQuery({
    queryKey: customerQueryKeys.profile(),
    queryFn: fetchProfileData,
    staleTime: 5 * 60 * 1000,
  });
  const profileState = data?.profileState || null;
  const errorMessage = data?.errorMessage || "";

  if (isLoading) {
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
        <h1 className="text-2xl font-bold tracking-tight">Profil və ayarlar</h1>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage || "Profil məlumatları yüklənmədi."}
        </div>
      </div>
    );
  }

  const planLimit = profileState.plan?.max_watches ?? null;
  const hasReachedPlanLimit = typeof planLimit === "number" && profileState.monitorCount >= planLimit;

  return (
    <div className="grid gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profil və ayarlar</h1>
        <p className="text-muted-foreground">
          Hesab məlumatları, plan istifadəsi və bildiriş bağlantısı bu bölmədə idarə olunur.
        </p>
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
          <p className="mb-4 text-sm text-muted-foreground">
            Bu məlumatlar hesabınızın platformada hansı rol və statusla istifadə olunduğunu göstərir.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <div className="mt-2 break-all font-medium">{profileState.email}</div>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <div className="text-sm text-muted-foreground">Hesab rolu</div>
              <div className="mt-2 font-medium">{formatRole(profileState.role)}</div>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <div className="text-sm text-muted-foreground">Hesab statusu</div>
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
          <p className="mb-4 text-sm text-muted-foreground">
            Telegram bildirişləri yeni uyğun nəticələr barədə daha tez xəbərdar olmaq üçündür.
          </p>

          {profileState.telegramChatId ? (
            <div className="rounded-lg border bg-background p-4">
              <div className="text-sm text-muted-foreground">Bağlantı statusu</div>
              <div className="mt-2 font-medium text-emerald-700">Telegram bildirişləri aktivdir.</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Uyğun nəticələr tapıldıqda bildirişlər Telegram kanalınıza göndərilə bilər.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="font-medium">Telegram bildirişləri hələ aktiv deyil.</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Aktivləşdirildikdən sonra vacib nəticələr barədə Telegram üzərindən xəbər ala biləcəksiniz.
              </p>
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
          <p className="mb-4 text-sm text-muted-foreground">
            Planınız neçə monitor yarada biləcəyinizi, yoxlama tezliyini və nəticə tarixçəsinin nə qədər saxlanacağını
            müəyyən edir.
          </p>

          {profileState.planAvailable && profileState.plan ? (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-background p-4">
                  <div className="text-sm text-muted-foreground">Cari plan</div>
                  <div className="mt-2 font-medium">{profileState.plan.name || "-"}</div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="text-sm text-muted-foreground">Monitor limiti</div>
                  <div className="mt-2 font-medium">{planLimit ?? "Limitsiz"}</div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="text-sm text-muted-foreground">Ən qısa yoxlama intervalı</div>
                  <div className="mt-2 font-medium">
                    {profileState.plan.minimum_interval_minutes
                      ? `${profileState.plan.minimum_interval_minutes} dəq`
                      : "-"}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="text-sm text-muted-foreground">Nəticə tarixçəsi</div>
                  <div className="mt-2 font-medium">
                    {profileState.plan.history_days ? `${profileState.plan.history_days} gün` : "-"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                {hasReachedPlanLimit
                  ? "Monitor limitinə çatmısınız. Yeni monitor yaratmaq üçün mövcud monitorlardan birini silmək və ya planı genişləndirmək lazımdır."
                  : "Limitə çatmadığınız müddətdə yeni monitorlar yarada bilərsiniz. Limit dolduqda sistem yeni monitor yaradılmasına icazə verməyəcək."}
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
            <div className="text-sm text-muted-foreground">Yaradılmış monitorlar</div>
            <div className="mt-2 text-2xl font-semibold">{profileState.monitorCount}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {planLimit
                ? `${planLimit} monitor limitindən ${profileState.monitorCount} istifadə olunur`
                : "Monitor limiti haqqında məlumat yoxdur"}
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
