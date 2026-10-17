"use client";
// A story is a two-sided sheet. Front: the news. Back: why it's here, and the blue pencil.
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Story } from "@/lib/types";
import { useDwell, useSignal } from "./signals";

const HEAD: Record<Story["size"], string> = { lead: "t-lead", major: "t-major", standard: "t-std", brief: "t-brief" };

function ago(iso: string) {
  const h = Math.round((Date.now() - Date.parse(iso)) / 3600_000);
  if (h < 1) return "within the hour";
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function StoryCard({ story, onKill }: { story: Story; onKill: (id: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  const send = useSignal();
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const [kept, setKept] = useState(false);
  const [striking, setStriking] = useState(false);
  useDwell(ref, story.id);

  const flip = () => {
    if (!flipped) send({ kind: "open", article_id: story.id });
    setFlipped((f) => !f);
  };
  const keep = () => {
    setKept(true);
    setFlipped(false);
    send({ kind: "keep", article_id: story.id });
  };
  const kill = () => {
    setFlipped(false);
    setStriking(true);
    send({ kind: "kill", article_id: story.id });
    setTimeout(() => onKill(story.id), reduce ? 0 : 650);
  };

  const isLead = story.size === "lead";
  const isBrief = story.size === "brief";

  return (
    <article ref={ref} className="stage relative" style={{ perspective: 1600 }}>
      <motion.div
        className="preserve grid"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: [0.3, 0.1, 0.2, 1] }}
      >
        {/* FRONT */}
        <div className="face col-start-1 row-start-1 bg-sheet" aria-hidden={flipped}>
          <p className="t-kicker mb-2">
            {story.explore ? <span className="italic font-serif text-[0.85rem] font-normal">Off your beat: </span> : null}
            {story.section}
          </p>
          <h3 className={`${HEAD[story.size]} relative`}>
            <a href={story.url} target="_blank" rel="noreferrer" onClick={() => send({ kind: "click", article_id: story.id })} className="hover:text-pencil">
              {story.title}
            </a>
            {striking && (
              <motion.span className="strike" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.35, ease: "easeOut" }} />
            )}
          </h3>
          {!isBrief && <p className={`t-body mt-3 ${isLead ? "md:columns-2 md:gap-8 text-[1.08rem]" : ""}`}>{story.summary}</p>}
          {isBrief && <p className="mt-1 text-[0.95rem] leading-snug text-ink-soft line-clamp-2">{story.summary}</p>}
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="t-meta">
              {story.source}, {ago(story.published_at)}
            </span>
            <button onClick={flip} className="t-ui link-under" aria-label={`Why this story: ${story.title}`}>
              Why this story?
            </button>
          </div>
          {kept && (
            <motion.span
              aria-label="Kept"
              className="pointer-events-none absolute right-0 top-0 border-2 border-pencil px-2 py-0.5 font-sans text-sm font-extrabold text-pencil"
              initial={{ scale: 2.4, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: -7, opacity: 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 22 }}
            >
              Kept
            </motion.span>
          )}
        </div>

        {/* BACK */}
        <div
          className="face col-start-1 row-start-1 flex flex-col justify-between border-2 border-ink bg-sheet p-4"
          style={{ transform: "rotateY(180deg)" }}
          aria-hidden={!flipped}
        >
          <div>
            <p className="t-kicker">Why it&apos;s in your paper</p>
            <p className="mt-2 text-[1.05rem] leading-snug">{story.reason}</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn btn-solid" onClick={keep} tabIndex={flipped ? 0 : -1}>
              Keep, more like this
            </button>
            <button className="btn btn-pencil" onClick={kill} tabIndex={flipped ? 0 : -1}>
              Kill
            </button>
            <button className="t-ui link-under ml-auto" onClick={flip} tabIndex={flipped ? 0 : -1}>
              Turn back
            </button>
          </div>
        </div>
      </motion.div>
    </article>
  );
}
