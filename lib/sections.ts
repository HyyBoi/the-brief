// The fixed desks of the paper. The AI files every article under exactly one.
export const SECTIONS = [
  "Pakistan",
  "World",
  "Politics",
  "Business",
  "Markets",
  "Technology",
  "AI",
  "Science",
  "Health",
  "Climate",
  "Cricket",
  "Sport",
  "Culture",
  "Ideas",
] as const;

export type Section = (typeof SECTIONS)[number];

export function asSection(s: string | null | undefined): Section {
  if (!s) return "World";
  const hit = SECTIONS.find((x) => x.toLowerCase() === s.toLowerCase().trim());
  return hit ?? "World";
}
