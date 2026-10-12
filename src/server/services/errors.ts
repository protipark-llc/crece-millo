/** Error de negocio con mensaje apto para mostrar a la persona (no filtra detalles internos). */
export class UserFacingError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
  }
}

export class NotFoundError extends UserFacingError {
  constructor(what = "El registro") {
    super(`${what} no existe o no te pertenece.`);
  }
}

/** Traduce violaciones de restricciones de PostgreSQL a mensajes comprensibles. */
export function translateDbError(err: unknown): UserFacingError | null {
  const e = err as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  const code = e?.code ?? e?.cause?.code;
  const constraint = e?.constraint ?? e?.cause?.constraint ?? "";
  if (code === "23505") {
    if (constraint.includes("idempotency")) return new UserFacingError("Este formulario ya se había enviado; no se creó un duplicado.");
    if (constraint.includes("name")) return new UserFacingError("Ya existe un registro con ese nombre.", "name");
    if (constraint.includes("month")) return new UserFacingError("Ya existe un presupuesto para ese mes.");
    if (constraint.includes("asset_day")) return new UserFacingError("Ya hay un avalúo registrado para ese activo en esa fecha.", "valuedOn");
    return new UserFacingError("El registro ya existe.");
  }
  if (code === "23503") return new UserFacingError("El registro está relacionado con otros datos y no se puede completar la operación.");
  if (code === "23514") return new UserFacingError("Algún dato no cumple las reglas de validación.");
  if (code === "42501") return new UserFacingError("No tienes permiso para esta operación.");
  return null;
}
