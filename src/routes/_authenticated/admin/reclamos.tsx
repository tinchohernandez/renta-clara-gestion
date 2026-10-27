import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeClaim } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Empty, PageTitle, StatusBadge, selectClass } from "@/components/AppShell";
import { dateLabel, propertyLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/reclamos")({ component: Reclamos });

function Reclamos() {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeClaim);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const { data = [] } = useQuery({
    queryKey: ["claims"],
    queryFn: async () => (await supabase.from("claims").select("*, contracts(properties(address, street_number, floor_unit), tenants(full_name))").order("created_at", { ascending: false })).data ?? [],
  });
  const update = useMutation({
    mutationFn: async (v: { id: string; status?: string; admin_reply?: string }) => {
      const { id, ...rest } = v;
      const { error } = await supabase.from("claims").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Reclamo actualizado"); qc.invalidateQueries({ queryKey: ["claims"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const ai = useMutation({
    mutationFn: async (id: string) => { const r = await analyze({ data: { claimId: id } }); if (!r.ok) throw new Error(r.error); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["claims"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const order = { Alta: 0, Media: 1, Baja: 2 } as Record<string, number>;
  const sorted = [...data].sort((a, b) => (a.status === "resolved" ? 1 : 0) - (b.status === "resolved" ? 1 : 0) || (order[a.ai_priority ?? ""] ?? 3) - (order[b.ai_priority ?? ""] ?? 3));
  return (
    <div>
      <PageTitle>Reclamos</PageTitle>
      {sorted.length === 0 ? <Empty>Sin reclamos.</Empty> : (
        <div className="space-y-4">
          {sorted.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">{c.title}</div>
                  <div className="text-sm text-muted-foreground">{c.contracts?.tenants?.full_name} · {propertyLabel(c.contracts?.properties)} · {dateLabel(c.created_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {c.ai_priority && <StatusBadge status={c.ai_priority} />}
                  <select className={selectClass + " w-36"} value={c.status} onChange={(e) => update.mutate({ id: c.id, status: e.target.value })}>
                    <option value="open">Abierto</option><option value="in_progress">En curso</option><option value="resolved">Resuelto</option>
                  </select>
                </div>
              </div>
              <p className="mt-3 text-sm">{c.description}</p>
              <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm">
                <div className="mb-1 flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary" /> Análisis IA</span>
                  <Button size="sm" variant="ghost" disabled={ai.isPending} onClick={() => ai.mutate(c.id)}>{c.ai_summary ? "Regenerar" : "Analizar"}</Button>
                </div>
                {c.ai_summary ? <p>{c.ai_summary}</p> : <p className="text-muted-foreground">Sin análisis todavía.</p>}
              </div>
              <div className="mt-3 space-y-2">
                <Textarea
                  rows={4}
                  placeholder="Respuesta al inquilino"
                  value={replies[c.id] ?? c.admin_reply ?? c.ai_draft_reply ?? ""}
                  onChange={(e) => setReplies({ ...replies, [c.id]: e.target.value })}
                />
                <Button size="sm" onClick={() => update.mutate({ id: c.id, admin_reply: replies[c.id] ?? c.admin_reply ?? c.ai_draft_reply ?? "", status: c.status === "open" ? "in_progress" : c.status })}>
                  Enviar respuesta
                </Button>
                {c.admin_reply && <span className="ml-2 text-xs text-success">Respuesta enviada</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
