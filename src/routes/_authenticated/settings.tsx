import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Building2, Palette, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { meQuery } from "@/lib/data";
export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan — Casemix RS" },
      { name: "description", content: "Pengaturan penjamin COB, tampilan dan akun tim Casemix." },
      { property: "og:title", content: "Pengaturan — Casemix RS" },
      {
        property: "og:description",
        content: "Pengaturan penjamin, tampilan dan akun tim rumah sakit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});
function Settings() {
  const { data: me } = useSuspenseQuery(meQuery);
  return (
    <main className="p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold">Pengaturan</h1>
      {me?.role !== "Admin" ? (
        <p>Menu ini khusus Admin.</p>
      ) : (
        <div className="max-w-3xl space-y-3">
          {[
            { to: "/pengaturan", label: "Kelola Penjamin COB", icon: Building2 },
            { to: "/tampilan", label: "Pengaturan Tampilan", icon: Palette },
            { to: "/akun", label: "Kelola Akun", icon: Users },
          ].map((n) => (
            <Button key={n.to} asChild variant="outline" className="h-16 w-full justify-start">
              <Link to={n.to}>
                <n.icon />
                {n.label}
                <ChevronRight className="ml-auto" />
              </Link>
            </Button>
          ))}
        </div>
      )}
    </main>
  );
}
