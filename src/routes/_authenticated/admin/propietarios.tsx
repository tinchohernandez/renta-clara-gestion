import { createFileRoute } from "@tanstack/react-router";
import { PartyManager } from "@/components/PartyManager";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/propietarios")({
  head: () => pageHead("Propietarios", "Datos y cuentas de los propietarios de los inmuebles administrados."),
  component: () => <PartyManager kind="owners" title="Propietarios" singular="propietario" />,
});
