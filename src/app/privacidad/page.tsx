import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function Privacy() {
  return (
    <main id="contenido" className="mx-auto max-w-2xl px-4 py-12 text-[15px] leading-relaxed text-ink-2 sm:px-6">
      <Link href="/" className="text-sm text-brand hover:underline">
        ← Volver
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-ink">Política de privacidad y tratamiento de datos</h1>
      <p className="mt-2 text-sm text-muted">Borrador operativo para la primera versión. Debe ser revisado por un profesional jurídico antes del lanzamiento comercial (en Colombia, conforme a la Ley 1581 de 2012 y sus decretos reglamentarios).</p>
      <h2 className="mt-8 font-semibold text-ink">Qué datos tratamos</h2>
      <p className="mt-2">Nombre, correo electrónico, contraseña (almacenada solo como hash), preferencias regionales y la información financiera que registras voluntariamente: cuentas, movimientos, presupuestos, deudas, bienes, objetivos y progreso educativo.</p>
      <h2 className="mt-6 font-semibold text-ink">Para qué los usamos</h2>
      <p className="mt-2">Exclusivamente para prestarte el servicio: calcular tus indicadores, proyecciones y recomendaciones. No vendemos ni compartimos tus datos con terceros, ni los usamos para publicidad.</p>
      <h2 className="mt-6 font-semibold text-ink">Cómo los protegemos</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Cada registro está asociado a su propietario y la base de datos aplica aislamiento por fila: una persona no puede consultar los datos de otra.</li>
        <li>Las sesiones usan cookies seguras (httpOnly) y los tokens se guardan cifrados con hash.</li>
        <li>No guardamos credenciales bancarias ni nos conectamos a tus bancos.</li>
      </ul>
      <h2 className="mt-6 font-semibold text-ink">Tus derechos</h2>
      <p className="mt-2">Puedes consultar, exportar (formato JSON) y eliminar todos tus datos desde Configuración. La eliminación es definitiva.</p>
      <h2 className="mt-6 font-semibold text-ink">Naturaleza del servicio</h2>
      <p className="mt-2">Es una herramienta educativa y de organización. No constituye asesoría financiera, tributaria, legal ni de inversión.</p>
    </main>
  );
}
