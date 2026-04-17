import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, ClipboardCheck, FlaskConical,
  Construction, Layers, RefreshCw, Navigation,
  Train,
} from "lucide-react";


export interface MapPoint {
  id: string;
  entity_type: "work_item" | "non_conformity" | "ppi" | "test_result";
  project_id: string;
  title: string;
  subtitle: string | null;
  disciplina: string | null;
  status: string | null;
  latitude: number;
  longitude: number;
  pk: string | null;
  severity: string | null;
}

const TYPE_CONFIG = {
  work_item:      { color: "#185FA5", icon: Construction,   label: "Work Items", route: (id: string) => `/work-items/${id}` },
  non_conformity: { color: "#E24B4A", icon: AlertTriangle,  label: "NCs",        route: (id: string) => `/non-conformities/${id}` },
  ppi:            { color: "#1D9E75", icon: ClipboardCheck, label: "PPIs",       route: (id: string) => `/ppi/${id}` },
  test_result:    { color: "#BA7517", icon: FlaskConical,   label: "Ensaios",    route: (_id: string) => `/tests` },
} as const;

function statusColor(type: MapPoint["entity_type"], status: string | null): string {
  if (type === "non_conformity") {
    if (status === "closed") return "#1D9E75";
    if (status === "open" || status === "in_progress") return "#E24B4A";
    return "#BA7517";
  }
  if (type === "ppi") {
    if (status === "approved") return "#1D9E75";
    if (status === "rejected") return "#E24B4A";
    if (status === "in_progress") return "#185FA5";
    return "#888";
  }
  return TYPE_CONFIG[type]?.color ?? "#185FA5";
}

function markerSvg(color: string, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
    <filter id="ds"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/></filter>
    <path filter="url(#ds)" d="M17 2C9.8 2 4 7.8 4 15c0 10 13 27 13 27S30 25 30 15C30 7.8 24.2 2 17 2z" fill="${color}"/>
    <circle cx="17" cy="15" r="8" fill="white" opacity="0.95"/>
    <text x="17" y="19" text-anchor="middle" font-size="7.5" font-weight="800" font-family="system-ui,sans-serif" fill="${color}">${label}</text>
  </svg>`;
}

function pkMarkerSvg(pk: number): string {
  return `<div style="background:#192F48;color:white;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;white-space:nowrap;border:1px solid #2a4a6b;font-family:system-ui,monospace;box-shadow:0 1px 4px rgba(0,0,0,.3)">PK ${pk}+000</div>`;
}

function sectorMarkerSvg(color = "#185FA5"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">
    <circle cx="7" cy="7" r="6" fill="${color}" opacity="0.85"/>
    <circle cx="7" cy="7" r="3" fill="white"/>
  </svg>`;
}

function popupHtml(point: MapPoint): string {
  const cfg = TYPE_CONFIG[point.entity_type];
  const color = statusColor(point.entity_type, point.status);
  const route = cfg.route(point.id);
  return `<div style="min-width:200px;padding:12px 14px;font-family:system-ui,sans-serif;">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
      <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999">${cfg.label}</span>
      ${point.pk ? `<span style="font-size:9px;color:#bbb;margin-left:auto">PK ${point.pk}</span>` : ""}
    </div>
    <p style="font-size:12px;font-weight:700;color:#111;margin:0 0 2px">${point.title ?? "—"}</p>
    ${point.subtitle ? `<p style="font-size:11px;color:#888;margin:0 0 8px">${point.subtitle}</p>` : "<div style='margin-bottom:8px'></div>"}
    <div style="display:flex;gap:5px;flex-wrap:wrap">
      ${point.status ? `<span style="font-size:9px;background:${color}18;color:${color};border:1px solid ${color}40;border-radius:4px;padding:2px 7px;font-weight:600">${point.status}</span>` : ""}
      ${point.disciplina ? `<span style="font-size:9px;background:#f3f4f6;color:#555;border-radius:4px;padding:2px 7px">${point.disciplina}</span>` : ""}
    </div>
    <button onclick="window.__atlasNav&&window.__atlasNav('${route}')"
      style="margin-top:10px;width:100%;padding:7px;background:${color};color:#fff;border:none;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer">
      Ver detalhe →
    </button>
  </div>`;
}

