import { createFileRoute } from "@tanstack/react-router";
import { PartyManager } from "@/components/PartyManager";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/inquilinos")({
  head: () => pageHead("Inquilinos", "Datos y cuentas de los inquilinos de la inmobiliaria."),
  component: () => <PartyManager kind="tenants" title="Inquilinos" singular="inquilino" />,
});
