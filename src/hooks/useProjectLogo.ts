import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";

/**
 * Returns the public URL of the active project's logo (or null).
 * Also provides helpers to upload & remove the logo.
 */
export function useProjectLogo() {
  const { activeProject, refetchProjects } = useProject();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Resolve logo URL from storage path
  useEffect(() => {
    const raw = (activeProject as any)?.logo_url as string | null | undefined;
    if (!raw) { setLogoUrl(null); return; }
    // If already a full URL, use as-is
    if (raw.startsWith("http")) { setLogoUrl(raw); return; }
    // Otherwise resolve from storage
    const { data } = supabase.storage.from("qms-files").getPublicUrl(raw);
    setLogoUrl(data?.publicUrl ?? null);
  }, [(activeProject as any)?.logo_url, activeProject?.id]);

  const uploadLogo = async (file: File): Promise<boolean> => {
    if (!activeProject) return false;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${activeProject.id}/branding/logo.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("qms-files")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      // Save path in projects table
      const { error: dbErr } = await supabase
        .from("projects")
        .update({ logo_url: path } as any)
        .eq("id", activeProject.id);
      if (dbErr) throw dbErr;

      // Refresh
      const { data } = supabase.storage.from("qms-files").getPublicUrl(path);
      setLogoUrl(data?.publicUrl ?? null);
      await refetchProjects();
      return true;
    } catch (err) {
      console.error("[useProjectLogo] upload error", err);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async (): Promise<boolean> => {
    if (!activeProject) return false;
    try {
      const raw = (activeProject as any)?.logo_url as string | null;
      if (raw && !raw.startsWith("http")) {
        await supabase.storage.from("qms-files").remove([raw]);
      }
      const { error } = await supabase
        .from("projects")
        .update({ logo_url: null } as any)
        .eq("id", activeProject.id);
      if (error) throw error;
      setLogoUrl(null);
      await refetchProjects();
      return true;
    } catch (err) {
      console.error("[useProjectLogo] remove error", err);
      return false;
    }
  };

  return { logoUrl, uploading, uploadLogo, removeLogo };
}
