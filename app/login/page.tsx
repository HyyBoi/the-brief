"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import { Masthead } from "@/components/Masthead";
import { Unfold } from "@/components/Unfold";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "back">("new");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const sb = browserClient();
    const res =
      mode === "new" ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (res.error) return setError(res.error.message);
    if (mode === "new" && !res.data.session) {
      return setError("Check your inbox to confirm, or turn off email confirmation in Supabase.");
    }
    router.push(mode === "new" ? "/start" : "/paper");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-[560px] px-4 py-10 md:py-20">
      <Unfold className="px-6 pb-10 pt-8 md:px-10">
        <Masthead size="md" />
        <div className="mt-6 flex gap-6 t-ui" role="tablist">
          {(["new", "back"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`pb-1 ${mode === m ? "border-b-2 border-ink" : "text-ink-soft"}`}
            >
              {m === "new" ? "New reader" : "I have a paper"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="t-ui">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border-b-2 border-ink bg-transparent py-2 text-lg outline-none focus:border-pencil"
            />
          </label>
          <label className="block">
            <span className="t-ui">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border-b-2 border-ink bg-transparent py-2 text-lg outline-none focus:border-pencil"
            />
          </label>
          {error && <p className="t-meta not-italic text-pencil">{error}</p>}
          <button disabled={busy} className="btn btn-solid w-full disabled:opacity-50">
            {busy ? "One moment" : mode === "new" ? "Start my paper" : "Open my paper"}
          </button>
        </form>
      </Unfold>
    </main>
  );
}
