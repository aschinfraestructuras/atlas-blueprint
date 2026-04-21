-- Apaga notificações lixo: alertas de prazos com títulos mal-formatados
-- (formato técnico "planning_due: ..." nunca devia ter sido exposto ao utilizador).
DELETE FROM public.notifications
WHERE title LIKE 'planning_due:%'
   OR link_entity_type = 'planning_due';

-- Apaga notificações órfãs cujo link_entity_id já não existe em planning_activities.
DELETE FROM public.notifications n
WHERE n.link_entity_type = 'activity'
  AND NOT EXISTS (
    SELECT 1 FROM public.planning_activities pa
    WHERE pa.id = n.link_entity_id AND COALESCE(pa.is_deleted, false) = false
  );