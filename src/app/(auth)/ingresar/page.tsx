import type { Metadata } from "next";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <>
      <h1 className="t-page text-ink">Qué bueno verte de nuevo</h1>
      <p className="mt-2 mb-6 text-ink-2">Ingresa para seguir donde quedaste.</p>
      <LoginForm />
    </>
  );
}
