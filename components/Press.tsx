"use client";
// While the paper is being made: the press runs, one line of type at a time.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

const LINES = [
  "Reading last night's wires from Karachi to California",
  "Matching every story against what you told us",
  "Sampling a few desks you never read",
  "Throwing out the duplicates",
  "Choosing the lead",
  "Arguing it both ways for the Opposition Bench",
  "Writing three questions for the back page",
  "Setting type",
];

export function Press({ name }: { name: string }) {
  const router = useRouter();
  const [n, setN] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setN((x) => Math.min(x + 1, LINES.length)), 2200);
    fetch("/api/edition", { method: "POST" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "The press jammed");
        router.refresh();
      })
      .catch((e) => setError(e.message));
    return () => clearInterval(t);
  }, [router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[760px] flex-col justify-center px-6 text-sheet">
      <p className="t-mast text-[clamp(3rem,10vw,6rem)]">The Brief.</p>
      <p className="mt-2 italic text-white/60">Printing {name}&apos;s paper.</p>
      <div className="mt-8 h-[3px] w-full bg-white/10">
        <motion.div className="h-full bg-sheet" initial={{ width: "0%" }} animate={{ width: error ? "100%" : `${(n / LINES.length) * 92}%` }} transition={{ duration: 1.8, ease: "easeOut" }} />
      </div>
      <ul className="mt-6 space-y-1.5 font-sans text-sm">
        {LINES.slice(0, n).map((l, i) => (
          <motion.li key={l} initial={{ opacity: 0, x: -8 }} animate={{ opacity: i === n - 1 ? 1 : 0.4, x: 0 }}>
            {l}
          </motion.li>
        ))}
      </ul>
      {error && (
        <div className="mt-8 border border-white/40 p-4 text-sm">
          <p className="font-sans font-bold">The press stopped.</p>
          <p className="mt-1 text-white/70">{error}</p>
          <button className="btn mt-3" onClick={() => location.reload()}>
            Run the press again
          </button>
        </div>
      )}
    </main>
  );
}
