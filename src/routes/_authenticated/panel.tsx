import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({ meta: [{ title: "Mi panel — Administra" }, { name: "description", content: "Tu panel en Administra." }] }),
  component: Panel,
});

function Panel() {
  const { data, isLoading } = useMe();
  if (isLoading || !data) return <div className="p-10 text-muted-foreground">Cargando…</div>;
  if (data.roles.includes("admin")) return <Navigate to="/admin" />;
  if (data.roles.includes("tenant")) return <Navigate to="/inquilino" />;
  if (data.roles.includes("owner")) return <Navigate to="/propietario" />;
  return (
    <AppShell title="Sin acceso">
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-bold">Tu cuenta todavía no está vinculada</h1>
        <p className="mt-3 text-muted-foreground">
          Pedile a la inmobiliaria que registre tu email ({data.user?.email}) como inquilino o propietario. Cuando lo hagan, vas a ver tu panel al volver a entrar.
        </p>
      </div>
    </AppShell>
  );
}
