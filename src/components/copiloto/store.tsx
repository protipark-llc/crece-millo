"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  formatFecha,
  formatMeses,
  formatMoney,
  formatPct,
  formatX,
} from "@/lib/copiloto/format";
import type { CopilotState, Product, Saved, Test } from "@/lib/copiloto/state";
import type { SettingsPatch } from "@/server/services/copiloto";
import {
  putProductAction,
  putProductStateAction,
  putSavedAction,
  putTestAction,
  removeProductAction,
  removeSavedAction,
  removeTestAction,
  saveSettingsAction,
  type SaveResult,
} from "@/app/(app)/comunidad/emprendedores/copiloto/actions";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface CopilotoApi {
  S: CopilotState;
  /** Modo demostración: nada se guarda. */
  demo: boolean;
  status: SaveStatus;
  error: string | null;
  retry: () => void;
  setSettings: (patch: SettingsPatch) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  addProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
  addTest: (t: Test) => void;
  removeTest: (id: string) => void;
  setProductState: (
    productId: string,
    kind: "pc" | "mk",
    data: Record<string, unknown> | null,
  ) => void;
  addSaved: (kind: "plan" | "sim", item: Saved) => void;
  removeSaved: (kind: "plan" | "sim", id: string) => void;
  /** Guarda ya lo pendiente y espera a que termine (antes de pedir algo al servidor). */
  flush: () => Promise<void>;
  fmt: {
    money: (n: number) => string;
    pct: (n: number) => string;
    x: (n: number) => string;
    meses: (m: number | null | undefined) => string;
    fecha: (iso: string) => string;
  };
}

const Ctx = createContext<CopilotoApi | null>(null);

export function useCopiloto(): CopilotoApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCopiloto fuera de CopilotoProvider");
  return c;
}

type Op = () => Promise<SaveResult>;

/** Espera antes de guardar mientras la persona escribe (ms). */
const TYPING_DELAY = 450;

export function CopilotoProvider({
  initial,
  demo = false,
  children,
}: {
  initial: CopilotState;
  demo?: boolean;
  children: ReactNode;
}) {
  const [S, setS] = useState<CopilotState>(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  // Estado más reciente, para que los guardados diferidos usen el último valor.
  const latest = useRef(S);
  latest.current = S;
  const chain = useRef<Promise<void>>(Promise.resolve());
  const inFlight = useRef(0);
  const failed = useRef<Op[]>([]);
  const timers = useRef(
    new Map<string, { timer: ReturnType<typeof setTimeout>; op: Op }>(),
  );
  const pendingSettings = useRef<SettingsPatch>({});

  const enqueue = useCallback(
    (op: Op) => {
      if (demo) return;
      inFlight.current++;
      setStatus("saving");
      chain.current = chain.current.then(async () => {
        let r: SaveResult;
        try {
          r = await op();
        } catch {
          r = { ok: false, error: "Sin conexión. Revisa tu internet." };
        }
        inFlight.current--;
        if (!r.ok) {
          failed.current.push(op);
          setError(r.error);
          setStatus("error");
        } else if (
          inFlight.current === 0 &&
          failed.current.length === 0 &&
          timers.current.size === 0
        ) {
          setError(null);
          setStatus("saved");
        }
      });
    },
    [demo],
  );

  /** Guardado diferido por clave: si llega otro cambio de lo mismo, se reinicia la espera. */
  const later = useCallback(
    (key: string, op: Op, delay = TYPING_DELAY) => {
      if (demo) return;
      const prev = timers.current.get(key);
      if (prev) clearTimeout(prev.timer);
      const timer = setTimeout(() => {
        timers.current.delete(key);
        enqueue(op);
      }, delay);
      timers.current.set(key, { timer, op });
      setStatus("saving");
    },
    [demo, enqueue],
  );

  const flush = useCallback(() => {
    for (const [key, { timer, op }] of timers.current) {
      clearTimeout(timer);
      timers.current.delete(key);
      enqueue(op);
    }
  }, [enqueue]);

  // Al ocultar o cerrar la pestaña, guarda lo pendiente.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const retry = useCallback(() => {
    const ops = failed.current;
    failed.current = [];
    setError(null);
    ops.forEach(enqueue);
  }, [enqueue]);

  const api = useMemo<CopilotoApi>(() => {
    const ctx = { cur: S.cur, trm: S.trm };
    const productOp =
      (id: string): Op =>
      () => {
        const p = latest.current.products.find((x) => x.id === id);
        return p ? putProductAction(p) : Promise.resolve({ ok: true });
      };
    return {
      S,
      demo,
      status,
      error,
      retry,
      setSettings(patch) {
        setS((prev) => ({ ...prev, ...patch }) as CopilotState);
        pendingSettings.current = { ...pendingSettings.current, ...patch };
        later("settings", () => {
          const p = pendingSettings.current;
          pendingSettings.current = {};
          return saveSettingsAction(p);
        });
      },
      updateProduct(id, patch) {
        setS((prev) => ({
          ...prev,
          products: prev.products.map((p) =>
            p.id === id ? ({ ...p, ...patch } as Product) : p,
          ),
        }));
        later(`product:${id}`, productOp(id));
      },
      addProduct(p) {
        setS((prev) => ({ ...prev, products: [...prev.products, p] }));
        enqueue(() => putProductAction(p));
      },
      removeProduct(id) {
        const pending = timers.current.get(`product:${id}`);
        if (pending) {
          clearTimeout(pending.timer);
          timers.current.delete(`product:${id}`);
        }
        setS((prev) => {
          if (prev.products.length <= 1) return prev;
          const products = prev.products.filter((p) => p.id !== id);
          const { [id]: _pc, ...pc } = prev.pc;
          const { [id]: _mk, ...mk } = prev.mk;
          return {
            ...prev,
            products,
            pc,
            mk,
            active: prev.active === id ? products[0]!.id : prev.active,
          };
        });
        enqueue(() => removeProductAction(id));
      },
      addTest(t) {
        // Como el original: los tests nuevos van primero (unshift).
        setS((prev) => ({ ...prev, tests: [t, ...prev.tests] }));
        enqueue(() => putTestAction(t));
      },
      removeTest(id) {
        setS((prev) => ({
          ...prev,
          tests: prev.tests.filter((t) => t.id !== id),
        }));
        enqueue(() => removeTestAction(id));
      },
      setProductState(productId, kind, data) {
        setS((prev) => {
          const bag = { ...prev[kind] };
          if (data === null) delete bag[productId];
          else bag[productId] = data;
          return { ...prev, [kind]: bag };
        });
        later(`${kind}:${productId}`, () =>
          putProductStateAction(productId, kind, data),
        );
      },
      addSaved(kind, item) {
        const key = kind === "plan" ? "plans" : "sims";
        setS((prev) => ({ ...prev, [key]: [item, ...prev[key]] }));
        enqueue(() => putSavedAction(kind, item));
      },
      removeSaved(kind, id) {
        const key = kind === "plan" ? "plans" : "sims";
        setS((prev) => ({
          ...prev,
          [key]: prev[key].filter((x) => x.id !== id),
        }));
        enqueue(() => removeSavedAction(id));
      },
      flush: async () => {
        flush();
        await chain.current;
      },
      fmt: {
        money: (n) => formatMoney(n, ctx),
        pct: formatPct,
        x: formatX,
        meses: formatMeses,
        fecha: formatFecha,
      },
    };
  }, [S, demo, status, error, retry, later, enqueue, flush]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
