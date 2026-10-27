import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeProof } from "@/lib/ai.functions";
import { signedUrl } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Empty, PageTitle, StatusBadge } from "@/components/AppShell";
import { dateLabel, monthLabel, money, propertyLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/pagos")({ component: Pagos });

function Pagos() {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeProof);
  const { data = [] } = useQuery({
    queryKey: ["proofs"],
    queryFn: async () => (await supabase.from("payment_proofs").select("*, receipts(period, rent_amount, extra_amount, currency, contracts(properties(address, street_number, floor_unit), tenants(full_name)))").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  const review = useMutation({
    mutationFn: async ({ id, ok }: { id: string; ok: boolean }) => {
      const note = ok ? null : prompt("Motivo del rechazo") ?? null;
      const { error } = await supabase.rpc("review_payment", { _proof: id, _approve: ok, _note: note ?? undefined });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(v.ok ? "Pago confirmado y administración sumada a la caja" : "Comprobante rechazado"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const reread = useMutation({
    mutationFn: async (id: string) => { const r = await analyze({ data: { proofId: id } }); if (!r.ok) throw new Error(r.error); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proofs"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div>
      <PageTitle>Comprobantes de pago</PageTitle>
      {data.length === 0 ? <Empty>Todavía no hay comprobantes.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((p) => {
            const r = p.receipts;
            const due = r ? Number(r.rent_amount) + Number(r.extra_amount) : 0;
            const mismatch = p.ai_amount != null && Math.abs(Number(p.ai_amount) - due) > 1;
            return (
              <div key={p.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{r?.contracts?.tenants?.full_name}</div>
                    <div className="text-sm text-muted-foreground">{propertyLabel(r?.contracts?.properties)} · <span className="capitalize">{r && monthLabel(r.period)}</span></div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-1 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Leído por IA</div>
                  {p.ai_status === "pending" && <span className="text-muted-foreground">Analizando…</span>}
                  {p.ai_status === "error" && <span className="text-destructive">{p.ai_notes}</span>}
                  {p.ai_status === "done" && (
                    <div className="grid grid-cols-2 gap-1">
                      <span>Monto: <b className={mismatch ? "text-destructive" : ""}>{p.ai_amount != null ? money(p.ai_amount, p.ai_currency ?? r?.currency) : "-"}</b></span>
                      <span>Fecha: <b>{dateLabel(p.ai_date)}</b></span>
                      <span>Método: <b>{p.ai_method ?? "-"}</b></span>
                      <span>A pagar: <b>{money(due, r?.currency)}</b></span>
                      {p.ai_notes && <span className="col-span-2 text-muted-foreground">{p.ai_notes}</span>}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => signedUrl(p.file_path).catch((e) => toast.error(e.message))}>Ver archivo</Button>
                  <Button size="sm" variant="ghost" disabled={reread.isPending} onClick={() => reread.mutate(p.id)}>Releer con IA</Button>
                  {p.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => review.mutate({ id: p.id, ok: true })}>Confirmar pago</Button>
                      <Button size="sm" variant="destructive" onClick={() => review.mutate({ id: p.id, ok: false })}>Rechazar</Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
