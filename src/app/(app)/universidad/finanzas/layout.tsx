export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <p className="mt-12 border-t border-border pt-4 text-xs leading-relaxed text-muted">
        Herramienta educativa. Los cálculos son estimaciones basadas en los datos que registras y en supuestos explícitos; no constituyen asesoría financiera,
        tributaria, legal ni de inversión. Para decisiones tributarias o contractuales, consulta a un profesional de tu país.
      </p>
    </>
  );
}
