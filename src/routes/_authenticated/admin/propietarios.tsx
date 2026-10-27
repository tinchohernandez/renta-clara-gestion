import { createFileRoute } from "@tanstack/react-router";
import { PartyManager } from "@/components/PartyManager";

export const Route = createFileRoute("/_authenticated/admin/propietarios")({
  component: () => <PartyManager kind="owners" title="Propietarios" singular="propietario" />,
});
