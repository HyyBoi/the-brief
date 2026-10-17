"use client";
// Batches reading signals and ships them with sendBeacon, so nothing is lost on tab close.
import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import type { Signal } from "@/lib/learn";

type Send = (s: Omit<Signal, "edition_id">) => void;
const Ctx = createContext<Send>(() => {});

export function SignalProvider({ editionId, children }: { editionId: string; children: React.ReactNode }) {
  const queue = useRef<Signal[]>([]);

  const flush = useCallback(() => {
    if (!queue.current.length) return;
    const body = JSON.stringify(queue.current.splice(0));
    if (!navigator.sendBeacon?.("/api/events", body)) {
      fetch("/api/events", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const t = setInterval(flush, 5000);
    const hide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const send = useCallback<Send>(
    (s) => {
      queue.current.push({ ...s, edition_id: editionId });
      if (s.kind === "keep" || s.kind === "kill") flush(); // explicit marks go immediately
    },
    [editionId, flush],
  );

  return <Ctx.Provider value={send}>{children}</Ctx.Provider>;
}

export const useSignal = () => useContext(Ctx);

/** Measures how long a story is actually on screen (≥60% visible). */
export function useDwell(ref: React.RefObject<HTMLElement | null>, articleId: string) {
  const send = useSignal();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let since: number | null = null;
    let total = 0;
    const stop = () => {
      if (since !== null) total += (performance.now() - since) / 1000;
      since = null;
    };
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting && document.visibilityState === "visible" ? (since = performance.now()) : stop()),
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
      if (total >= 4) send({ kind: "dwell", article_id: articleId, value: Math.round(total) });
    };
  }, [ref, articleId, send]);
}
