import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, MapPin } from "lucide-react";
import { getSignedUrlForPath, type Attachment } from "@/lib/services/attachmentService";

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff"]);

function isImage(att: Attachment): boolean {
  if (att.mime_type?.startsWith("image/")) return true;
  const ext = att.file_name.split(".").pop()?.toLowerCase();
  return ext ? IMAGE_EXT.has(ext) : false;
}

export interface PhotoGalleryProps {
  attachments: Attachment[];
  loading?: boolean;
  emptyLabel?: string;
}

interface PhotoItem {
  id: string;
  src: string;
  fileName: string;
  capturedAt?: string | null;
  hasGeo: boolean;
}

/**
 * Galeria visual de fotos do projecto/entidade com lightbox.
 * Filtra automaticamente apenas imagens dos anexos fornecidos.
 */
export function PhotoGallery({ attachments, loading, emptyLabel }: PhotoGalleryProps) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const imageAttachments = useMemo(
    () => attachments.filter(isImage),
    [attachments],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (imageAttachments.length === 0) {
        setPhotos([]);
        return;
      }
      setLoadingThumbs(true);
      const resolved = await Promise.all(
        imageAttachments.map(async (a) => {
          const src = await getSignedUrlForPath(a.file_path);
          return {
            id: a.id,
            src: src ?? "",
            fileName: a.file_name,
            capturedAt: a.captured_at,
            hasGeo: !!(a.latitude && a.longitude),
          };
        }),
      );
      if (!cancelled) {
        setPhotos(resolved.filter(p => p.src));
        setLoadingThumbs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageAttachments]);

  if (loading || loadingThumbs) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 border border-dashed border-border rounded-lg">
        <ImageIcon className="h-10 w-10 opacity-30" />
        <p className="text-sm">{emptyLabel ?? t("gallery.empty", { defaultValue: "Sem fotografias para mostrar" })}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => { setIndex(i); setOpen(true); }}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <img
              src={p.src}
              alt={p.fileName}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {p.hasGeo && (
              <Badge variant="secondary" className="absolute top-1.5 right-1.5 px-1.5 py-0 h-5 text-[10px] gap-0.5 backdrop-blur bg-background/80">
                <MapPin className="h-2.5 w-2.5" />
                GPS
              </Badge>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-white truncate">{p.fileName}</p>
            </div>
          </button>
        ))}
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={photos.map(p => ({
          src: p.src,
          alt: p.fileName,
          title: p.fileName,
          description: p.capturedAt
            ? new Date(p.capturedAt).toLocaleString()
            : undefined,
        }))}
        controller={{ closeOnBackdropClick: true }}
      />
    </>
  );
}
