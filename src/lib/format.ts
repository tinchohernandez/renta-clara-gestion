export function money(amount: number | string | null | undefined, currency: string = "ARS") {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
}

export function monthStart(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function monthLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export function dateLabel(d: string | null | undefined) {
  if (!d) return "-";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export const INDEX_LABELS: Record<string, string> = {
  IPC: "IPC",
  IPC_NEUQUEN: "IPC Neuquén",
  ICL: "ICL",
  ACUERDO: "Acuerdo de partes",
};

export const RECEIPT_STATUS: Record<string, string> = {
  pending: "Pendiente",
  submitted: "Comprobante enviado",
  paid: "Pagado",
};

export function commission(type: string, value: number, rent: number) {
  return type === "percent" ? Math.round(rent * value) / 100 : value;
}

export function propertyLabel(p: { address: string; street_number?: string | null; floor_unit?: string | null } | null | undefined) {
  if (!p) return "-";
  return [p.address, p.street_number, p.floor_unit].filter(Boolean).join(" ");
}
