"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Monta i children solo quando entrano (o stanno per entrare) nel viewport.
 * Serve a tenere fuori dal bundle iniziale i grafici (recharts): il chunk
 * viene richiesto solo allo scroll. Regola perf-first del progetto.
 */
export function LazyOnView({
  children,
  minHeight = 360,
  rootMargin = "200px",
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, rootMargin]);

  return (
    <div ref={ref} style={{ minHeight: show ? undefined : minHeight }}>
      {show ? (
        children
      ) : (
        <div
          className="flex items-center justify-center rounded-lg border border-line bg-bg-subtle text-sm text-ink-faint"
          style={{ height: minHeight }}
        >
          Grafico in caricamento…
        </div>
      )}
    </div>
  );
}
