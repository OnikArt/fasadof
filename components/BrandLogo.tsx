export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "brand-logo compact" : "brand-logo"} aria-label="ФасадоФ">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/fasadof-logo.png" alt="ФасадоФ" width={compact ? 54 : 72} height={compact ? 54 : 72} />
    </span>
  );
}
