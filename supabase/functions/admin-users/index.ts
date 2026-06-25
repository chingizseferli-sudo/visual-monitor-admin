const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing" }, 500);
  }

  const users: AuthUser[] = [];
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      return json({ error: `Auth users could not be read: ${response.status}`, detail: await response.text() }, 500);
    }

    const payload = await response.json();
    const batch = Array.isArray(payload?.users) ? payload.users : Array.isArray(payload) ? payload : [];
    users.push(
      ...batch.map((user: AuthUser) => ({
        id: user.id,
        email: user.email || null,
        phone: user.phone || null,
        created_at: user.created_at || null,
        updated_at: user.updated_at || null,
        last_sign_in_at: user.last_sign_in_at || null,
        user_metadata: user.user_metadata || null,
      }))
    );

    if (batch.length < perPage) break;
    page += 1;
  }

  return json({ users });
});
