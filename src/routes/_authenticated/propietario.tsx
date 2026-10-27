import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl, uploadDoc } from "@/lib/session";
import { AppShell, Empty, StatusBadge } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { monthLabel, monthStart, money, propertyLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/propietario")({
  head: () => ({ meta: [{ title: "Mis propiedades — Administra" }, { name: "description", content: "Panel del propietario." }] }),
  component: Propietario,
});

function Propietario() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(monthStart().slice(0, 7));
  const period = `${month}-01`;
  const { data = [], isLoading } = useQuery({
    queryKey: ["owner-receipts", period],
    queryFn: async () =>
      (await supabase.from("receipts").select("*, invoices(*), contracts(properties(address, street_number, floor_unit), tenants(full_name))").eq("period", period)).data ?? [],
  });
  const upload = useMutation({
    mutationFn: async ({ receiptId, file }: { receiptId: string; file: File }) => {
      const path = await uploadDoc(file, "facturas");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("invoices").insert({ receipt_id: receiptId, file_path: path, uploaded_by: u.user!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Factura cargada"); qc.invalidateQueries({ queryKey: ["owner-receipts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const byCur = (cur: string) => {
    const paid = data.filter((r) => r.currency === cur && r.status === "paid");
    const gross = paid.reduce((s, r) => s + Number(r.rent_amount), 0);
    const adm = paid.reduce((s, r) => s + Number(r.commission_amount), 0);
    return { gross, adm, net: gross - adm, count: paid.length };
  };

  return (
    <AppShell title="Propietario">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Rendición de <span className="capitalize">{monthLabel(period)}</span></h1>
        <Input type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {(["ARS", "USD"] as const).map((cur) => {
          const t = byCur(cur);
          if (t.count === 0 && !data.some((r) => r.currency === cur)) return null;
          return (
            <div key={cur} className="rounded-xl border border-border bg-card p-5">
              <div className="text-sm font-semibold text-muted-foreground">{cur} · {t.count} pago(s) cobrados</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>Alquileres<div className="text-lg font-bold">{money(t.gross, cur)}</div></div>
                <div>Administración<div className="text-lg font-bold text-destructive">−{money(t.adm, cur)}</div></div>
                <div>A rendir<div className="text-lg font-bold text-success">{money(t.net, cur)}</div></div>
              </div>
            </div>
          );
        })}
      </div>
      {isLoading ? <div className="text-muted-foreground">Cargando…</div> : data.length === 0 ? <Empty>No hay recibos para este mes.</Empty> : (
        <div className="space-y-3">
          {data.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <div>
                <div className="font-semibold">{propertyLabel(r.contracts?.properties)}</div>
                <div className="text-sm text-muted-foreground">Inquilino: {r.contracts?.tenants?.full_name}</div>
              </div>
              <div className="text-sm">
                {money(r.rent_amount, r.currency)} − {money(r.commission_amount, r.currency)} = <b>{money(Number(r.rent_amount) - Number(r.commission_amount), r.currency)}</b>
              </div>
              <StatusBadge status={r.status} />
              <div className="flex gap-2">
                {r.invoices.map((i) => <Button key={i.id} size="sm" variant="outline" onClick={() => signedUrl(i.file_path)}>Ver factura</Button>)}
                <label className="inline-flex cursor-pointer items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  {r.invoices.length ? "Reemplazar factura" : "Adjuntar factura"}
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate({ receiptId: r.id, file: f }); e.target.value = ""; }} />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
