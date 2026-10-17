"use client";
// The one orchestrated moment: the paper arrives folded and opens flat on the desk.
import { motion, useReducedMotion } from "motion/react";

export function Unfold({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="stage">
      <motion.div
        className={`sheet preserve relative ${className}`}
        style={{ transformOrigin: "50% 0%" }}
        initial={reduce ? { opacity: 0 } : { rotateX: 78, y: 120, opacity: 0, scale: 0.94 }}
        animate={reduce ? { opacity: 1 } : { rotateX: 0, y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
        {/* the crease, fading as the paper flattens */}
        {!reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/20"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          />
        )}
      </motion.div>
    </div>
  );
}
