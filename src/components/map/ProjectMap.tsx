import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
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
  Train, Locate,
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

export interface ProjectMapHandle {
  focusPoint: (point: MapPoint) => void;
  refresh: () => void;
}

const TYPE_CONFIG = {
  work_item:      { color: "#185FA5", icon: Construction,   label: "Work Items", route: (id: string) => `/work-items/${id}` },
  non_conformity: { color: "#E24B4A", icon: AlertTriangle,  label: "NCs",        route: (id: string) => `/non-conformities/${id}` },
  ppi:            { color: "#1D9E75", icon: ClipboardCheck, label: "PPIs",       route: (id: string) => `/ppi/${id}` },
  test_result:    { color: "#BA7517", icon: FlaskConical,   label: "Ensaios",    route: (_id: string) => `/tests` },
} as const;

// Fallback global default (Lisboa centro) — usado apenas se não houver projeto, nem geo, nem pontos
const DEFAULT_CENTER: [number, number] = [39.5, -8.0];
const DEFAULT_ZOOM = 7;

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

function pkMarkerSvg(pk: number | string): string {
  return `<div style="background:#192F48;color:white;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;white-space:nowrap;border:1px solid #2a4a6b;font-family:system-ui,monospace;box-shadow:0 1px 4px rgba(0,0,0,.3)">PK ${pk}+000</div>`;
}

