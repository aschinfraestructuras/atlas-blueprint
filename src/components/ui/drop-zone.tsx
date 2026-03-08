import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  /** Called when files are selected / dropped */
  onFiles: (files: File[]) => void;
  /** File accept string e.g. ".pdf,.jpg" */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  /** If true, shows staged files list before upload */
  showPreview?: boolean;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function DropZone({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  className,
  showPreview = false,
}: DropZoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [staged, setStaged] = useState<File[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items?.length) setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const arr = Array.from(files);
    if (showPreview) {
      setStaged(prev => [...prev, ...arr]);
    } else {
      onFiles(arr);
    }
  }, [onFiles, showPreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    processFiles(e.dataTransfer.files);
  }, [disabled, processFiles]);

  const handleConfirm = () => {
    if (staged.length > 0) {
      onFiles(staged);
      setStaged([]);
    }
  };

  const removeStaged = (idx: number) => {
    setStaged(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="button"
        tabIndex={0}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all cursor-pointer",
          "border-border bg-muted/20 hover:bg-muted/40 hover:border-border",
          isDragging && "border-primary bg-primary/5 scale-[1.01] shadow-[0_0_20px_hsl(var(--primary)/0.1)]",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => { processFiles(e.target.files); e.target.value = ""; }}
          disabled={disabled}
        />
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
          isDragging ? "bg-primary/10" : "bg-muted",
        )}>
          <Upload className={cn("h-5 w-5", isDragging ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {isDragging ? t("dropZone.dropHere") : t("dropZone.dragOrClick")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("dropZone.hint")}
          </p>
        </div>
      </div>

      {/* Staged files preview */}
      {showPreview && staged.length > 0 && (
        <div className="space-y-1.5">
          {staged.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate flex-1 text-xs">{f.name}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => removeStaged(i)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button size="sm" onClick={handleConfirm} className="w-full gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            {t("dropZone.upload", { count: staged.length })}
          </Button>
        </div>
      )}
    </div>
  );
}
