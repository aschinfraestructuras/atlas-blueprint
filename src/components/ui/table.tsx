import * as React from "react";
import { cn } from "@/lib/utils";

// ── Table wrapper — overflow suave, sem scrollbar visual
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto rounded-xl">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm border-collapse", className)}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

// ── TableHeader — sticky com backdrop blur elegante
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "[&_tr]:border-b [&_tr]:border-border/50",
      "sticky top-0 z-10",
      "bg-muted/60 backdrop-blur-sm",
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

// ── TableBody — linhas com separador subtil
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0 [&_tr]:border-b [&_tr]:border-border/30", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t border-border/50 bg-muted/30 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

// ── TableRow — hover e selecção mais limpos
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "transition-colors duration-100",
      "hover:bg-muted/40",
      "data-[state=selected]:bg-primary/5",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

// ── TableHead — mais compacto, tipografia precisa
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-9 px-3 text-left align-middle",
      "text-[10px] font-bold uppercase tracking-[0.1em]",
      "text-muted-foreground/70",
      "[&:has([role=checkbox])]:pr-0 [&:has([role=checkbox])]:pl-4",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

// ── TableCell — padding mais generoso, alinhamento vertical perfeito
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-3 py-2.5 align-middle",
      "[&:has([role=checkbox])]:pr-0 [&:has([role=checkbox])]:pl-4",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-xs text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table, TableHeader, TableBody, TableFooter,
  TableHead, TableRow, TableCell, TableCaption,
};
