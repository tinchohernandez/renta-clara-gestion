import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field, PageTitle, selectClass } from "@/components/AppShell";
import { dateLabel, monthStart, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/caja")({ component: Caja });

const INCOME_CATS = ["Venta", "Tasación", "Honorarios extra", "Otro ingreso"];
const EXPENSE_CATS = ["Sueldos", "Alquiler oficina", "Servicios", "Impuestos", "Publicidad", "Mantenimiento", "Otro gasto"];
type Mov = { kind: "income" | "expense"; category: string; description: string; amount: string; currency: "ARS" | "USD"; movement_date: string };

function Caja() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(monthStart().slice(0, 7));
  const [m, setM] = useState<Mov | null>(null);
  const start = `${month}-01`;
  const end = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).toISOString().slice(0, 10);
  const { data = [] } = useQuery({
    queryKey: ["cash", month],
    queryFn: async () => (await supabase.from("cash_movements").select("*").gte("movement_date", start).lte("movement_date", end).order("movement_date")).data ?? [],
  });
  const save = useMutation({
    mutationFn: async (v: Mov) => {
      const { error } = await supabase.from("cash_movements").insert({ ...v, amount: Number(v.amount), source: "manual" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Movimiento cargado"); setM(null); qc.invalidateQueries({ queryKey: ["cash"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("cash_movements").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cash"] }),
  });
  const totals = (cur: "ARS" | "USD") => {
    const inc = data.filter((d) => d.currency === cur && d.kind === "income").reduce((s, d) => s + Number(d.amount), 0);
    const exp = data.filter((d) => d.currency === cur && d.kind === "expense").reduce((s, d) => s + Number(d.amount), 0);
    return { inc, exp, bal: inc - exp };
  };
  return (
    <div>
      <PageTitle action={<div className="flex gap-2"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /><Button onClick={() => setM({ kind: "expense", category: EXPENSE_CATS[0], description: "", amount: "", currency: "ARS", movement_date: new Date().toISOString().slice(0, 10) })}><Plus className="mr-1 h-4 w-4" /> Movimiento</Button></div>}>
        Flujo de caja
      </PageTitle>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {(["ARS", "USD"] as const).map((cur) => {
          const t = totals(cur);
          return (
            <div key={cur} className="rounded-xl border border-border bg-card p-5">
              <div className="text-sm font-semibold text-muted-foreground">{cur}</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>Ingresos<div className="text-lg font-bold text-success">{money(t.inc, cur)}</div></div>
                <div>Gastos<div className="text-lg font-bold text-destructive">{money(t.exp, cur)}</div></div>
                <div>Saldo<div className="text-lg font-bold">{money(t.bal, cur)}</div></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Categoría</TableHead><TableHead>Detalle</TableHead><TableHead>Origen</TableHead><TableHead className="text-right">Monto</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{dateLabel(d.movement_date)}</TableCell>
                <TableCell>{d.category}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.description}</TableCell>
                <TableCell className="text-xs">{d.source === "manual" ? "Manual" : "Automático"}</TableCell>
                <TableCell className={"text-right font-semibold " + (d.kind === "income" ? "text-success" : "text-destructive")}>{d.kind === "income" ? "+" : "−"}{money(d.amount, d.currency)}</TableCell>
                <TableCell>{d.source === "manual" && <Button variant="ghost" size="icon" onClick={() => confirm("¿Borrar?") && del.mutate(d.id)}><Trash2 className="h-4 w-4" /></Button>}</TableCell>
              </TableRow>
            ))}
            {data.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sin movimientos este mes.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!m} onOpenChange={(o) => !o && setM(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo movimiento</DialogTitle></DialogHeader>
          {m && (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(m); }}>
              <Field label="Tipo">
                <select className={selectClass} value={m.kind} onChange={(e) => { const k = e.target.value as Mov["kind"]; setM({ ...m, kind: k, category: (k === "income" ? INCOME_CATS : EXPENSE_CATS)[0] }); }}>
                  <option value="expense">Gasto</option><option value="income">Ingreso extra</option>
                </select>
              </Field>
              <Field label="Categoría">
                <select className={selectClass} value={m.category} onChange={(e) => setM({ ...m, category: e.target.value })}>
                  {(m.kind === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Monto"><Input type="number" step="0.01" required value={m.amount} onChange={(e) => setM({ ...m, amount: e.target.value })} /></Field>
              <Field label="Moneda">
                <select className={selectClass} value={m.currency} onChange={(e) => setM({ ...m, currency: e.target.value as "ARS" | "USD" })}><option>ARS</option><option>USD</option></select>
              </Field>
              <Field label="Fecha"><Input type="date" required value={m.movement_date} onChange={(e) => setM({ ...m, movement_date: e.target.value })} /></Field>
              <Field label="Detalle"><Input value={m.description} onChange={(e) => setM({ ...m, description: e.target.value })} /></Field>
              <Button className="sm:col-span-2" disabled={save.isPending}>Guardar</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
