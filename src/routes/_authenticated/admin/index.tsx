import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, PageTitle, StatusBadge } from "@/components/AppShell";
import { dateLabel, monthLabel, monthStart, money, propertyLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Resumen });

function Resumen() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(monthStart().slice(0, 7));
  const period = `${month}-01`;
  const { data = [] } = useQuery({
    queryKey: ["receipts", period],
    queryFn: async () => (await supabase.from("receipts").select("*, contracts(properties(address, street_number, floor_unit), tenants(full_name))").eq("period", period).order("due_date")).data ?? [],
  });
  const gen = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_receipts", { _period: period });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => { toast.success(`${n} recibo(s) generados`); qc.invalidateQueries({ queryKey: ["receipts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div>
      <PageTitle action={<div className="flex gap-2"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /><Button onClick={() => gen.mutate()} disabled={gen.isPending}>Generar recibos del mes</Button></div>}>
        Recibos de <span className="capitalize">{monthLabel(period)}</span>
      </PageTitle>
      {data.length === 0 ? <Empty>No hay recibos para este mes. Generalos con el botón.</Empty> : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Propiedad</TableHead><TableHead>Inquilino</TableHead><TableHead>Vence</TableHead><TableHead>Alquiler</TableHead><TableHead>Administración</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{propertyLabel(r.contracts?.properties)}</TableCell>
                  <TableCell>{r.contracts?.tenants?.full_name}</TableCell>
                  <TableCell>{dateLabel(r.due_date)}</TableCell>
                  <TableCell>{money(Number(r.rent_amount) + Number(r.extra_amount), r.currency)}</TableCell>
                  <TableCell>{money(r.commission_amount, r.currency)}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
