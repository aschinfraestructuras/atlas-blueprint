import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Visually groups filter controls into a single contained toolbar.
 * Replaces loose `flex flex-wrap gap-2` patterns with a polished card look.
 */
export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 items-center",
        "bg-muted/40 border border-border/60 rounded-xl px-3.5 py-2.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
