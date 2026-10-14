"use client";

import { useRef, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";
import { GLOS } from "@/lib/copiloto/glosario";
import { fieldClass } from "./ui";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Glosario en lenguaje sencillo (openGlos, L650): panel lateral con búsqueda. */
export function Glosario() {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const list = GLOS.filter(
    (g) => !q.trim() || norm(g.term + " " + g.text).includes(norm(q.trim())),
  );
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQ("");
          ref.current?.showModal();
        }}
        className="inline-flex h-11 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <BookOpen aria-hidden className="size-4" /> Glosario
      </button>
      <dialog
        ref={ref}
        aria-labelledby="glos-t"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-[min(560px,100vw)] max-w-none overflow-y-auto border-l border-border bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40"
      >
        <div className="sticky top-0 z-10 space-y-3 border-b border-border bg-surface px-5 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="glos-t" className="text-xl font-semibold">
              Glosario en lenguaje sencillo
            </h2>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => ref.current?.close()}
              className="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-2"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <label className="relative block">
            <span className="sr-only">Buscar un término</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              role="searchbox"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar un término…"
              className={`${fieldClass} pl-9`}
            />
          </label>
        </div>
        <dl className="divide-y divide-border px-5 pb-6">
          {list.map((g) => (
            <div key={g.term} className="py-3.5 text-[15px] leading-relaxed">
              <dt className="inline font-semibold">{g.term}.</dt>{" "}
              <dd className="inline text-ink-2">{g.text}</dd>
            </div>
          ))}
          {list.length === 0 && (
            <p className="py-6 text-sm text-muted">
              No hay términos con «{q}».
            </p>
          )}
        </dl>
      </dialog>
    </>
  );
}
