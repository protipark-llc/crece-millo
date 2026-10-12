import type { Metadata } from "next";
import { RegisterForm } from "../auth-forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-ink">Crea tu cuenta</h1>
      <p className="mb-6 mt-1 text-sm text-ink-2">Empieza por entender dónde estás. Sin juicios: solo claridad para decidir mejor.</p>
      <RegisterForm />
    </>
  );
}
