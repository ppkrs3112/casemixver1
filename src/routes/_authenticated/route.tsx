import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/casemix/AppShell";
import { meQuery } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";

// Session lives in browser storage, so the gate runs client-side only.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
