"use client";

import { Alert, Button } from "@/components/ui/primitives";

export default function FinanceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <Alert tone="neg" title="No pudimos cargar esta sección">
        Ocurrió un error inesperado. Tus datos no se modificaron. Intenta de nuevo; si el problema persiste, recarga la página.
      </Alert>
      <Button className="mt-4" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
