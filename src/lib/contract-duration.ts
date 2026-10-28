import { addMonths, format, isValid, parseISO, subDays } from "date-fns";

// The end date is inclusive: a contract starting on the first ends on the
// last day before the next term. addMonths clamps month-end dates safely.
export function contractEndDate(startDate: string | undefined, months: number | string | undefined): string {
  const duration = Number(months);
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(duration) || duration < 1) return "";
  const start = parseISO(startDate);
  if (!isValid(start)) return "";
  const end = subDays(addMonths(start, duration), 1);
  return isValid(end) ? format(end, "yyyy-MM-dd") : "";
}