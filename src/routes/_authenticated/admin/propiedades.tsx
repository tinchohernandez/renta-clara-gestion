import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, Field, PageTitle, selectClass } from "@/components/AppShell";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/propiedades")({ component: Propiedades });

const TYPES = ["Departamento", "Casa", "Local", "Oficina", "Cochera", "Galpón", "Terreno", "Otro"];
type Form = {
  id?: string; owner_id?: string; address?: string; street_number?: string | null; floor_unit?: string | null;
  city?: string | null; cadastral_code?: string | null; property_value?: number | string | null;
  value_currency?: "ARS" | "USD"; property_type?: string; description?: string | null;
};

function Propiedades() {
  const qc = useQueryClient();
  const [f, setF] = useState<Form | null>(null);
  const owners = useQuery({
    queryKey: ["owners-min"],
    queryFn: async () => (await supabase.from("owners").select("id, full_name").order("full_name")).data ?? [],
  });
  const { data = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*, owners(full_name)").order("address");
      if (error) throw error;
      return data;
    },
  });
  const save = useMutation({
    mutationFn: async (v: Form) => {
      if (!v.owner_id) throw new Error("Elegí un propietario");
      const row = {
        owner_id: v.owner_id, address: v.address!.trim(), street_number: v.street_number || null, floor_unit: v.floor_unit || null,
        city: v.city || null, cadastral_code: v.cadastral_code || null,
        property_value: v.property_value ? Number(v.property_value) : null, value_currency: v.value_currency ?? "USD",
        property_type: v.property_type ?? "Departamento", description: v.description || null,
      };
      const { error } = v.id ? await supabase.from("properties").update(row).eq("id", v.id) : await supabase.from("properties").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Guardado"); setF(null); qc.invalidateQueries({ queryKey: ["properties"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw new Error(error.code === "23503" ? "Tiene contratos asociados" : error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const noOwners = (owners.data ?? []).length === 0;

  return (
    <div>
      <PageTitle action={<Button disabled={noOwners} onClick={() => setF({ value_currency: "USD", property_type: "Departamento" })}><Plus className="mr-1 h-4 w-4" /> Nueva propiedad</Button>}>Propiedades</PageTitle>
      {noOwners && (
        <div className="mb-4 rounded-lg border border-border bg-secondary p-4 text-sm">
          Para cargar una propiedad primero tenés que cargar su propietario. <Link to="/admin/propietarios" className="font-semibold text-primary underline">Ir a Propietarios</Link>
        </div>
      )}
      {data.length === 0 ? <Empty>Sin propiedades cargadas.</Empty> : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Dirección</TableHead><TableHead>Tipo</TableHead><TableHead>Nomenclatura</TableHead><TableHead>Valor</TableHead><TableHead>Propietario</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{[p.address, p.street_number, p.floor_unit].filter(Boolean).join(" ")}<div className="text-xs text-muted-foreground">{p.city}</div></TableCell>
                  <TableCell>{p.property_type}</TableCell>
                  <TableCell className="text-sm">{p.cadastral_code || "-"}</TableCell>
                  <TableCell className="text-sm">{p.property_value ? money(p.property_value, p.value_currency) : "-"}</TableCell>
                  <TableCell>{p.owners?.full_name}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => setF(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => confirm("¿Borrar?") && remove.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={!!f} onOpenChange={(o) => !o && setF(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{f?.id ? "Editar" : "Nueva"} propiedad</DialogTitle></DialogHeader>
          {f && (
            <form className="grid gap-3 sm:grid-cols-6" onSubmit={(e) => { e.preventDefault(); save.mutate(f); }}>
              <Field label="Propietario *" className="sm:col-span-6">
                <select className={selectClass} required value={f.owner_id ?? ""} onChange={(e) => setF({ ...f, owner_id: e.target.value })}>
                  <option value="">Elegir…</option>
                  {(owners.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                </select>
              </Field>
              <Field label="Calle *" className="sm:col-span-3"><Input required value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
              <Field label="Altura" className="sm:col-span-1"><Input value={f.street_number ?? ""} onChange={(e) => setF({ ...f, street_number: e.target.value })} /></Field>
              <Field label="Piso / UF" className="sm:col-span-2"><Input value={f.floor_unit ?? ""} onChange={(e) => setF({ ...f, floor_unit: e.target.value })} /></Field>
              <Field label="Localidad" className="sm:col-span-3"><Input value={f.city ?? ""} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
              <Field label="Tipo de propiedad" className="sm:col-span-3">
                <select className={selectClass} value={f.property_type} onChange={(e) => setF({ ...f, property_type: e.target.value })}>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Nomenclatura catastral" className="sm:col-span-6"><Input value={f.cadastral_code ?? ""} onChange={(e) => setF({ ...f, cadastral_code: e.target.value })} /></Field>
              <Field label="Valor" className="sm:col-span-4"><Input type="number" step="0.01" value={f.property_value ?? ""} onChange={(e) => setF({ ...f, property_value: e.target.value })} /></Field>
              <Field label="Moneda" className="sm:col-span-2">
                <select className={selectClass} value={f.value_currency} onChange={(e) => setF({ ...f, value_currency: e.target.value as "ARS" | "USD" })}>
                  <option value="USD">USD</option><option value="ARS">ARS</option>
                </select>
              </Field>
              <Field label="Observaciones" className="sm:col-span-6"><Textarea value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
              <Button className="sm:col-span-6" disabled={save.isPending}>Guardar</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
