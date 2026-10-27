import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Inmobiliaria — Administra" }, { name: "description", content: "Panel de la inmobiliaria." }] }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Resumen", exact: true },
  { to: "/admin/propietarios", label: "Propietarios" },
  { to: "/admin/inquilinos", label: "Inquilinos" },
  { to: "/admin/propiedades", label: "Propiedades" },
  { to: "/admin/contratos", label: "Contratos" },
  { to: "/admin/pagos", label: "Pagos" },
  { to: "/admin/reclamos", label: "Reclamos" },
  { to: "/admin/indices", label: "Índices" },
  { to: "/admin/caja", label: "Caja" },
];

function AdminLayout() {
  const { data, isLoading } = useMe();
  if (isLoading) return <div className="p-10 text-muted-foreground">Cargando…</div>;
  if (!data?.roles.includes("admin")) return <div className="p-10">No tenés acceso al panel de la inmobiliaria.</div>;
  return (
    <AppShell title="Inmobiliaria" nav={nav}>
      <Outlet />
    </AppShell>
  );
}
