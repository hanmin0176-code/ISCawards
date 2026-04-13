export type ParsedPlannerQuery = {
  rawQuery: string;
  insurerName: string | null;
  year: number | null;
  month: number | null;
  weekLabel: string | null;
};

export function normalizeYear(value: number | null) {
  if (value === null) return null;
  if (value < 100) return 2000 + value;
  return value;
}

export function parsePlannerSearchQuery(query: string, insurerNames: string[]) {
  const trimmed = query.trim();
  const yearMatch = trimmed.match(/(\d{2,4})\s*년?/);
  const monthMatch = trimmed.match(/(\d{1,2})\s*월/);
  const weekMatch = trimmed.match(/(\d{1,2})\s*주차/);

  const insurerName =
    insurerNames.find((name) => trimmed.includes(name)) ??
    insurerNames.find((name) => trimmed.replace(/\s+/g, "").includes(name.replace(/\s+/g, ""))) ??
    null;

  return {
    rawQuery: trimmed,
    insurerName,
    year: normalizeYear(yearMatch ? Number(yearMatch[1]) : null),
    month: monthMatch ? Number(monthMatch[1]) : null,
    weekLabel: weekMatch ? `${Number(weekMatch[1])}주차` : null,
  } satisfies ParsedPlannerQuery;
}
