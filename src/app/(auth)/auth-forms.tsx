"use client";

import Link from "next/link";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { COUNTRIES } from "@/lib/money/currency";
import { loginAction, registerAction } from "../auth-actions";

export function LoginForm() {
  return (
    <ActionForm action={loginAction} className="space-y-4">
      <TextField label="Correo electrónico" name="email" type="email" autoComplete="email" required />
      <TextField label="Contraseña" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton className="w-full">Ingresar</SubmitButton>
      <p className="text-center text-sm text-ink-2">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-brand hover:underline">
          Crear cuenta
        </Link>
      </p>
    </ActionForm>
  );
}

export function RegisterForm() {
  return (
    <ActionForm action={registerAction} className="space-y-4">
      <TextField label="Nombre" name="name" autoComplete="name" required />
      <TextField label="Correo electrónico" name="email" type="email" autoComplete="email" required />
      <TextField label="Contraseña" name="password" type="password" autoComplete="new-password" hint="Mínimo 10 caracteres, con letras y números." required />
      <SelectField label="País" name="country" defaultValue="CO" hint="Define tu moneda principal y el formato de fechas. Puedes cambiarlo después.">
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name} ({c.currency})
          </option>
        ))}
      </SelectField>
      <CheckboxField
        name="acceptPrivacy"
        label="Acepto el tratamiento de mis datos según la política de privacidad."
        hint="Tus datos financieros son privados: solo tú puedes verlos. Puedes exportarlos o eliminarlos cuando quieras."
      />
      <p className="text-xs text-muted">
        <Link href="/privacidad" className="underline" target="_blank">
          Leer la política de privacidad
        </Link>
      </p>
      <SubmitButton className="w-full">Crear cuenta</SubmitButton>
      <p className="text-center text-sm text-ink-2">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-brand hover:underline">
          Ingresar
        </Link>
      </p>
    </ActionForm>
  );
}
