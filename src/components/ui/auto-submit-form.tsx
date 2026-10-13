"use client";

import Form from "next/form";
import { useRef, type ComponentProps } from "react";

/**
 * Formulario GET que se envía solo al cambiar un filtro (navegación del lado del cliente con
 * next/form). En campos de texto espera a que la persona deje de escribir. Sin JavaScript,
 * el botón «Aplicar» (oculto visualmente) sigue funcionando.
 */
export function AutoSubmitForm({ children, ...props }: ComponentProps<typeof Form>) {
  const ref = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submit = (delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => ref.current?.requestSubmit(), delay);
  };
  return (
    <Form
      ref={ref}
      {...props}
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement;
        submit(t.type === "search" || t.type === "text" ? 450 : 0);
      }}
    >
      {children}
      <button type="submit" className="sr-only">
        Aplicar filtros
      </button>
    </Form>
  );
}
