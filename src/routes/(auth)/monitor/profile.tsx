import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  CreditCard,
  Loader2,
  Mail,
  MessageCircle,
  Radio,
  Send,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
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
  if (status === "inactive") return "Passiv";
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

function InfoTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: typeof Mail;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {label}
      </div>
      <div className="mt-2 break-all font-medium text-slate-950">{value}</div>
    </div>
  );
}

function NotificationChannelCard({
  title,
  status,
  statusTone,
  icon: Icon,
}: {
  title: string;
  status: string;
  statusTone: "active" | "ready" | "soon";
  icon: typeof Bell;
}) {
  const toneClass =
    statusTone === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : statusTone === "ready"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-700">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="font-extrabold text-slate-950">{title}</h3>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-extrabold ${toneClass}`}>
          {status}
        </span>
      </div>
    </div>
  );
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
  const telegramActive = Boolean(profileState.telegramChatId);
  const emailReady = profileState.email !== "-";

  return (
    <div className="grid gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profil və ayarlar</h1>
        <p className="text-slate-500">
          Hesab məlumatları, plan istifadəsi və bildiriş kanalları bu bölmədə göstərilir.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold">Hesab məlumatları</h2>
          </div>
          <p className="mb-4 text-sm text-slate-500">
            Bu məlumatlar hesabınızın platformada hansı rol və statusla istifadə olunduğunu göstərir.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Email" value={profileState.email} icon={Mail} />
            <InfoTile label="Hesab rolu" value={profileState.role} />
            <InfoTile label="Hesab statusu" value={profileState.status} />
            <InfoTile label="Qeydiyyat tarixi" value={formatDate(profileState.createdAt)} icon={CalendarDays} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Radio className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold">İstifadə</h2>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">Yaradılmış monitorlar</div>
            <div className="mt-2 text-2xl font-semibold">{profileState.monitorCount}</div>
            <div className="mt-1 text-sm text-slate-500">
              {planLimit
                ? `${planLimit} monitor limitindən ${profileState.monitorCount} istifadə olunur`
                : "Monitor limiti haqqında məlumat yoxdur"}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold">Bildiriş kanalları</h2>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <NotificationChannelCard
            title="Telegram"
            status={telegramActive ? "Aktiv" : "Aktiv deyil"}
            statusTone={telegramActive ? "active" : "soon"}
            icon={Send}
          />
          <NotificationChannelCard
            title="Email"
            status={emailReady ? "Hazır" : "Aktiv deyil"}
            statusTone={emailReady ? "ready" : "soon"}
            icon={Mail}
          />
          <NotificationChannelCard
            title="Discord"
            status="Hazırlanır"
            statusTone="soon"
            icon={MessageCircle}
          />
          <NotificationChannelCard
            title="WhatsApp"
            status="Hazırlanır"
            statusTone="soon"
            icon={Smartphone}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold">Plan və limitlər</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Planınız neçə monitor yarada biləcəyinizi, yoxlama tezliyini və nəticə tarixçəsinin nə qədər saxlanacağını müəyyən edir.
        </p>

        {profileState.planAvailable && profileState.plan ? (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoTile label="Cari plan" value={profileState.plan.name || "-"} />
              <InfoTile label="Monitor limiti" value={planLimit ?? "Limitsiz"} />
              <InfoTile
                label="Ən qısa yoxlama intervalı"
                value={profileState.plan.minimum_interval_minutes ? `${profileState.plan.minimum_interval_minutes} dəq` : "-"}
              />
              <InfoTile
                label="Nəticə tarixçəsi"
                value={profileState.plan.history_days ? `${profileState.plan.history_days} gün` : "-"}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#f7f9fd] p-4 text-sm text-slate-500">
              {hasReachedPlanLimit
                ? "Monitor limitinə çatmısınız. Yeni monitor yaratmaq üçün mövcud monitorlardan birini silmək və ya planı genişləndirmək lazımdır."
                : "Limitə çatmadığınız müddətdə yeni monitorlar yarada bilərsiniz. Limit dolduqda sistem yeni monitor yaradılmasına icazə verməyəcək."}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-[#f7f9fd] p-4 text-sm text-slate-500">
            Plan məlumatı hələ aktiv deyil.
          </div>
        )}
      </section>
    </div>
  );
}

export const Route = createFileRoute("/(auth)/monitor/profile")({
  component: ProfilePage,
});