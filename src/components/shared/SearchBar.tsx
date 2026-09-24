import { Search } from "lucide-react";

type SearchBarProps = {
  action?: string;
  id: string;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  showCompactSubmit?: boolean;
  submitLabel?: string;
  iconOnlySubmit?: boolean;
};

export function SearchBar({
  action = "/buscar",
  id,
  placeholder = "Busca por código, modelo, marca o especificación",
  className = "",
  compact = false,
  showCompactSubmit = false,
  submitLabel = "Buscar",
  iconOnlySubmit = false,
}: SearchBarProps) {
  return (
    <form action={action} className={`flex min-w-0 items-center gap-2 ${className}`}>
      <label className="sr-only" htmlFor={id}>Buscar por código, modelo, marca o especificación</label>
      <div className={`flex min-w-0 flex-1 items-center gap-3 rounded-md border border-border bg-white px-4 text-text-secondary transition focus-within:border-brand-secondary-600 focus-within:ring-2 focus-within:ring-brand-secondary-600/15 ${compact ? "h-11" : "min-h-14"}`}>
        <Search className="h-5 w-5 shrink-0 text-brand-secondary-600" aria-hidden="true" />
        <input id={id} name="q" type="search" placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm font-medium text-brand-primary-900 outline-none placeholder:text-text-secondary" />
      </div>
      {!compact || showCompactSubmit ? (
        <button
          type="submit"
          aria-label={submitLabel}
          className={compact || iconOnlySubmit ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-secondary-600 text-white transition hover:bg-brand-primary-900" : "inline-flex h-14 shrink-0 items-center justify-center rounded-md bg-primary px-5 text-sm font-extrabold text-brand-primary-900 transition hover:bg-primary-hover"}
        >
          <Search className={compact || iconOnlySubmit ? "h-5 w-5" : "hidden"} aria-hidden="true" />
          <span className={compact || iconOnlySubmit ? "sr-only" : ""}>{submitLabel}</span>
        </button>
      ) : null}
    </form>
  );
}
