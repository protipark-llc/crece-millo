import demo from "./estado-demo.json";
import { parseBackup, type CopilotState } from "./state";

/** Cookie del modo ejemplo (solo cambia lo que se ve; nada se guarda). */
export const EJEMPLO_COOKIE = "copiloto_ejemplo";

/** Estado de la demostración del paquete (docs/copiloto/motor/estado-demo.json, datos ficticios). */
export const ejemploState = (today: string): CopilotState =>
  parseBackup(demo, today);
