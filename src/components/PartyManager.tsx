import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminSetPassword } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, Field, PageTitle } from "./AppShell";

type Kind = "owners" | "tenants";
type Party = Record<string, string | null> & { id: string; full_name: string; user_id: string | null };

const FIELDS: Record<Kind, { key: string; label: string; type?: string; required?: boolean }[]> = {
  owners: [
    { key: "full_name", label: "Nombre y apellido", required: true },
    { key: "dni", label: "DNI" },
    { key: "cuit", label: "CUIT / CUIL" },
    { key: "address", label: "Dirección" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Teléfono" },
    { key: "cbu", label: "CBU" },
  ],
  tenants: [
    { key: "full_name", label: "Nombre y apellido", required: true },
    { key: "dni", label: "DNI" },
    { key: "cuit", label: "CUIT / CUIL" },
    { key: "address", label: "Dirección" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Teléfono" },
  ],
};

export function PartyManager({ kind, title, singular }: { kind: Kind; title: string; singular: string }) {
  const qc = useQueryClient();
  const setPass = useServerFn(adminSetPassword);
  const [editing, setEditing] = useState<Partial<Party> | null>(null);
  const [pwFor, setPwFor] = useState<Party | null>(null);
  const [pw, setPw] = useState("");
  const fields = FIELDS[kind];

  const { data = [] } = useQuery({
    queryKey: [kind],
    queryFn: async () => {
      const { data, error } = await supabase.from(kind).select("*").order("full_name");
      if (error) throw error;
      return data as unknown as Party[];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<Party>) => {
      const row: Record<string, string | null> = {};
      fields.forEach((f) => (row[f.key] = (p[f.key] as string)?.trim() || null));
      const q = p.id ? supabase.from(kind).update(row as never).eq("id", p.id) : supabase.from(kind).insert(row as never);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Guardado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: [kind] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(kind).delete().eq("id", id);
      if (error) throw new Error(error.code === "23503" ? `No se puede borrar: tiene ${kind === "owners" ? "propiedades" : "contratos"} asociados` : error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageTitle action={<Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> Nuevo {singular}</Button>}>{title}</PageTitle>
      {data.length === 0 ? (
        <Empty>Todavía no cargaste {title.toLowerCase()}.</Empty>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI / CUIT</TableHead>
                <TableHead>Contacto</TableHead>
                {kind === "owners" && <TableHead>CBU</TableHead>}
                <TableHead>Cuenta</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell className="text-sm">{[p.dni, p.cuit].filter(Boolean).join(" · ") || "-"}</TableCell>
                  <TableCell className="text-sm">{p.email}<div className="text-muted-foreground">{p.phone}</div></TableCell>
                  {kind === "owners" && <TableCell className="text-sm">{p.cbu || "-"}</TableCell>}
                  <TableCell>
                    {p.user_id ? <span className="text-sm text-success">Registrado</span> : <span className="text-sm text-muted-foreground">Sin registrarse</span>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {p.user_id && (
                      <Button variant="ghost" size="icon" title="Cambiar contraseña" onClick={() => { setPwFor(p); setPw(""); }}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => confirm("¿Borrar?") && remove.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nuevo"} {singular}</DialogTitle></DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); if (editing) save.mutate(editing); }}
          >
            {fields.map((f) => (
              <Field key={f.key} label={f.label} className={f.key === "full_name" || f.key === "address" ? "sm:col-span-2" : ""}>
                <Input
                  type={f.type ?? "text"}
                  required={f.required}
                  value={(editing?.[f.key] as string) ?? ""}
                  onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                />
              </Field>
            ))}
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Con este email la persona se registra sola y su cuenta queda vinculada automáticamente.
            </p>
            <Button className="sm:col-span-2" disabled={save.isPending}>Guardar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwFor} onOpenChange={(o) => !o && setPwFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva contraseña para {pwFor?.full_name}</DialogTitle></DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await setPass({ data: { userId: pwFor!.user_id!, password: pw } });
                toast.success("Contraseña actualizada. Comunicásela a la persona.");
                setPwFor(null);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <Field label="Contraseña (mínimo 8 caracteres)">
              <Input value={pw} minLength={8} required onChange={(e) => setPw(e.target.value)} />
            </Field>
            <Button className="w-full">Guardar contraseña</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
