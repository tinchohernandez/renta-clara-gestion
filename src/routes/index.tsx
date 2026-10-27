import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, FileCheck2, Wallet, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Administra — Gestión de alquileres para inmobiliarias" },
      { name: "description", content: "Contratos, recibos, comprobantes, rendiciones, reclamos y caja en un solo lugar." },
      { property: "og:title", content: "Administra — Gestión de alquileres" },
      { property: "og:description", content: "Contratos, recibos, comprobantes, rendiciones, reclamos y caja en un solo lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Building2, t: "Inmobiliaria", d: "Propietarios, inquilinos, propiedades, contratos, índices y caja." },
  { icon: FileCheck2, t: "Inquilino", d: "Recibo del mes, carga de comprobantes y factura del propietario." },
  { icon: Wallet, t: "Propietario", d: "Rendición mensual neta de administración y carga de facturas." },
  { icon: Wrench, t: "Reclamos con IA", d: "Resumen, prioridad y respuesta sugerida para cada reclamo." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-2xl font-bold text-primary">Administra</span>
        <Button asChild>
          <Link to="/auth">Ingresar</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Administración de alquileres</p>
        <h1 className="mt-3 max-w-3xl text-5xl font-bold leading-tight text-foreground md:text-6xl">
          Cada alquiler, cada mes, <span className="text-primary">en orden.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Un panel para la inmobiliaria, otro para el inquilino y otro para el propietario. Los comprobantes se leen solos y la caja se completa sola.
        </p>
        <div className="mt-8 flex gap-3">
          <Button size="lg" asChild>
            <Link to="/auth">Entrar a mi panel</Link>
          </Button>
        </div>
        <div className="mt-16 grid gap-4 md:grid-cols-4">
          {features.map((f) => (
            <div key={f.t} className="rounded-xl border border-border bg-card p-5">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
