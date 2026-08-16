import { cn } from "@/lib/utils";

type BellasArtesMarkProps = {
  className?: string;
  inverse?: boolean;
  label?: string;
};

/**
 * A small gallery-window mark: blue tile, white architectural frame and a
 * yellow Caribbean sun. It borrows Alacena's direct Venezuelan retail energy
 * without reusing its cabinet symbol.
 */
export function BellasArtesMark({
  className,
  inverse = false,
  label,
}: BellasArtesMarkProps) {
  return (
    <span
      className={cn("ba-brand-mark", inverse && "ba-brand-mark--inverse", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M7.5 24V13.8C7.5 8.9 11.3 5 16 5s8.5 3.9 8.5 8.8V24" />
        <path d="M7.5 18.5h17M16 5v19" />
        <circle cx="20.7" cy="10.2" r="2.35" className="ba-brand-mark__sun" />
      </svg>
    </span>
  );
}

export function BellasArtesWordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={cn("ba-wordmark", inverse && "ba-wordmark--inverse")}>Bellas Artes</span>
  );
}
