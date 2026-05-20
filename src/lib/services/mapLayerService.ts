/**
 * MAP LAYER SERVICE
 * CRUD para camadas geográficas (KMZ/KML/GeoJSON) por projecto.
 *
 * Estratégia de conversão:
 *  - Ficheiro original é guardado no bucket `map-layers` em `{project_id}/{layer_id}.{ext}`
 *  - GeoJSON convertido é guardado no campo `geojson_cache` (JSONB) para render imediato
 *  - Conversão KMZ/KML → GeoJSON ocorre no browser (jszip + @tmcw/togeojson)
 */
import JSZip from "jszip";
import { kml } from "@tmcw/togeojson";
import { supabase } from "@/integrations/supabase/client";

export type MapLayerType =
  | "alignment" | "zones" | "structures" | "expropriation"
  | "utilities" | "environment" | "other";

export type MapLayerFormat = "kmz" | "kml" | "geojson";

export interface MapLayerStyle {
  color: string;
  weight: number;
  opacity: number;
  fillOpacity: number;
}

export interface ProjectMapLayer {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  type: MapLayerType;
  file_path: string;
  file_format: MapLayerFormat;
  file_size_bytes: number | null;
  geojson_cache: GeoJSON.FeatureCollection | null;
  style: MapLayerStyle;
  visible_default: boolean;
  display_order: number;
  feature_count: number | null;
  bounds: [[number, number], [number, number]] | null;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const BUCKET = "map-layers";
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export const DEFAULT_STYLE: MapLayerStyle = {
  color: "#06b6d4",
  weight: 3,
  opacity: 0.85,
  fillOpacity: 0.2,
};

/** Compute bounds [[south, west],[north, east]] from a GeoJSON feature collection */
function computeBounds(fc: GeoJSON.FeatureCollection): [[number, number], [number, number]] | null {
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  const visit = (coords: any) => {
    if (typeof coords[0] === "number") {
      const [lng, lat] = coords;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    } else {
      coords.forEach(visit);
    }
  };
  fc.features.forEach((f) => f.geometry && "coordinates" in f.geometry && visit((f.geometry as any).coordinates));
  if (!isFinite(minLat)) return null;
  return [[minLat, minLng], [maxLat, maxLng]];
}

/** Detect format from filename */
export function detectFormat(filename: string): MapLayerFormat | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "kmz") return "kmz";
  if (ext === "kml") return "kml";
  if (ext === "geojson" || ext === "json") return "geojson";
  return null;
}

/** Convert any supported file to GeoJSON FeatureCollection */
export async function fileToGeoJSON(file: File, format: MapLayerFormat): Promise<GeoJSON.FeatureCollection> {
  if (format === "geojson") {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed.type !== "FeatureCollection") throw new Error("Ficheiro GeoJSON inválido: type deve ser FeatureCollection");
    return parsed;
  }

  let kmlText: string;
  if (format === "kmz") {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    // Procurar primeiro .kml dentro do zip (normalmente doc.kml)
    const kmlEntry = Object.values(zip.files).find((f) => !f.dir && f.name.toLowerCase().endsWith(".kml"));
    if (!kmlEntry) throw new Error("KMZ sem ficheiro KML interno");
    kmlText = await kmlEntry.async("string");
  } else {
    kmlText = await file.text();
  }

  const dom = new DOMParser().parseFromString(kmlText, "text/xml");
  const parseError = dom.querySelector("parsererror");
  if (parseError) throw new Error("KML inválido: " + parseError.textContent);
  return kml(dom) as GeoJSON.FeatureCollection;
}

/** List all (non-deleted) layers for a project */
export async function listLayers(projectId: string): Promise<ProjectMapLayer[]> {
  const { data, error } = await (supabase as any)
    .from("project_map_layers")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProjectMapLayer[];
}

interface CreateLayerInput {
  projectId: string;
  file: File;
  name: string;
  description?: string;
  type: MapLayerType;
  style?: Partial<MapLayerStyle>;
  visible_default?: boolean;
}

/** Upload + parse + persist a new layer */
export async function createLayer(input: CreateLayerInput): Promise<ProjectMapLayer> {
  const { projectId, file, name, description, type, style, visible_default } = input;
  if (file.size > MAX_FILE_BYTES) throw new Error(`Ficheiro excede ${MAX_FILE_BYTES / 1024 / 1024} MB`);
  const format = detectFormat(file.name);
  if (!format) throw new Error("Formato não suportado. Use KMZ, KML ou GeoJSON.");

  // 1. Parse para validar antes de gravar
  const fc = await fileToGeoJSON(file, format);
  const bounds = computeBounds(fc);
  const feature_count = fc.features?.length ?? 0;

  // 2. Insert row para obter id estável
  const { data: row, error: insErr } = await (supabase as any)
    .from("project_map_layers")
    .insert({
      project_id: projectId,
      name,
      description: description ?? null,
      type,
      file_path: "pending",
      file_format: format,
      file_size_bytes: file.size,
      style: { ...DEFAULT_STYLE, ...(style ?? {}) },
      visible_default: visible_default ?? true,
      geojson_cache: fc,
      feature_count,
      bounds,
    })
    .select()
    .single();
  if (insErr) throw insErr;

  // 3. Upload do original
  const path = `${projectId}/${row.id}.${format}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: format === "geojson" ? "application/geo+json" : "application/octet-stream",
  });
  if (upErr) {
    // rollback row
    await (supabase as any).from("project_map_layers").delete().eq("id", row.id);
    throw upErr;
  }

  // 4. Atualizar path final
  const { data: final, error: updErr } = await (supabase as any)
    .from("project_map_layers")
    .update({ file_path: path })
    .eq("id", row.id)
    .select()
    .single();
  if (updErr) throw updErr;
  return final as ProjectMapLayer;
}

export async function updateLayerStyle(id: string, style: Partial<MapLayerStyle>): Promise<void> {
  const { error } = await (supabase as any)
    .from("project_map_layers")
    .update({ style })
    .eq("id", id);
  if (error) throw error;
}

export async function updateLayerVisibilityDefault(id: string, visible: boolean): Promise<void> {
  const { error } = await (supabase as any)
    .from("project_map_layers")
    .update({ visible_default: visible })
    .eq("id", id);
  if (error) throw error;
}

export async function renameLayer(id: string, name: string, description: string | null): Promise<void> {
  const { error } = await (supabase as any)
    .from("project_map_layers")
    .update({ name, description })
    .eq("id", id);
  if (error) throw error;
}

/** Soft-delete (Core rule). Storage object permanece para auditoria. */
export async function deleteLayer(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("project_map_layers")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw error;
}

/** Download URL temporário do ficheiro original */
export async function getLayerFileUrl(path: string, ttlSeconds = 300): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttlSeconds);
  if (error) return null;
  return data.signedUrl;
}
