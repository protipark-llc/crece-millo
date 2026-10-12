import { defineConfig, devices } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";

// Carga .env sin dependencias.
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!;
  }
}
const DB = process.env.E2E_DATABASE_URL;
if (!DB) throw new Error("Define E2E_DATABASE_URL");
const PORT = 3200;
const executablePath = existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome") ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, locale: "es-CO", timezoneId: "America/Bogota", launchOptions: { executablePath } },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } }, testIgnore: /responsive\.spec\.ts/ },
    { name: "movil", use: { ...devices["Pixel 7"], launchOptions: { executablePath } }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    // Requiere `npm run build` previo (el script test:e2e lo hace).
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/ingresar`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: DB, SESSION_COOKIE_SECURE: "false" },
  },
});
