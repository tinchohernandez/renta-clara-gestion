import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askClaudeJson, toBase64 } from "./claude.server";

type ProofAI = { amount: number | null; date: string | null; method: string | null; currency: string | null; notes: string | null };

export const analyzeProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { proofId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: proof, error } = await context.supabase
      .from("payment_proofs")
      .select("id, file_path, file_type")
      .eq("id", data.proofId)
      .single();
    if (error || !proof) throw new Error("Comprobante no encontrado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      const { data: blob, error: dlErr } = await context.supabase.storage.from("documents").download(proof.file_path);
      if (dlErr || !blob) throw new Error("No se pudo leer el archivo");
      const mediaType = proof.file_type || blob.type || "image/jpeg";
      const b64 = toBase64(await blob.arrayBuffer());
      const part =
        mediaType === "application/pdf"
          ? { type: "file" as const, data: b64, mediaType }
          : { type: "image" as const, image: b64, mediaType };
      const ai = await askClaudeJson<ProofAI>(
        "Sos un asistente de una inmobiliaria argentina. Leés comprobantes de pago (transferencias, depósitos, Mercado Pago, etc.) y extraés datos. Respondé SOLO un JSON.",
        [
          {
            role: "user",
            content: [
              part,
              {
                type: "text",
                text: 'Extraé del comprobante: {"amount": número sin separadores de miles (punto decimal) o null, "date": "YYYY-MM-DD" o null, "method": "Transferencia" | "Depósito" | "Efectivo" | "Mercado Pago" | "Tarjeta" | "Otro" o null, "currency": "ARS" | "USD" o null, "notes": breve detalle (banco, CBU/alias destino, número de operación) o null}',
              },
            ],
          },
        ],
      );
      await supabaseAdmin
        .from("payment_proofs")
        .update({
          ai_amount: typeof ai.amount === "number" ? ai.amount : null,
          ai_date: ai.date && /^\d{4}-\d{2}-\d{2}$/.test(ai.date) ? ai.date : null,
          ai_method: ai.method,
          ai_currency: ai.currency,
          ai_notes: ai.notes,
          ai_status: "done",
        })
        .eq("id", proof.id);
      return { ok: true, ai };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de IA";
      await supabaseAdmin.from("payment_proofs").update({ ai_status: "error", ai_notes: msg }).eq("id", proof.id);
      return { ok: false, error: msg };
    }
  });

type ClaimAI = { summary: string; priority: "Alta" | "Media" | "Baja"; reply: string };

export const analyzeClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { claimId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: claim, error } = await context.supabase
      .from("claims")
      .select("id, title, description, contracts(properties(address, street_number, floor_unit), tenants(full_name))")
      .eq("id", data.claimId)
      .single();
    if (error || !claim) throw new Error("Reclamo no encontrado");
    const c = claim as unknown as {
      id: string; title: string; description: string;
      contracts: { properties: { address: string; street_number: string | null; floor_unit: string | null } | null; tenants: { full_name: string } | null } | null;
    };
    const prop = c.contracts?.properties;
    try {
      const ai = await askClaudeJson<ClaimAI>(
        "Sos el asistente de administración de una inmobiliaria argentina. Analizás reclamos de inquilinos sobre el inmueble. Prioridad Alta: riesgo de seguridad, pérdidas de agua/gas, sin servicios esenciales. Media: afecta el uso pero no es urgente. Baja: estético o menor. Respondé SOLO un JSON.",
        [
          {
            role: "user",
            content: `Inquilino: ${c.contracts?.tenants?.full_name ?? "-"}\nInmueble: ${prop ? `${prop.address} ${prop.street_number ?? ""} ${prop.floor_unit ?? ""}` : "-"}\nTítulo: ${c.title}\nDescripción: ${c.description}\n\nDevolvé {"summary": resumen en 1-2 oraciones, "priority": "Alta"|"Media"|"Baja", "reply": borrador de respuesta cordial de la inmobiliaria al inquilino, en español rioplatense, indicando próximos pasos}`,
          },
        ],
      );
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("claims")
        .update({ ai_summary: ai.summary, ai_priority: ai.priority, ai_draft_reply: ai.reply })
        .eq("id", c.id);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Error de IA" };
    }
  });

export const adminSetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) => {
    if (!input.password || input.password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("No autorizado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
