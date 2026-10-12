import type { Metadata } from "next";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-ink">Bienvenido de nuevo</h1>
      <p className="mb-6 mt-1 text-sm text-ink-2">Ingresa para continuar con tu plan.</p>
      <LoginForm />
    </>
  );
}