interface Props { height?: number; showControls?: boolean; className?: string; }

export function ProjectMap({ height = 480, showControls = true, className }: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const mapRef      = useRef<{ map: any; L: any } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef  = useRef<any[]>([]);
  const [points, setPoints]    = useState<MapPoint[]>([]);
  const [loading, setLoading]  = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [showAlignment, setShowAlignment] = useState(true);
  const [showPKs, setShowPKs]   = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<MapPoint["entity_type"]>>(
    new Set(["work_item", "non_conformity", "ppi", "test_result"])
  );

  useEffect(() => {
    (window as any).__atlasNav = navigate;
    return () => { delete (window as any).__atlasNav; };
  }, [navigate]);

  const loadPoints = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("vw_map_points")
      .select("*")
      .eq("project_id", activeProject.id);
    setPoints((data ?? []) as MapPoint[]);
    setLoading(false);
  }, [activeProject]);

  useEffect(() => { loadPoints(); }, [loadPoints]);

  // Carregar GeoJSON e inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    Promise.all([
      import("leaflet"),
      fetch("/pf17a_alignment.geojson").then(r => r.json()).catch(() => null),
    ]).then(([L, geoData]) => {
      if (cancelled || !containerRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(containerRef.current!, {
        center: [38.55, -8.83],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = { map, L, geoData };
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      if (mapRef.current?.map) {
        mapRef.current.map.remove();
        mapRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // Camadas do traçado + PKs
  const alignmentLayerRef = useRef<any>(null);
  const pkLayersRef = useRef<any[]>([]);
  const sectorLayersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const { map, L, geoData } = mapRef.current as any;

    // Limpar camadas anteriores
    if (alignmentLayerRef.current) { alignmentLayerRef.current.remove(); alignmentLayerRef.current = null; }
    pkLayersRef.current.forEach(l => l.remove()); pkLayersRef.current = [];
    sectorLayersRef.current.forEach(l => l.remove()); sectorLayersRef.current = [];

    const features = (geoData as any)?.features ?? [];

    // Traçado
    if (showAlignment) {
      const lineFeature = features.find((f: any) => f.properties?.type === "railway_alignment");
      if (lineFeature) {
        const coords = lineFeature.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]);
        const polyline = L.polyline(coords, {
          color: "#185FA5",
          weight: 4,
          opacity: 0.85,
          dashArray: undefined,
        }).addTo(map);
        // Linha de realce
        L.polyline(coords, {
          color: "#5b8dd9",
          weight: 8,
          opacity: 0.2,
        }).addTo(map);
        alignmentLayerRef.current = polyline;
      }
    }

    // Marcadores PK
    if (showPKs) {
      const pkFeatures = features.filter((f: any) => f.properties?.type === "pk_marker");
      pkFeatures.forEach((f: any) => {
        const [lon, lat] = f.geometry.coordinates;
        const icon = L.divIcon({
          html: pkMarkerSvg(f.properties.pk),
          className: "",
          iconSize: [60, 20],
          iconAnchor: [30, 10],
        });
        const m = L.marker([lat, lon], { icon })
          .bindTooltip(f.properties.local, { direction: "top", offset: [0, -12] })
          .addTo(map);
        pkLayersRef.current.push(m);
      });
    }

    // Sectores WBS
    const sectorFeatures = features.filter((f: any) => f.properties?.type === "sector");
    sectorFeatures.forEach((f: any) => {
      const [lon, lat] = f.geometry.coordinates;
      const icon = L.divIcon({
        html: sectorMarkerSvg("#185FA5"),
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const m = L.marker([lat, lon], { icon })
        .bindPopup(`<div style="padding:8px 10px;font-family:system-ui;min-width:180px">
          <p style="font-size:9px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 4px">Sector WBS</p>
          <p style="font-size:12px;font-weight:700;color:#111;margin:0">${f.properties.name}</p>
          <p style="font-size:10px;color:#888;margin:4px 0 0">PK ${f.properties.pk}+000 (aprox.)</p>
        </div>`)
        .addTo(map);
      sectorLayersRef.current.push(m);
    });

  }, [mapReady, showAlignment, showPKs]);

  // Marcadores de dados reais
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const { map, L } = mapRef.current;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const visible = points.filter(p => activeFilters.has(p.entity_type));
    if (visible.length === 0) return;

    const bounds: [number, number][] = [];

    visible.forEach(point => {
      const color = statusColor(point.entity_type, point.status);
      const label = point.entity_type === "non_conformity" ? "NC"
        : point.entity_type === "ppi" ? "PPI"
        : point.entity_type === "test_result" ? "ENS" : "WI";

      const icon = L.divIcon({
        html: markerSvg(color, label),
        className: "",
        iconSize: [34, 44],
        iconAnchor: [17, 44],
        popupAnchor: [0, -46],
      });

      const marker = L.marker([point.latitude, point.longitude], { icon })
        .addTo(map)
        .bindPopup(popupHtml(point), { maxWidth: 260, minWidth: 220 });

      markersRef.current.push(marker);
      bounds.push([point.latitude, point.longitude]);
    });

    if (bounds.length === 1) map.setView(bounds[0], 15);
    else if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 16 });
  }, [points, activeFilters, mapReady]);

  const centreOnLine = () => {
    if (!mapRef.current) return;
    mapRef.current.map.setView([38.55, -8.83], 12);
  };

  const typeCounts = Object.fromEntries(
    (["work_item", "non_conformity", "ppi", "test_result"] as const).map(type => [
      type, points.filter(p => p.entity_type === type).length,
    ])
  );

  return (
    <Card className={cn("overflow-hidden border border-border/60", className)}>
      {showControls && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/20 flex-wrap">

          {/* Camadas base */}
          <Train className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <button
            onClick={() => setShowAlignment(v => !v)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all",
              showAlignment ? "text-white border-transparent" : "bg-transparent border-border text-muted-foreground opacity-50"
            )}
            style={showAlignment ? { backgroundColor: "#185FA5" } : {}}
          >
            Traçado
          </button>
          <button
            onClick={() => setShowPKs(v => !v)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all",
              showPKs ? "bg-foreground text-background border-foreground" : "bg-transparent border-border text-muted-foreground opacity-50"
            )}
          >
            PKs
          </button>

          <div className="w-px h-4 bg-border/60 mx-0.5" />

          {/* Camadas de dados */}
          <Layers className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          {(["work_item", "non_conformity", "ppi", "test_result"] as const).map(type => {
            const cfg = TYPE_CONFIG[type];
            const count = typeCounts[type] ?? 0;
            const active = activeFilters.has(type);
            return (
              <button
                key={type}
                onClick={() => setActiveFilters(prev => {
                  const next = new Set(prev);
                  next.has(type) ? next.delete(type) : next.add(type);
                  return next;
                })}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all",
                  active ? "text-white border-transparent" : "bg-transparent border-border text-muted-foreground opacity-40 hover:opacity-70"
                )}
                style={active ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
              >
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
                {count > 0 && (
                  <span className={cn("rounded-full px-1.5 py-0 text-[9px] font-bold tabular-nums",
                    active ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                  )}>{count}</span>
                )}
              </button>
            );
          })}

          <div className="ml-auto flex gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2.5" onClick={centreOnLine}>
              <Navigation className="h-3 w-3" />
              <span className="hidden sm:inline">{t("map.centre", { defaultValue: "PF17A" })}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={loadPoints} title="Actualizar">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="relative" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-card/80 backdrop-blur-sm">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {showControls && (
        <div className="px-4 py-2 border-t border-border/40 bg-muted/10 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {points.length > 0
              ? `${points.filter(p => activeFilters.has(p.entity_type)).length}/${points.length} pontos de dados · traçado aproximado (PF17A)`
              : t("map.noPointsShort", { defaultValue: "Traçado PF17A · Adicione coordenadas GPS nos formulários" })}
          </span>
          <span className="text-[10px] text-muted-foreground">© OpenStreetMap</span>
        </div>
      )}
    </Card>
  );
}
