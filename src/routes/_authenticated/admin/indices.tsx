import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field, PageTitle, selectClass } from "@/components/AppShell";
import { INDEX_LABELS, dateLabel, monthLabel, monthStart, money, propertyLabel } from "@/lib/format";

import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/indices")({ component: Indices, head: () => pageHead("Índices de actualización", "Gestión de índices y ajustes de los contratos de alquiler.") });

type Idx = "IPC" | "IPC_NEUQUEN" | "ICL";

function Indices() {
  const qc = useQueryClient();
  const [idx, setIdx] = useState<Idx>("IPC");
  const [month, setMonth] = useState(monthStart().slice(0, 7));
  const [pct, setPct] = useState("");
  const period = `${month}-01`;
  const end = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).toISOString().slice(0, 10);

  const due = useQuery({
    queryKey: ["due-adjust", idx, month],
    queryFn: async () =>
      (await supabase.from("contracts").select("id, current_rent, currency, next_adjustment_date, properties(address, street_number, floor_unit), tenants(full_name)")
        .eq("status", "active").eq("adjustment_index", idx).gte("next_adjustment_date", period).lte("next_adjustment_date", end)).data ?? [],
  });
  const history = useQuery({ queryKey: ["index-values"], queryFn: async () => (await supabase.from("index_values").select("*").order("period", { ascending: false }).limit(50)).data ?? [] });

  const apply = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("apply_index", { _index: idx, _period: period, _pct: Number(pct) });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      toast.success(`Índice cargado. Se actualizaron ${n} contrato(s).`);
      setPct("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageTitle>Índices de actualización</PageTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">Cargar índice del mes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ingresá el porcentaje acumulado del período. Se aplica automáticamente a todos los contratos con ese índice que actualizan en ese mes.</p>
          <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); apply.mutate(); }}>
            <Field label="Índice">
              <select className={selectClass} value={idx} onChange={(e) => setIdx(e.target.value as Idx)}>
                <option value="IPC">IPC</option><option value="IPC_NEUQUEN">IPC Neuquén</option><option value="ICL">ICL</option>
              </select>
            </Field>
            <Field label="Mes"><Input type="month" required value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
            <Field label="% aumento"><Input type="number" step="0.0001" required value={pct} onChange={(e) => setPct(e.target.value)} /></Field>
            <Button className="sm:col-span-3" disabled={apply.isPending}>Cargar y aplicar a {due.data?.length ?? 0} contrato(s)</Button>
          </form>
          <h3 className="mt-6 text-sm font-semibold">Contratos que actualizan con {INDEX_LABELS[idx]} en {monthLabel(period)}</h3>
          <ul className="mt-2 divide-y divide-border text-sm">
            {(due.data ?? []).map((c) => (
              <li key={c.id} className="flex justify-between py-2">
                <span>{propertyLabel(c.properties)} · {c.tenants?.full_name}</span>
                <span>{money(c.current_rent, c.currency)}{pct && <> → <b>{money(Number(c.current_rent) * (1 + Number(pct) / 100), c.currency)}</b></>}</span>
              </li>
            ))}
            {(due.data ?? []).length === 0 && <li className="py-2 text-muted-foreground">Ninguno.</li>}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Los contratos por “Acuerdo de partes” se actualizan desde Contratos con el botón de aumento.</p>
        </div>
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Índice</TableHead><TableHead>Mes</TableHead><TableHead>%</TableHead><TableHead>Contratos</TableHead><TableHead>Cargado</TableHead></TableRow></TableHeader>
            <TableBody>
              {(history.data ?? []).map((h) => (
                <TableRow key={h.id}><TableCell>{INDEX_LABELS[h.index_type]}</TableCell><TableCell className="capitalize">{monthLabel(h.period)}</TableCell><TableCell>{h.percentage}%</TableCell><TableCell>{h.applied_count}</TableCell><TableCell>{dateLabel(h.created_at)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
