-- Gustavo no topo — Paulo reporta a Gustavo — José reporta a Paulo
UPDATE public.project_workers SET reports_to = NULL, org_order = 0
  WHERE id = '05ea9797-b958-4dae-9187-08f4e010d388'; -- Gustavo

UPDATE public.project_workers SET reports_to = '05ea9797-b958-4dae-9187-08f4e010d388', org_order = 1
  WHERE id = 'd7a6f984-2027-4712-a3fb-659cc62b1058'; -- Paulo → reporta a Gustavo

UPDATE public.project_workers SET reports_to = 'd7a6f984-2027-4712-a3fb-659cc62b1058', org_order = 2
  WHERE id = 'bb444415-f7d1-49f1-896b-f2930159fa73'; -- José → reporta a Paulo;
