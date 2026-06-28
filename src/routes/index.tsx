import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentSupabaseProfile } from "@/lib/auth-session";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getCurrentSupabaseProfile();

    if (!session.isAuthenticated || session.isBlocked) {
      throw redirect({ to: "/sign-in" });
    }

    throw redirect({ to: session.isAdmin ? "/admin" : "/monitor" });
  },
});
