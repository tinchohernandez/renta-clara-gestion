import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, type ModelMessage } from "ai";

const RUN_HEADER = "X-Lovable-AIG-Run-ID";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_HEADER)) headers.set(RUN_HEADER, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_HEADER)?.trim() || undefined;
    return res;
  };
}

/**
 * Elige cómo hablar con Claude:
 * 1) ANTHROPIC_API_KEY: API de Anthropic directa (clave propia, no depende de Lovable).
 * 2) LOVABLE_API_KEY: respaldo, vía el gateway de Lovable (solo funciona con su suscripción).
 */
function makeModel() {
  const direct = process.env["ANTHROPIC_API_KEY"];
  if (direct) return createAnthropic({ apiKey: direct })("claude-sonnet-5-5");
  const gateway = process.env["LOVABLE_API_KEY"];
  if (!gateway) throw new Error("Falta configurar la clave de IA");
  return createAnthropic({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: gateway,
    headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch() as typeof fetch,
  })("anthropic/claude-sonnet-5");
}

/** Llama a Claude (en streaming) y devuelve el JSON de la respuesta ya parseado. */
export async function askClaudeJson<T>(system: string, messages: ModelMessage[]): Promise<T> {
  let streamError: unknown;
  const result = streamText({
    model: makeModel(),
    system,
    messages,
    maxOutputTokens: 4000,
    maxRetries: 0,
    onError: ({ error }) => {
      streamError = error;
    },
  });
  const text = await result.text;
  const finish = await result.finishReason;
  if (streamError) throw streamError instanceof Error ? streamError : new Error(String(streamError));
  if (!text) throw new Error(finish === "content-filter" ? "La IA rechazó procesar este contenido" : "La IA no devolvió respuesta");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Respuesta de IA inválida");
  return JSON.parse(match[0]) as T;
}

export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}