function sectorMarkerSvg(color = "#185FA5"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">
    <circle cx="7" cy="7" r="6" fill="${color}" opacity="0.85"/>
    <circle cx="7" cy="7" r="3" fill="white"/>
  </svg>`;
}

function userMarkerSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="9" fill="#3B82F6" opacity="0.25"/>
    <circle cx="10" cy="10" r="5" fill="#3B82F6" stroke="white" stroke-width="2"/>
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

interface Props {
  height?: number;
  showControls?: boolean;
  className?: string;
  onPointsLoaded?: (points: MapPoint[]) => void;
  onActiveFiltersChange?: (filters: Set<MapPoint["entity_type"]>) => void;
}

export const ProjectMap = forwardRef<ProjectMapHandle, Props>(function ProjectMap(
  { height = 480, showControls = true, className, onPointsLoaded, onActiveFiltersChange },
  ref,
) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const mapRef        = useRef<{ map: any; L: any; geoData: any | null } | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const markersRef    = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);
  const [points, setPoints]    = useState<MapPoint[]>([]);
  const [loading, setLoading]  = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [showAlignment, setShowAlignment] = useState(true);
  const [showPKs, setShowPKs]   = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<MapPoint["entity_type"]>>(
    new Set(["work_item", "non_conformity", "ppi", "test_result"])
  );

  // Project-specific alignment file (only PF17A has one shipped)
  const isPF17A = activeProject?.code?.toUpperCase() === "PF17A";

  useEffect(() => {
    (window as any).__atlasNav = navigate;
    return () => { delete (window as any).__atlasNav; };
  }, [navigate]);

  useEffect(() => {
    onActiveFiltersChange?.(activeFilters);
  }, [activeFilters, onActiveFiltersChange]);

  const loadPoints = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("vw_map_points")
      .select("*")
      .eq("project_id", activeProject.id);
    const pts = (data ?? []) as MapPoint[];
    setPoints(pts);
    onPointsLoaded?.(pts);
    setLoading(false);
  }, [activeProject, onPointsLoaded]);

  useEffect(() => { loadPoints(); }, [loadPoints]);

  // Inicializar mapa (depende do projeto activo para o centro inicial)
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !activeProject) return;
    let cancelled = false;

    const geoPromise = isPF17A
      ? fetch("/pf17a_alignment.geojson").then((r) => r.json()).catch(() => null)
      : Promise.resolve(null);

    Promise.all([import("leaflet"), geoPromise]).then(([L, geoData]) => {
      if (cancelled || !containerRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      // Resolver centro inicial
      const initialCenter: [number, number] =
        activeProject.map_center_lat != null && activeProject.map_center_lng != null
          ? [Number(activeProject.map_center_lat), Number(activeProject.map_center_lng)]
          : isPF17A
          ? [38.55, -8.83]
          : DEFAULT_CENTER;
      const initialZoom = activeProject.map_default_zoom ?? (isPF17A ? 12 : DEFAULT_ZOOM);

      const map = L.map(containerRef.current!, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = { map, L, geoData };
      setMapReady(true);

      // Auto-fit ao traçado se existir — mostra a obra inteira de uma vez
      const alignLine = (geoData as any)?.features?.find(
        (f: any) => f.properties?.type === "railway_alignment"
      );
      if (alignLine?.geometry?.coordinates?.length > 1) {
        const coords = alignLine.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]);
        setTimeout(() => map.fitBounds(L.latLngBounds(coords), { padding: [48, 48], maxZoom: 15 }), 100);
        return;
      }

      // Se não há traçado mas há centro definido, usar esse
      if (activeProject.map_center_lat != null) return;

      // Fallback: geolocalização do utilizador
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!mapRef.current) return;
            const { map: m, L: leaf } = mapRef.current;
            m.setView([pos.coords.latitude, pos.coords.longitude], 14);
            const icon = leaf.divIcon({
              html: userMarkerSvg(),
              className: "",
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });
            userMarkerRef.current = leaf.marker([pos.coords.latitude, pos.coords.longitude], { icon })
              .addTo(m)
              .bindTooltip(t("map.youAreHere", { defaultValue: "A sua localização" }));
          },
          () => { /* utilizador negou — fica no default */ },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
        );
      }
    });

    return () => {
      cancelled = true;
      if (mapRef.current?.map) {
        mapRef.current.map.remove();
        mapRef.current = null;
        setMapReady(false);
      }
    };
  }, [activeProject?.id, isPF17A]); // eslint-disable-line react-hooks/exhaustive-deps

  // Camadas do traçado + PKs (só PF17A para já)
  const alignmentLayerRef = useRef<any>(null);
  const pkLayersRef = useRef<any[]>([]);
  const sectorLayersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const { map, L, geoData } = mapRef.current;

    if (alignmentLayerRef.current) { alignmentLayerRef.current.remove(); alignmentLayerRef.current = null; }
    pkLayersRef.current.forEach((l) => l.remove()); pkLayersRef.current = [];
    sectorLayersRef.current.forEach((l) => l.remove()); sectorLayersRef.current = [];

    const features = (geoData as any)?.features ?? [];
    if (features.length === 0) return;

    if (showAlignment) {
      // Traçado principal — halo + linha sólida
      const lineFeature = features.find((f: any) => f.properties?.type === "railway_alignment");
      if (lineFeature) {
        const coords = lineFeature.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]);
        L.polyline(coords, { color: "#5b8dd9", weight: 10, opacity: 0.15 }).addTo(map);
        const polyline = L.polyline(coords, { color: "#185FA5", weight: 4, opacity: 0.9 }).addTo(map);
        polyline.bindTooltip("Linha do Sul — PF17A (PK 29+730 a 33+700)", { sticky: true });
        alignmentLayerRef.current = polyline;
      }

      // Linha RO-RO T1 — tracejada cinza/azul (ramal Porto Setúbal)
      const roroFeature = features.find((f: any) => f.properties?.type === "linha_aux");
      if (roroFeature) {
        const coords = roroFeature.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]);
        const l = L.polyline(coords, { color: "#4a7fb5", weight: 2.5, opacity: 0.7, dashArray: "6 4" }).addTo(map);
        l.bindTooltip(roroFeature.properties.name, { sticky: true });
        sectorLayersRef.current.push(l);
      }

      // Estruturas notáveis (AMV, PN, OA, PSR, estações, etc.)
      const STRUCT_ICONS: Record<string, { bg: string; label: string }> = {
        amv:         { bg: "#7C3AED", label: "AMV" },
        supressao_pn:{ bg: "#DC2626", label: "PN"  },
        obra_arte:   { bg: "#059669", label: "OA"  },
        psr:         { bg: "#D97706", label: "PSR" },
        estacao:     { bg: "#1D4ED8", label: "EST" },
        terminal:    { bg: "#0F766E", label: "TRM" },
        estrutura:   { bg: "#6B7280", label: "EST" },
        linha_aux:   { bg: "#4a7fb5", label: "LX"  },
      };
      features.filter((f: any) => {
        const t = f.properties?.type;
        return Object.keys(STRUCT_ICONS).includes(t) && f.geometry?.type === "Point";
      }).forEach((f: any) => {
        const [lon, lat] = f.geometry.coordinates;
        const cfg = STRUCT_ICONS[f.properties.type] ?? { bg: "#666", label: "•" };
        const icon = L.divIcon({
          html: `<div style="background:${cfg.bg};color:white;font-size:8px;font-weight:800;padding:2px 5px;border-radius:3px;white-space:nowrap;border:1.5px solid rgba(255,255,255,0.4);box-shadow:0 2px 6px rgba(0,0,0,.35);font-family:system-ui">${cfg.label}</div>`,
          className: "",
          iconSize: [34, 18],
          iconAnchor: [17, 9],
        });
        const m = L.marker([lat, lon], { icon })
          .bindPopup(`<div style="padding:10px 12px;font-family:system-ui;min-width:200px">
            <p style="font-size:9px;font-weight:700;text-transform:uppercase;color:${cfg.bg};margin:0 0 4px;letter-spacing:.08em">${f.properties.categoria ?? f.properties.type}</p>
            <p style="font-size:12px;font-weight:700;color:#111;margin:0 0 2px">${f.properties.name}</p>
            ${f.properties.code ? `<p style="font-size:10px;color:#888;margin:0;font-family:monospace">${f.properties.code}</p>` : ""}
          </div>`)
          .addTo(map);
        sectorLayersRef.current.push(m);
      });
    }

    if (showPKs) {
      features.filter((f: any) => f.properties?.type === "pk_marker").forEach((f: any) => {
        const [lon, lat] = f.geometry.coordinates;
        const pk = f.properties.pk;
        const isKey = [29.73, 31.67, 33.7].includes(pk); // PKs âncora — destaque
        const icon = L.divIcon({
          html: `<div style="background:${isKey ? "#DC2626" : "#192F48"};color:white;font-size:${isKey ? "9.5" : "8.5"}px;font-weight:700;padding:2px 6px;border-radius:3px;white-space:nowrap;border:1px solid ${isKey ? "#ef4444" : "#2a4a6b"};box-shadow:0 1px 4px rgba(0,0,0,.3);font-family:system-ui,monospace">PK ${f.properties.name.replace("PK ","")}</div>`,
          className: "",
          iconSize: [72, 20],
          iconAnchor: [36, 10],
        });
        const m = L.marker([lat, lon], { icon })
          .bindTooltip(`<b>${f.properties.name}</b><br>${f.properties.local}`, { direction: "top", offset: [0, -14] })
          .addTo(map);
        pkLayersRef.current.push(m);
      });
    }

    features.filter((f: any) => f.properties?.type === "sector").forEach((f: any) => {
      const [lon, lat] = f.geometry.coordinates;
      const icon = L.divIcon({
        html: sectorMarkerSvg("#185FA5"),
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const m = L.marker([lat, lon], { icon })
        .bindPopup(`<div style="padding:8px 10px;font-family:system-ui;min-width:200px">
          <p style="font-size:9px;font-weight:700;text-transform:uppercase;color:#185FA5;margin:0 0 4px;letter-spacing:.08em">Sector WBS</p>
          <p style="font-size:12px;font-weight:700;color:#111;margin:0">${f.properties.name}</p>
          <p style="font-size:10px;color:#888;margin:4px 0 0">PK ${f.properties.pk} (aprox.)</p>
        </div>`)
        .addTo(map);
      sectorLayersRef.current.push(m);
    });
  }, [mapReady, showAlignment, showPKs]);

  // Marcadores de dados reais
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const { map, L } = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const visible = points.filter((p) => activeFilters.has(p.entity_type));
    if (visible.length === 0) return;

    const bounds: [number, number][] = [];

    visible.forEach((point) => {
      const color = statusColor(point.entity_type, point.status);
      const label =
        point.entity_type === "non_conformity" ? "NC" :
        point.entity_type === "ppi" ? "PPI" :
        point.entity_type === "test_result" ? "ENS" : "WI";

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

      markersRef.current.set(`${point.entity_type}-${point.id}`, marker);
      bounds.push([point.latitude, point.longitude]);
    });

    // Só ajusta os limites automaticamente se NÃO há centro definido pelo projeto
    const hasProjectCenter = activeProject?.map_center_lat != null;
    if (!hasProjectCenter) {
      if (bounds.length === 1) map.setView(bounds[0], 15);
      else if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 16 });
    }
  }, [points, activeFilters, mapReady, activeProject?.map_center_lat]);

  const centreOnProject = () => {
    if (!mapRef.current || !activeProject) return;
    const { map, L, geoData } = mapRef.current as any;

    // Prioridade 1: fitBounds ao traçado se existir
    const features = (geoData as any)?.features ?? [];
    const line = features.find((f: any) => f.properties?.type === "railway_alignment");
    if (line && line.geometry?.coordinates?.length > 1) {
      const coords = line.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]);
      map.fitBounds(L.latLngBounds(coords), { padding: [48, 48], maxZoom: 15 });
      return;
    }

    // Prioridade 2: centro configurado no projecto
    if (activeProject.map_center_lat != null && activeProject.map_center_lng != null) {
      map.setView(
        [Number(activeProject.map_center_lat), Number(activeProject.map_center_lng)],
        activeProject.map_default_zoom ?? 13,
      );
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  };

  const locateUser = () => {
    if (!mapRef.current || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { map, L } = mapRef.current!;
        map.setView([pos.coords.latitude, pos.coords.longitude], 15);
        if (userMarkerRef.current) userMarkerRef.current.remove();
        const icon = L.divIcon({
          html: userMarkerSvg(),
          className: "",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        userMarkerRef.current = L.marker([pos.coords.latitude, pos.coords.longitude], { icon })
          .addTo(map)
          .bindTooltip(t("map.youAreHere", { defaultValue: "A sua localização" }));
      },
      () => { /* ignorar */ },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  useImperativeHandle(ref, () => ({
    focusPoint: (point: MapPoint) => {
      if (!mapRef.current) return;
      const { map } = mapRef.current;
      map.setView([point.latitude, point.longitude], 17);
      const m = markersRef.current.get(`${point.entity_type}-${point.id}`);
      if (m) m.openPopup();
    },
    refresh: () => loadPoints(),
  }), [loadPoints]);

  const typeCounts = Object.fromEntries(
    (["work_item", "non_conformity", "ppi", "test_result"] as const).map((type) => [
      type, points.filter((p) => p.entity_type === type).length,
    ])
  );

  return (
    <Card className={cn("overflow-hidden border border-border/60", className)}>
      {showControls && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/20 flex-wrap">
          {isPF17A && (
            <>
              <Train className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <button
                onClick={() => setShowAlignment((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all",
                  showAlignment ? "text-white border-transparent" : "bg-transparent border-border text-muted-foreground opacity-50"
                )}
                style={showAlignment ? { backgroundColor: "#185FA5" } : {}}
              >
                {t("map.alignment", { defaultValue: "Traçado" })}
              </button>
              <button
                onClick={() => setShowPKs((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all",
                  showPKs ? "bg-foreground text-background border-foreground" : "bg-transparent border-border text-muted-foreground opacity-50"
                )}
              >
                PKs
              </button>
              <div className="w-px h-4 bg-border/60 mx-0.5" />
            </>
          )}

          <Layers className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          {(["work_item", "non_conformity", "ppi", "test_result"] as const).map((type) => {
            const cfg = TYPE_CONFIG[type];
            const count = typeCounts[type] ?? 0;
            const active = activeFilters.has(type);
            return (
              <button
                key={type}
                onClick={() => setActiveFilters((prev) => {
                  const next = new Set(prev);
                  if (next.has(type)) next.delete(type); else next.add(type);
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
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2.5" onClick={locateUser} title={t("map.locate", { defaultValue: "A minha localização" })}>
              <Locate className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2.5" onClick={centreOnProject}>
              <Navigation className="h-3 w-3" />
              <span className="hidden sm:inline">{activeProject?.code ?? t("map.centre", { defaultValue: "Centro" })}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={loadPoints} title={t("common.refresh", { defaultValue: "Actualizar" })}>
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
              ? t("map.pointsCount", {
                  defaultValue: "{{visible}}/{{total}} pontos visíveis",
                  visible: points.filter((p) => activeFilters.has(p.entity_type)).length,
                  total: points.length,
                })
              : t("map.noPointsShort", { defaultValue: "Sem coordenadas — adicione GPS nos formulários" })}
          </span>
          <span className="text-[10px] text-muted-foreground">© OpenStreetMap</span>
        </div>
      )}
    </Card>
  );
});
