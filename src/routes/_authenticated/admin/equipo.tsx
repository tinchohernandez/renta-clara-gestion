import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, Field, PageTitle } from "@/components/AppShell";
import { useMe } from "@/lib/session";
import { dateLabel } from "@/lib/format";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/equipo")({
  head: () => pageHead("Equipo", "Personas que pueden administrar la inmobiliaria."),
  component: Equipo,
});

function Equipo() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const myEmail = me?.user?.email?.toLowerCase();
  const [email, setEmail] = useState("");

  const admins = useQuery({
    queryKey: ["admins"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_admins");
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase.rpc("add_admin", { _email: value });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listo. Cuando esa persona se registre con ese email, va a tener acceso.");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase.rpc("remove_admin", { _email: value });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Se quitó el acceso de administrador");
      qc.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageTitle>Equipo</PageTitle>
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Las personas de esta lista pueden ver y manejar todo en el panel de la inmobiliaria. Para sumar a alguien,
        escribí su email: tiene que registrarse en la app con ese mismo email y confirmarlo desde el mail que le llega.
      </p>

      <form
        className="mb-8 flex max-w-xl flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate(email);
        }}
      >
        <Field label="Email de la persona" className="min-w-64 flex-1">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button disabled={add.isPending}>Habilitar como administrador</Button>
      </form>

      {(admins.data ?? []).length === 0 ? (
        <Empty>Todavía no hay administradores cargados.</Empty>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Habilitado el</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(admins.data ?? []).map((a) => {
                const isMe = a.admin_email === myEmail;
                return (
                  <TableRow key={a.admin_email}>
                    <TableCell className="font-medium">
                      {a.admin_email}
                      {isMe && <span className="ml-2 text-xs text-muted-foreground">(vos)</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.is_active ? (
                        <span className="text-success">Activo</span>
                      ) : (
                        <span className="text-muted-foreground">Pendiente: todavía no se registró o no confirmó su email</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{dateLabel(a.added_at)}</TableCell>
                    <TableCell className="text-right">
                      {!isMe && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Quitar acceso"
                          onClick={() => confirm(`¿Quitar el acceso de administrador a ${a.admin_email}?`) && remove.mutate(a.admin_email)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
