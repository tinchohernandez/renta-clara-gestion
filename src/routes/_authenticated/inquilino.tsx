import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzeClaim, analyzeProof } from "@/lib/ai.functions";
import { signedUrl, uploadDoc } from "@/lib/session";
import { AppShell, Empty, Field, StatusBadge } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dateLabel, monthLabel, money, propertyLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inquilino")({
  head: () => ({ meta: [{ title: "Mi alquiler — Administra" }, { name: "description", content: "Panel del inquilino." }] }),
  component: Inquilino,
});

function Inquilino() {
  const qc = useQueryClient();
  const readProof = useServerFn(analyzeProof);
  const readClaim = useServerFn(analyzeClaim);
  const [claim, setClaim] = useState({ title: "", description: "" });
  const contracts = useQuery({
    queryKey: ["my-contracts"],
    queryFn: async () => (await supabase.from("contracts").select("*, properties(address, street_number, floor_unit, city)").eq("status", "active")).data ?? [],
  });
  const contract = contracts.data?.[0];
  const receipts = useQuery({
    enabled: !!contract,
    queryKey: ["my-receipts", contract?.id],
    queryFn: async () => (await supabase.from("receipts").select("*, payment_proofs(*), invoices(*)").eq("contract_id", contract!.id).order("period", { ascending: false }).limit(12)).data ?? [],
  });
  const claims = useQuery({
    enabled: !!contract,
    queryKey: ["my-claims", contract?.id],
    queryFn: async () => (await supabase.from("claims").select("*").eq("contract_id", contract!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const upload = useMutation({
    mutationFn: async ({ receiptId, file }: { receiptId: string; file: File }) => {
      const path = await uploadDoc(file, "comprobantes");
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("payment_proofs").insert({ receipt_id: receiptId, file_path: path, file_type: file.type, uploaded_by: u.user!.id }).select("id").single();
      if (error) throw error;
      readProof({ data: { proofId: data.id } }).finally(() => qc.invalidateQueries({ queryKey: ["my-receipts"] }));
    },
    onSuccess: () => { toast.success("Comprobante enviado. La inmobiliaria lo va a verificar."); qc.invalidateQueries({ queryKey: ["my-receipts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const newClaim = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("claims").insert({ ...claim, contract_id: contract!.id, created_by: u.user!.id }).select("id").single();
      if (error) throw error;
      readClaim({ data: { claimId: data.id } });
    },
    onSuccess: () => { toast.success("Reclamo enviado"); setClaim({ title: "", description: "" }); qc.invalidateQueries({ queryKey: ["my-claims"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (contracts.isLoading) return <AppShell title="Inquilino"><div className="text-muted-foreground">Cargando…</div></AppShell>;
  if (!contract) return <AppShell title="Inquilino"><Empty>No tenés un contrato vigente asociado. Consultá con la inmobiliaria.</Empty></AppShell>;
  const current = receipts.data?.[0];

  return (
    <AppShell title="Inquilino">
      <h1 className="text-3xl font-bold">{propertyLabel(contract.properties)}</h1>
      <p className="text-muted-foreground">Contrato {dateLabel(contract.start_date)} → {dateLabel(contract.end_date)} · Alquiler actual {money(contract.current_rent, contract.currency)}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {!current ? <Empty>Todavía no se emitió el recibo de este mes.</Empty> : (
            <ReceiptCard r={current} big onUpload={(file) => upload.mutate({ receiptId: current.id, file })} uploading={upload.isPending} />
          )}
          {(receipts.data ?? []).slice(1).map((r) => <ReceiptCard key={r.id} r={r} onUpload={(file) => upload.mutate({ receiptId: r.id, file })} uploading={upload.isPending} />)}
        </div>
        <div className="space-y-4">
          <form className="space-y-3 rounded-xl border border-border bg-card p-5" onSubmit={(e) => { e.preventDefault(); newClaim.mutate(); }}>
            <h2 className="text-xl font-semibold">Nuevo reclamo</h2>
            <Field label="Asunto"><Input required value={claim.title} onChange={(e) => setClaim({ ...claim, title: e.target.value })} /></Field>
            <Field label="Contanos qué pasa"><Textarea required rows={4} value={claim.description} onChange={(e) => setClaim({ ...claim, description: e.target.value })} /></Field>
            <Button className="w-full" disabled={newClaim.isPending}>Enviar reclamo</Button>
          </form>
          {(claims.data ?? []).map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="flex justify-between gap-2"><b>{c.title}</b><StatusBadge status={c.status} /></div>
              <p className="mt-1 text-muted-foreground">{c.description}</p>
              {c.admin_reply && <p className="mt-2 rounded-md bg-secondary p-2"><b>Inmobiliaria:</b> {c.admin_reply}</p>}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

type R = {
  id: string; period: string; due_date: string; currency: string; rent_amount: number; extra_amount: number; extra_detail: string | null; status: string;
  payment_proofs: { id: string; status: string; file_path: string; created_at: string; review_note: string | null }[];
  invoices: { id: string; file_path: string }[];
};

function ReceiptCard({ r, big, onUpload, uploading }: { r: R; big?: boolean; onUpload: (f: File) => void; uploading: boolean }) {
  const total = Number(r.rent_amount) + Number(r.extra_amount);
  return (
    <div className={"rounded-xl border border-border bg-card p-5 " + (big ? "ring-1 ring-primary/30" : "")}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{big ? "Recibo del mes" : "Recibo"}</div>
          <div className="text-xl font-semibold capitalize">{monthLabel(r.period)}</div>
        </div>
        <StatusBadge status={r.status} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <span>Alquiler</span><span className="text-right">{money(r.rent_amount, r.currency)}</span>
        {Number(r.extra_amount) > 0 && <><span>{r.extra_detail ?? "Otros"}</span><span className="text-right">{money(r.extra_amount, r.currency)}</span></>}
        <span className="font-semibold">Total</span><span className="text-right text-lg font-bold">{money(total, r.currency)}</span>
        <span className="text-muted-foreground">Vence</span><span className="text-right">{dateLabel(r.due_date)}</span>
      </div>
      {r.payment_proofs.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {r.payment_proofs.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <button className="text-primary underline" onClick={() => signedUrl(p.file_path)}>Comprobante {dateLabel(p.created_at)}</button>
              <span className="flex items-center gap-2">{p.review_note && <span className="text-xs text-muted-foreground">{p.review_note}</span>}<StatusBadge status={p.status} /></span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {r.status !== "paid" && (
          <label className="inline-flex cursor-pointer items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {uploading ? "Subiendo…" : "Adjuntar comprobante"}
            <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
          </label>
        )}
        {r.status === "paid" && (r.invoices.length > 0
          ? r.invoices.map((i) => <Button key={i.id} variant="outline" onClick={() => signedUrl(i.file_path)}>Ver factura de alquiler</Button>)
          : <span className="text-sm text-muted-foreground">El propietario todavía no cargó la factura.</span>)}
      </div>
    </div>
  );
}
