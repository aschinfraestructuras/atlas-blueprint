-- Tabela de camadas do mapa por projecto
CREATE TABLE public.project_map_layers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('alignment','zones','structures','expropriation','utilities','environment','other')),
  file_path TEXT NOT NULL,
  file_format TEXT NOT NULL CHECK (file_format IN ('kmz','kml','geojson')),
  file_size_bytes BIGINT,
  geojson_cache JSONB,
  style JSONB NOT NULL DEFAULT '{"color":"#06b6d4","weight":3,"opacity":0.85,"fillOpacity":0.2}'::jsonb,
  visible_default BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  feature_count INTEGER,
  bounds JSONB,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pml_project ON public.project_map_layers(project_id) WHERE is_deleted = false;
CREATE INDEX idx_pml_order ON public.project_map_layers(project_id, display_order) WHERE is_deleted = false;

ALTER TABLE public.project_map_layers ENABLE ROW LEVEL SECURITY;

-- Membros do projecto podem ver
CREATE POLICY "Project members can view map layers"
ON public.project_map_layers FOR SELECT
TO authenticated
USING (
  is_deleted = false
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_map_layers.project_id
      AND pm.user_id = (select auth.uid())
  )
);

-- Admins e gestores podem inserir
CREATE POLICY "Admins and managers can insert map layers"
ON public.project_map_layers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_map_layers.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('admin','manager')
  )
);

-- Admins e gestores podem actualizar
CREATE POLICY "Admins and managers can update map layers"
ON public.project_map_layers FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_map_layers.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('admin','manager')
  )
);

-- Trigger updated_at
CREATE TRIGGER update_project_map_layers_updated_at
BEFORE UPDATE ON public.project_map_layers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket de storage (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('map-layers', 'map-layers', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: paths no formato {project_id}/{layer_id}.{ext}
CREATE POLICY "Project members can read map layer files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'map-layers'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = (storage.foldername(name))[1]
      AND pm.user_id = (select auth.uid())
  )
);

CREATE POLICY "Admins and managers can upload map layer files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'map-layers'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = (storage.foldername(name))[1]
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('admin','manager')
  )
);

CREATE POLICY "Admins and managers can update map layer files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'map-layers'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = (storage.foldername(name))[1]
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('admin','manager')
  )
);

CREATE POLICY "Admins and managers can delete map layer files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'map-layers'
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id::text = (storage.foldername(name))[1]
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('admin','manager')
  )
);