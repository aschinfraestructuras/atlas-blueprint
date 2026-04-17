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
      style="margin-top:10px;width:100%;padding:7px;background:${color};color:#fff;border:none;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;letter-spacing:.02em">
      Ver detalhe →
    </button>
  </div>`;
}

interface Props { height?: number; showControls?: boolean; className?: string; }

export function ProjectMap({ height = 480, showControls = true, className }: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const mapRef     = useRef<{ map: any; L: any } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const [points, setPoints]   = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
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

  // Inicializar mapa uma única vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [38.52, -8.89],
        zoom: 11,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = { map, L };
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

  // Actualizar marcadores
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

    if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    } else if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 16 });
    }
  }, [points, activeFilters, mapReady]);

  const centreMap = () => {
    if (!mapRef.current || markersRef.current.length === 0) return;
    const { map, L } = mapRef.current;
    const latlngs = markersRef.current.map(m => m.getLatLng());
    if (latlngs.length === 1) map.setView(latlngs[0], 15);
    else map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 16 });
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
          <Layers className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
            {t("map.filters", { defaultValue: "Camadas" })}
          </span>
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
                  active ? "text-white border-transparent" : "bg-transparent border-border text-muted-foreground opacity-50 hover:opacity-75"
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
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2.5" onClick={centreMap}>
              <Navigation className="h-3 w-3" />
              <span className="hidden sm:inline">{t("map.centre", { defaultValue: "Centrar" })}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={loadPoints}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="relative" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-card/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs text-muted-foreground">{t("map.loading", { defaultValue: "A carregar..." })}</p>
            </div>
          </div>
        )}
        {!loading && points.length === 0 && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-3 bg-card/95 backdrop-blur-sm">
            <Navigation className="h-10 w-10 text-muted-foreground/25" />
            <p className="text-sm font-medium text-muted-foreground">
              {t("map.noPoints", { defaultValue: "Sem pontos georreferenciados" })}
            </p>
            <p className="text-xs text-muted-foreground/60 text-center max-w-[260px]">
              {t("map.noPointsHint", { defaultValue: "Adicione coordenadas GPS nos formulários de Work Items, NCs, PPIs e Ensaios." })}
            </p>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {showControls && (
        <div className="px-4 py-2 border-t border-border/40 bg-muted/10 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {points.length > 0
              ? `${points.filter(p => activeFilters.has(p.entity_type)).length} de ${points.length} ${t("map.points", { defaultValue: "pontos visíveis" })}`
              : t("map.noPointsShort", { defaultValue: "Sem dados georref." })}
          </span>
          <span className="text-[10px] text-muted-foreground">
            © OpenStreetMap
          </span>
        </div>
      )}
    </Card>
  );
}
