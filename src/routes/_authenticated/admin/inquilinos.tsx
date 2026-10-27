import { createFileRoute } from "@tanstack/react-router";
import { PartyManager } from "@/components/PartyManager";

export const Route = createFileRoute("/_authenticated/admin/inquilinos")({
  component: () => <PartyManager kind="tenants" title="Inquilinos" singular="inquilino" />,
});
