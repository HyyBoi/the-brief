// Small, dependency-free vector maths. Everything is L2-normalised so dot = cosine.
export const DIM = 768;

export function normalize(v: number[]): number[] {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map((x) => x / n);
}

/** Matryoshka-style: keep the first DIM dims, then renormalise. */
export function fit(v: number[]): number[] {
  return normalize(v.length > DIM ? v.slice(0, DIM) : v);
}

export function dot(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

/** a + w·b, renormalised. Negative w pushes away. */
export function nudge(a: number[] | null, b: number[], w: number): number[] {
  if (!a) return normalize(b.map((x) => x * Math.sign(w || 1)));
  return normalize(a.map((x, i) => x + w * (b[i] ?? 0)));
}

export function mean(vs: number[][]): number[] | null {
  if (!vs.length) return null;
  const out = new Array(vs[0].length).fill(0);
  for (const v of vs) for (let i = 0; i < out.length; i++) out[i] += v[i];
  return normalize(out);
}

/** pgvector comes back from PostgREST as a string "[0.1,0.2,...]". */
export function parseVec(v: unknown): number[] | null {
  if (!v) return null;
  if (Array.isArray(v)) return v as number[];
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as number[];
    } catch {
      return null;
    }
  }
  return null;
}

export function toPg(v: number[] | null): string | null {
  return v ? `[${v.map((x) => x.toFixed(6)).join(",")}]` : null;
}
