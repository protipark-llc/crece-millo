import "server-only";
import { cache } from "react";
import { enabledSections, homeHref } from "@/lib/sections";
import { loadForUser } from "./action-utils";
import { getSettings } from "./services/settings";

/** Secciones visibles de la persona actual (una consulta por petición). */
export const currentSections = cache(async () => {
  const s = await loadForUser(({ tx, userId }) => getSettings(tx, userId));
  const enabled = enabledSections(s);
  return { mode: (s.viewMode ?? "pro") as "esencial" | "pro" | "personalizada", enabled, home: homeHref(enabled) };
});
