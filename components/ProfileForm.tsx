"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileForm({ summary, budget, name }: { summary: string; budget: number; name: string }) {
  const router = useRouter();
  const [text, setText] = useState(summary);
  const [mins, setMins] = useState(budget);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function save(reprint: boolean) {
    setState("saving");
    await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taste_summary: text, time_budget: mins, display_name: name }),
    });
    if (reprint) {
      await fetch("/api/edition", { method: "POST" });
      router.push("/paper");
      router.refresh();
      return;
    }
    setState("saved");
    router.refresh();
  }

  return (
    <div className="mt-4">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setState("idle");
        }}
        rows={5}
        className="w-full resize-none border-2 border-ink bg-transparent p-3 text-[1.15rem] italic leading-relaxed outline-none focus:border-pencil"
      />
      <div className="mt-4 flex flex-wrap items-center gap-2 t-ui">
        <span className="mr-1">Morning time:</span>
        {[5, 10, 20].map((m) => (
          <button key={m} onClick={() => setMins(m)} aria-pressed={mins === m} className={`border-2 px-3 py-1 ${mins === m ? "border-ink bg-ink text-sheet" : "border-hair hover:border-ink"}`}>
            {m} min
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button className="btn btn-solid" disabled={state === "saving"} onClick={() => save(true)}>
          Save and reprint today&apos;s paper
        </button>
        <button className="btn" disabled={state === "saving"} onClick={() => save(false)}>
          Save for tomorrow
        </button>
        <span className="t-meta" role="status">
          {state === "saving" ? "Saving" : state === "saved" ? "Saved. Tomorrow's paper will follow it." : ""}
        </span>
      </div>
    </div>
  );
}
