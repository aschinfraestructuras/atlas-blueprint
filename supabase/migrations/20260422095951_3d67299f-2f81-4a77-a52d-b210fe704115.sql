-- Apagar notificações lixo / de teste (título com formato técnico)
DELETE FROM public.notifications
WHERE title LIKE 'planning_due:%'
   OR title LIKE 'test_%'
   OR link_entity_type = 'planning_due';

-- Apagar notificações órfãs cujo activity já não existe ou foi soft-deleted
DELETE FROM public.notifications n
WHERE n.link_entity_type = 'activity'
  AND NOT EXISTS (
    SELECT 1 FROM public.planning_activities pa
    WHERE pa.id = n.link_entity_id AND COALESCE(pa.is_deleted, false) = false
  );

-- Apagar notificações órfãs cujo wbs já não existe
DELETE FROM public.notifications n
WHERE n.link_entity_type = 'wbs'
  AND NOT EXISTS (
    SELECT 1 FROM public.planning_wbs w
    WHERE w.id = n.link_entity_id
  );