import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { invalidateProjectLogoCache } from "@/lib/services/projectLogoResolver";

/**
 * Convert image URL to base64 data URI for reliable PDF/print rendering.
 */
async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Returns the public URL of the active project's logo (or null).
 * Also provides a pre-fetched base64 version for PDF exports,
 * and helpers to upload & remove the logo.
 */
export function useProjectLogo() {
  const { activeProject, refetchProjects } = useProject();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Resolve logo URL from storage path
  useEffect(() => {
    const raw = (activeProject as any)?.logo_url as string | null | undefined;
    if (!raw) { setLogoUrl(null); setLogoBase64(null); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);

    async function resolve() {
      let url: string;
      if (raw!.startsWith("http")) {
        // Block remote URLs to prevent privacy leaks and content injection
        console.warn("[useProjectLogo] Remote URLs are not allowed for logo_url. Use storage paths only.");
        if (!cancelled) { setLogoUrl(null); setLogoBase64(null); }
        return;
      } else {
        // Use signed URL instead of public URL to keep bucket private
        const { data, error } = await supabase.storage
          .from("qms-files")
          .createSignedUrl(raw!, 86400); // 24h expiry
        if (error || !data?.signedUrl) {
          if (!cancelled) { setLogoUrl(null); setLogoBase64(null); }
          return;
        }
        url = data.signedUrl;
      }
      if (cancelled || !url) { setLoading(false); return; }
      setLogoUrl(url);
      // Pre-fetch base64 for PDF exports
      fetchAsBase64(url).then(b64 => { if (!cancelled) { setLogoBase64(b64); setLoading(false); } });
    }

    resolve();
    return () => { cancelled = true; };
  }, [(activeProject as any)?.logo_url, activeProject?.id, activeProject]);

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

      const { error: dbErr } = await supabase
        .from("projects")
        .update({ logo_url: path } as any)
        .eq("id", activeProject.id);
      if (dbErr) throw dbErr;
      invalidateProjectLogoCache(activeProject.id);
      const { data: signedData } = await supabase.storage
        .from("qms-files")
        .createSignedUrl(path, 86400);
      const newUrl = signedData?.signedUrl ?? null;
      setLogoUrl(newUrl);
      if (newUrl) fetchAsBase64(newUrl).then(b64 => setLogoBase64(b64));
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
      invalidateProjectLogoCache(activeProject.id);
      setLogoUrl(null);
      setLogoBase64(null);
      await refetchProjects();
      return true;
    } catch (err) {
      console.error("[useProjectLogo] remove error", err);
      return false;
    }
  };

  return { logoUrl, logoBase64, uploading, loading, uploadLogo, removeLogo };
}
