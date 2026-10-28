import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, Field, PageTitle, selectClass } from "@/components/AppShell";
import { INDEX_LABELS, commission, dateLabel, money, propertyLabel } from "@/lib/format";
import { contractEndDate } from "@/lib/contract-duration";

export const Route = createFileRoute("/_authenticated/admin/contratos")({
  component: Contratos,
  head: () => ({ meta: [
    { title: "Contratos | Administración inmobiliaria" },
    { name: "description", content: "Gestión de contratos de alquiler, vigencia, ajustes y administración." },
    { property: "og:title", content: "Contratos | Administración inmobiliaria" },
    { property: "og:description", content: "Gestión de contratos de alquiler, vigencia, ajustes y administración." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

type Idx = "IPC" | "IPC_NEUQUEN" | "ICL" | "ACUERDO";
type Form = {
  id?: string; property_id?: string; tenant_id?: string; start_date?: string; end_date?: string;
  duration_months?: number | string;
  currency: "ARS" | "USD"; base_rent?: string | number; adjustment_index: Idx; adjustment_frequency_months: number | string;
  commission_type: "percent" | "fixed"; commission_value?: string | number; due_day: number | string; status?: string;
  fees_paid: boolean; fees_amount?: string | number | null; fees_installments?: string | number | null; notes?: string | null;
};

const blank: Form = { currency: "ARS", adjustment_index: "IPC", adjustment_frequency_months: 3, commission_type: "percent", commission_value: 5, due_day: 10, fees_paid: false, fees_installments: 1 };

function Contratos() {
  const qc = useQueryClient();
  const [f, setF] = useState<Form | null>(null);
  const [adj, setAdj] = useState<{ id: string; pct: string } | null>(null);

  const props = useQuery({ queryKey: ["properties-min"], queryFn: async () => (await supabase.from("properties").select("id, address, street_number, floor_unit, owners(full_name)").order("address")).data ?? [] });
  const tenants = useQuery({ queryKey: ["tenants-min"], queryFn: async () => (await supabase.from("tenants").select("id, full_name").order("full_name")).data ?? [] });
  const { data = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts").select("*, properties(address, street_number, floor_unit, owners(full_name)), tenants(full_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (v: Form) => {
      if (!v.property_id || !v.tenant_id) throw new Error("El contrato necesita una propiedad y un inquilino");
      const endDate = v.id ? v.end_date : contractEndDate(v.start_date, v.duration_months);
      if (!v.start_date || !endDate) throw new Error("Indicá la fecha de inicio y una duración válida en meses");
      const common = {
        property_id: v.property_id, tenant_id: v.tenant_id, start_date: v.start_date, end_date: endDate,
        currency: v.currency, adjustment_index: v.adjustment_index, adjustment_frequency_months: Number(v.adjustment_frequency_months),
        commission_type: v.commission_type, commission_value: Number(v.commission_value ?? 0), due_day: Number(v.due_day),
        notes: v.notes || null, status: v.status ?? "active",
      };
      if (v.id) {
        const { error } = await supabase.from("contracts").update(common).eq("id", v.id);
        if (error) throw error;
      } else {
        if (v.fees_paid && !Number(v.fees_amount)) throw new Error("Indicá el monto de honorarios pagado");
        const { error } = await supabase.from("contracts").insert({
          ...common, base_rent: Number(v.base_rent), current_rent: Number(v.base_rent),
          fees_paid: v.fees_paid, fees_amount: v.fees_paid ? Number(v.fees_amount) : null,
          fees_installments: v.fees_paid ? Number(v.fees_installments || 1) : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      toast.success(v.id ? "Contrato actualizado" : v.fees_paid ? "Contrato creado y honorarios cargados en la caja" : "Contrato creado");
      setF(null);
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["cash"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const manual = useMutation({
    mutationFn: async (a: { id: string; pct: string }) => {
      const { error } = await supabase.rpc("adjust_contract_manual", { _contract: a.id, _pct: Number(a.pct) });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Alquiler actualizado"); setAdj(null); qc.invalidateQueries({ queryKey: ["contracts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const missing = (props.data ?? []).length === 0 || (tenants.data ?? []).length === 0;

  return (
    <div>
      <PageTitle action={<Button disabled={missing} onClick={() => setF({ ...blank })}><Plus className="mr-1 h-4 w-4" /> Nuevo contrato</Button>}>Contratos</PageTitle>
      {missing && (
        <div className="mb-4 rounded-lg border border-border bg-secondary p-4 text-sm">
          Para crear un contrato necesitás al menos una <Link to="/admin/propiedades" className="font-semibold text-primary underline">propiedad</Link> (con su propietario) y un <Link to="/admin/inquilinos" className="font-semibold text-primary underline">inquilino</Link>.
        </div>
      )}
      {data.length === 0 ? <Empty>Sin contratos.</Empty> : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Propiedad</TableHead><TableHead>Inquilino</TableHead><TableHead>Vigencia</TableHead><TableHead>Alquiler actual</TableHead><TableHead>Ajuste</TableHead><TableHead>Administración</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{propertyLabel(c.properties)}<div className="text-xs text-muted-foreground">Prop.: {c.properties?.owners?.full_name}</div></TableCell>
                  <TableCell>{c.tenants?.full_name}</TableCell>
                  <TableCell className="text-sm">{dateLabel(c.start_date)} → {dateLabel(c.end_date)}{c.status !== "active" && <div className="text-xs text-destructive">Finalizado</div>}</TableCell>
                  <TableCell className="font-semibold">{money(c.current_rent, c.currency)}</TableCell>
                  <TableCell className="text-sm">{INDEX_LABELS[c.adjustment_index]} c/{c.adjustment_frequency_months}m<div className="text-xs text-muted-foreground">Próx.: {dateLabel(c.next_adjustment_date)}</div></TableCell>
                  <TableCell className="text-sm">{c.commission_type === "percent" ? `${c.commission_value}%` : money(c.commission_value, c.currency)}<div className="text-xs text-muted-foreground">{money(commission(c.commission_type, Number(c.commission_value), Number(c.current_rent)), c.currency)}/mes</div></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" title="Actualizar alquiler manualmente" onClick={() => setAdj({ id: c.id, pct: "" })}><TrendingUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setF({ ...c, fees_paid: c.fees_paid })}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!f} onOpenChange={(o) => !o && setF(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{f?.id ? "Editar contrato" : "Nuevo contrato"}</DialogTitle></DialogHeader>
          {f && (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(f); }}>
              <Field label="Propiedad *" className="sm:col-span-2">
                <select className={selectClass} required value={f.property_id ?? ""} onChange={(e) => setF({ ...f, property_id: e.target.value })}>
                  <option value="">Elegir…</option>
                  {(props.data ?? []).map((p) => <option key={p.id} value={p.id}>{propertyLabel(p)} — {p.owners?.full_name}</option>)}
                </select>
              </Field>
              <Field label="Inquilino *" className="sm:col-span-2">
                <select className={selectClass} required value={f.tenant_id ?? ""} onChange={(e) => setF({ ...f, tenant_id: e.target.value })}>
                  <option value="">Elegir…</option>
                  {(tenants.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </Field>
              <Field label="Inicio *"><Input type="date" required value={f.start_date ?? ""} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
              {f.id ? (
                <Field label="Fin *"><Input type="date" required value={f.end_date ?? ""} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
              ) : (
                <>
                  <Field label="Duración del contrato (meses) *"><Input type="number" min={1} step={1} required value={f.duration_months ?? ""} onChange={(e) => setF({ ...f, duration_months: e.target.value })} /></Field>
                  <Field label="Fecha de finalización" className="sm:col-span-2"><Input type="date" readOnly value={contractEndDate(f.start_date, f.duration_months)} /></Field>
                </>
              )}
              <Field label="Moneda">
                <select className={selectClass} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value as "ARS" | "USD" })}>
                  <option value="ARS">Pesos (ARS)</option><option value="USD">Dólares (USD)</option>
                </select>
              </Field>
              <Field label={f.id ? "Alquiler inicial" : "Alquiler mensual *"}>
                <Input type="number" step="0.01" required disabled={!!f.id} value={f.base_rent ?? ""} onChange={(e) => setF({ ...f, base_rent: e.target.value })} />
              </Field>
              <Field label="Índice de actualización">
                <select className={selectClass} value={f.adjustment_index} onChange={(e) => setF({ ...f, adjustment_index: e.target.value as Idx })}>
                  {Object.entries(INDEX_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
              <Field label="Se actualiza cada (meses)"><Input type="number" min={1} required value={f.adjustment_frequency_months} onChange={(e) => setF({ ...f, adjustment_frequency_months: e.target.value })} /></Field>
              <Field label="Administración">
                <select className={selectClass} value={f.commission_type} onChange={(e) => setF({ ...f, commission_type: e.target.value as "percent" | "fixed" })}>
                  <option value="percent">Porcentaje del alquiler</option><option value="fixed">Monto fijo mensual</option>
                </select>
              </Field>
              <Field label={f.commission_type === "percent" ? "% de administración" : "Monto fijo"}>
                <Input type="number" step="0.01" required value={f.commission_value ?? ""} onChange={(e) => setF({ ...f, commission_value: e.target.value })} />
              </Field>
              <Field label="Día de vencimiento"><Input type="number" min={1} max={28} value={f.due_day} onChange={(e) => setF({ ...f, due_day: e.target.value })} /></Field>
              {f.id && (
                <Field label="Estado">
                  <select className={selectClass} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                    <option value="active">Vigente</option><option value="ended">Finalizado</option>
                  </select>
                </Field>
              )}
              {!f.id && (
                <div className="space-y-3 rounded-lg border border-border bg-secondary/50 p-4 sm:col-span-2">
                  <p className="font-semibold">¿Se pagaron honorarios por este alquiler?</p>
                  <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="radio" checked={f.fees_paid} onChange={() => setF({ ...f, fees_paid: true })} /> Sí</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={!f.fees_paid} onChange={() => setF({ ...f, fees_paid: false })} /> No</label>
                  </div>
                  {f.fees_paid && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Monto total pagado"><Input type="number" step="0.01" required value={f.fees_amount ?? ""} onChange={(e) => setF({ ...f, fees_amount: e.target.value })} /></Field>
                      <Field label="Cantidad de cuotas"><Input type="number" min={1} required value={f.fees_installments ?? 1} onChange={(e) => setF({ ...f, fees_installments: e.target.value })} /></Field>
                      <p className="text-xs text-muted-foreground sm:col-span-2">Cada cuota se registra como ingreso en la caja, una por mes desde hoy.</p>
                    </div>
                  )}
                </div>
              )}
              <Button className="sm:col-span-2" disabled={save.isPending}>Guardar</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!adj} onOpenChange={(o) => !o && setAdj(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Actualizar alquiler (acuerdo de partes)</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (adj) manual.mutate(adj); }}>
            <Field label="Porcentaje de aumento"><Input type="number" step="0.01" required value={adj?.pct ?? ""} onChange={(e) => setAdj(adj && { ...adj, pct: e.target.value })} /></Field>
            <Button className="w-full" disabled={manual.isPending}>Aplicar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
