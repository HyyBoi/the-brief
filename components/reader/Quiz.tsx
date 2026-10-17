"use client";
// Three Things: index cards that flip once you answer. The problem statement's own test.
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { QuizItem, Story } from "@/lib/types";
import { useSignal } from "./signals";

export function Quiz({ quiz, stories }: { quiz: QuizItem[]; stories: Story[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const right = Object.entries(picked).filter(([i, p]) => quiz[+i].answer === p).length;
  const done = Object.keys(picked).length === quiz.length;

  if (!quiz.length) return null;
  return (
    <section aria-label="Three Things">
      <div className="flex items-baseline justify-between">
        <h3 className="t-major">Three things you now know</h3>
        {done && <span className="font-sans text-lg font-extrabold text-pencil">{right} of {quiz.length}</span>}
      </div>
      <p className="t-meta mt-1">Answer from memory. Your answers sharpen tomorrow&apos;s paper.</p>
      <div className="mt-5 space-y-4">
        {quiz.map((q, i) => (
          <QuizCard
            key={i}
            n={i + 1}
            q={q}
            story={stories.find((s) => s.id === q.ref)}
            picked={picked[i]}
            onPick={(p) => setPicked((x) => ({ ...x, [i]: p }))}
          />
        ))}
      </div>
    </section>
  );
}

function QuizCard({ n, q, story, picked, onPick }: { n: number; q: QuizItem; story?: Story; picked?: number; onPick: (p: number) => void }) {
  const send = useSignal();
  const reduce = useReducedMotion();
  const answered = picked !== undefined;
  const correct = picked === q.answer;

  const choose = (p: number) => {
    if (answered) return;
    onPick(p);
    send({ kind: p === q.answer ? "quiz_right" : "quiz_wrong", article_id: q.ref });
  };

  return (
    <div style={{ perspective: 1400 }}>
      <motion.div className="preserve grid" animate={{ rotateX: answered ? 180 : 0 }} transition={{ duration: reduce ? 0 : 0.55, ease: [0.3, 0.1, 0.2, 1] }}>
        <div className="face col-start-1 row-start-1 border-2 border-ink bg-sheet p-4" aria-hidden={answered}>
          <p className="t-std">
            <span className="mr-2 font-sans text-sm font-extrabold">{n}.</span>
            {q.q}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {q.options.map((o, k) => (
              <button key={k} onClick={() => choose(k)} tabIndex={answered ? -1 : 0} className="border border-hair px-3 py-2 text-left text-[0.95rem] hover:border-ink">
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className="face col-start-1 row-start-1 flex flex-col justify-center border-2 border-pencil bg-sheet p-4" style={{ transform: "rotateX(180deg)" }} aria-hidden={!answered}>
          <p className="font-sans text-sm font-extrabold text-pencil">{correct ? "Right." : "Not quite."}</p>
          <p className="t-std mt-1">{q.options[q.answer]}</p>
          {story && (
            <a href={story.url} target="_blank" rel="noreferrer" className="t-meta link-under mt-2 self-start" tabIndex={answered ? 0 : -1}>
              From: {story.title}
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}
