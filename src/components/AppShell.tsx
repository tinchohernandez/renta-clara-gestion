import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/session";

export function AppShell({ title, nav, children }: { title: string; nav?: { to: string; label: string; exact?: boolean }[]; children: ReactNode }) {
  const { data: me } = useMe();
  const roles = me?.roles ?? [];
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-3">
          <Link to="/panel" className="font-display text-xl font-bold text-primary">Administra</Link>
          <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-semibold text-secondary-foreground">{title}</span>
          <div className="ml-auto flex items-center gap-2">
            {roles.length > 1 && (
              <>
                {roles.includes("admin") && <Button variant="ghost" size="sm" asChild><Link to="/admin">Inmobiliaria</Link></Button>}
                {roles.includes("owner") && <Button variant="ghost" size="sm" asChild><Link to="/propietario">Propietario</Link></Button>}
                {roles.includes("tenant") && <Button variant="ghost" size="sm" asChild><Link to="/inquilino">Inquilino</Link></Button>}
              </>
            )}
            <span className="hidden text-sm text-muted-foreground md:inline">{me?.user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/auth"))}>
              <LogOut className="mr-1 h-4 w-4" /> Salir
            </Button>
          </div>
        </div>
        {nav && (
          <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.exact }}
                className="whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                activeProps={{ className: "border-primary text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-bold">{children}</h1>
      {action}
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={"block space-y-1.5 text-sm " + (className ?? "")}>
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-success/15 text-success",
    approved: "bg-success/15 text-success",
    resolved: "bg-success/15 text-success",
    submitted: "bg-warning/20 text-accent-foreground",
    pending: "bg-muted text-muted-foreground",
    open: "bg-warning/20 text-accent-foreground",
    in_progress: "bg-secondary text-secondary-foreground",
    rejected: "bg-destructive/15 text-destructive",
    Alta: "bg-destructive/15 text-destructive",
    Media: "bg-warning/20 text-accent-foreground",
    Baja: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    paid: "Pagado", submitted: "Comprobante enviado", pending: "Pendiente", approved: "Aprobado",
    rejected: "Rechazado", open: "Abierto", in_progress: "En curso", resolved: "Resuelto",
  };
  return <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold " + (map[status] ?? "bg-muted")}>{labels[status] ?? status}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">{children}</div>;
}
