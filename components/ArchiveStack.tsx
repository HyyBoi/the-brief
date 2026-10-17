"use client";
// Past papers lie on the desk at slight angles. Hover lifts one; click opens it.
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

type P = { date: string; number: number; lead: string; section: string; count: number };

export function ArchiveStack({ papers }: { papers: P[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="stage mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {papers.map((p, i) => {
        const tilt = ((i * 37) % 7) - 3; // deterministic scatter, −3°..3°
        const d = new Date(p.date + "T06:00:00");
        return (
          <li key={p.date}>
            <motion.div
              className="preserve"
              initial={reduce ? false : { rotateX: 60, opacity: 0, y: 40 }}
              animate={{ rotateX: 0, opacity: 1, y: 0, rotateZ: tilt }}
              transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={reduce ? undefined : { y: -14, rotateZ: 0, rotateX: 8, scale: 1.03 }}
            >
              <Link href={`/paper/${p.date}`} className="sheet block aspect-[3/4] p-4 outline-offset-4">
                <p className="t-mast text-center text-[1.6rem]">The Brief.</p>
                <div className="rule mt-1 flex justify-between py-0.5 text-[0.68rem] italic">
                  <span>No. {p.number}</span>
                  <span>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d)}</span>
                </div>
                <div className="rule-double" />
                <p className="t-kicker mt-3">{p.section}</p>
                <p className="mt-1 text-[1.15rem] font-bold leading-tight line-clamp-5">{p.lead}</p>
                <div className="mt-3 space-y-1.5" aria-hidden>
                  {[92, 100, 84, 97, 60].map((w, k) => (
                    <div key={k} className="h-[5px] bg-black/10" style={{ width: `${w}%` }} />
                  ))}
                </div>
                <p className="mt-3 text-[0.75rem] italic text-ink-soft">
                  {new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(d)}, {p.count} stories
                </p>
              </Link>
            </motion.div>
          </li>
        );
      })}
    </ul>
  );
}
