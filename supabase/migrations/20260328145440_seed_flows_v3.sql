-- [1] AUDITORIAS
INSERT INTO public.quality_audits
  (id,project_id,code,audit_type,status,planned_date,completed_date,
   auditor_name,scope,findings,observations,nc_count,obs_count,report_ref,created_by)
VALUES
  ('ee000001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001',
   'AI-PF17A-2026-001','internal','completed','2026-02-10','2026-02-10',
   'José Antunes',
   'Controlo de qualidade — módulo betão e obras de arte. PPIs, betonagem e rastreabilidade.',
   'NC-001: Temperatura de amassada não registada em 3 betonagens C30/37 de Janeiro. NC-002: Guia lote BET-C25-2026-001 sem assinatura de recepção.',
   'Sistema implementado. Ocorrências administrativas sem impacto estrutural.',
   2,1,'RAI-PF17A-2026-001','4d4bd489-7cbd-449e-af76-d10ab456d6a3'),

  ('ee000001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001',
   'AE-PF17A-2026-001','external','in_progress','2026-03-25',NULL,
   'Eng. Fernanda Costa (IP — Fiscalização)',
   'Auditoria semestral PQO. Foco: rastreabilidade materiais ferroviários, qualificação subempreiteiros, PPIs.',
   NULL,'Em curso. Documentação solicitada: PAME carril, CRFPs Railworks, registos soldadura T1-T2.',
   0,0,NULL,'4d4bd489-7cbd-449e-af76-d10ab456d6a3'),

  ('ee000001-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-000000000001',
   'AI-PF17A-2026-002','internal','planned','2026-04-15',NULL,
   'José Antunes',
   'Auditoria soldaduras aluminotérmicas Termoweld. Certificações, equipamentos, US, EN 14730-1.',
   NULL,NULL,0,0,NULL,'4d4bd489-7cbd-449e-af76-d10ab456d6a3');

-- [2] FORMANDOS na 1ª sessão
INSERT INTO public.training_attendees (id,session_id,name,role_function,company,signed)
SELECT
  ('ee000002-0001-0001-0001-0000000000' || LPAD(rn::text,2,'0'))::uuid,
  ts.id, a.nome, a.funcao, a.empresa, a.assinou
FROM (SELECT id FROM public.training_sessions WHERE project_id='aaaaaaaa-0001-0001-0001-000000000001' ORDER BY session_date LIMIT 1) ts
CROSS JOIN (VALUES
  (1,'José Manuel Rodrigues','Soldador Aluminotérmico','Termoweld, Lda',true),
  (2,'André Sousa Lima','Soldador Aluminotérmico','Termoweld, Lda',true),
  (3,'Miguel Costa Pinto','Técnico END','Termoweld, Lda',true),
  (4,'Carlos Alberto Moura','Chefe Equipa Via','Railworks Portugal, SA',true),
  (5,'Rui Filipe Carvalho','Operador Máquinas','Railworks Portugal, SA',true),
  (6,'Pedro Augusto Lemos','Eng. Catenária','ElecoRail, Unipessoal',false),
  (7,'José Antunes','Técnico de Qualidade','ASCH Infraestructuras',true)
) AS a(rn,nome,funcao,empresa,assinou);

-- [3] PARTES DIÁRIOS
INSERT INTO public.daily_reports
  (id,project_id,report_date,report_number,status,work_item_id,
   temperature_min,temperature_max,weather,created_by)
VALUES
  ('ee000003-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001',
   '2026-03-10','DR-2026-03-10-001','submitted',
   '28ad74d9-7ed8-4a1a-af76-a5d318a229dc',9,17,'ensolarado','4d4bd489-7cbd-449e-af76-d10ab456d6a3'),
  ('ee000003-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001',
   '2026-03-11','DR-2026-03-11-001','submitted',
   '28ad74d9-7ed8-4a1a-af76-a5d318a229dc',8,15,'nublado','4d4bd489-7cbd-449e-af76-d10ab456d6a3'),
  ('ee000003-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-000000000001',
   '2026-03-17','DR-2026-03-17-001','submitted',
   '99b7c21b-fbfc-41fd-b9f9-ada64d20da72',11,18,'ensolarado','4d4bd489-7cbd-449e-af76-d10ab456d6a3'),
  ('ee000003-0001-0001-0001-000000000004','aaaaaaaa-0001-0001-0001-000000000001',
   '2026-03-24','DR-2026-03-24-001','draft',
   '99b7c21b-fbfc-41fd-b9f9-ada64d20da72',10,16,'chuvoso','4d4bd489-7cbd-449e-af76-d10ab456d6a3');

INSERT INTO public.daily_report_labour (daily_report_id,category,name,time_start,time_end,hours_worked) VALUES
  ('ee000003-0001-0001-0001-000000000001','Encarregado','Pedro Marques','07:30','17:00',9.0),
  ('ee000003-0001-0001-0001-000000000001','Pedreiro','António Figueiredo','07:30','17:00',9.0),
  ('ee000003-0001-0001-0001-000000000001','Servente','Manuel Correia','07:30','17:00',9.0),
  ('ee000003-0001-0001-0001-000000000001','Técnico Qualidade','José Antunes','08:00','17:00',8.5),
  ('ee000003-0001-0001-0001-000000000001','Soldador','José Manuel Rodrigues','07:30','13:00',5.5),
  ('ee000003-0001-0001-0001-000000000002','Encarregado','Pedro Marques','07:30','17:00',9.0),
  ('ee000003-0001-0001-0001-000000000002','Pedreiro','António Figueiredo','07:30','17:00',9.0),
  ('ee000003-0001-0001-0001-000000000002','Servente','Manuel Correia','07:30','12:00',4.5),
  ('ee000003-0001-0001-0001-000000000003','Chefe Equipa Via','Carlos Alberto Moura','07:00','17:30',10.0),
  ('ee000003-0001-0001-0001-000000000003','Operador Máquinas','Rui Filipe Carvalho','07:00','17:30',10.0),
  ('ee000003-0001-0001-0001-000000000003','Técnico Qualidade','José Antunes','09:00','17:00',8.0),
  ('ee000003-0001-0001-0001-000000000004','Soldador','José Manuel Rodrigues','07:30','12:00',4.5),
  ('ee000003-0001-0001-0001-000000000004','Soldador','André Sousa Lima','07:30','12:00',4.5);

INSERT INTO public.daily_report_equipment (daily_report_id,designation,type,serial_number,sound_power_db,hours_worked) VALUES
  ('ee000003-0001-0001-0001-000000000001','Bomba betão Putzmeister BSA 1005','bomba_betao',NULL,102,6.0),
  ('ee000003-0001-0001-0001-000000000001','Vibrador agulha Ø50','vibrador',NULL,85,5.5),
  ('ee000003-0001-0001-0001-000000000002','Grua torre Liebherr 180 EC-H','grua',NULL,98,8.0),
  ('ee000003-0001-0001-0001-000000000003','Apiloadora Robel 73.51','apiloadora','ROBEL-2021-7351',108,10.0),
  ('ee000003-0001-0001-0001-000000000003','Hilux Rail-Road 4x4','veiculo_ferroviario','HLTX-RR-2023-044',95,10.0),
  ('ee000003-0001-0001-0001-000000000004','Gerador KSS-340','gerador_soldadura','KSS-2019-0340',82,4.5);

INSERT INTO public.daily_report_materials (daily_report_id,nomenclature,quantity,unit,lot_number,pame_reference,material_id,preliminary_storage,final_destination) VALUES
  ('ee000003-0001-0001-0001-000000000001','Betão C30/37 — EN 206',18.5,'m3','BET-C30-2026-001','PAME-04-001','4e0f6dae-525a-4704-b489-8219c81896a7','Central Cachofarra','OA-01 — Pilar P1'),
  ('ee000003-0001-0001-0001-000000000002','Aço A500 NR SD — Ø16',850.0,'kg','ACO-A500-2026-001','PAME-04-005','2c7e05be-164f-4ec2-8a62-f2125bb5d02c','Parque zona coberta A','OA-01 — Viga V1'),
  ('ee000003-0001-0001-0001-000000000003','Balastro granítico 25/50mm',42.0,'ton','BAL-2026-001','PAME-03-001','d08ae2b8-bb10-4a0e-a9b5-d65096163cc4','Estaleiro — pilha 1','PK 12+300 a 12+500');

-- [4] RELATÓRIO MENSAL Janeiro 2026
INSERT INTO public.monthly_quality_reports
  (id,project_id,code,reference_month,status,
   kpi_tests_pass_rate,kpi_nc_open,kpi_nc_closed_month,kpi_hp_approved,kpi_hp_total,
   kpi_mat_approved,kpi_mat_pending,kpi_ppi_completed,kpi_emes_expiring,
   observations,corrective_actions,next_month_plan,submitted_at,created_by)
VALUES
  ('ee000004-0001-0001-0001-000000000001',
   'aaaaaaaa-0001-0001-0001-000000000001',
   'RM-SGQ-PF17A-2026-01','2026-01-01','submitted',
   83.3,2,0,3,4,0,44,1,0,
   'Primeiro mês de actividade. PPI implantação aprovado. Betão C30/37 favorável aos 28d. Aço aprovado. 2 NCs administrativas.',
   'NC-ADM-001: Check-list betão com temperatura obrigatória. NC-ADM-002: Procedimento de assinatura de guias.',
   'Fevereiro: PPIs armação e cofragem. Auditoria interna betão. Submissão PAME carril.',
   '2026-02-05 10:30:00+00','4d4bd489-7cbd-449e-af76-d10ab456d6a3');

-- [5] RFIs (campos reais: subject, zone, recipient, deadline, response_deadline)
INSERT INTO public.rfis
  (id,project_id,code,subject,description,zone,priority,status,discipline,
   deadline,response_deadline,responded_at,response_text,
   recipient_name,created_by)
VALUES
  ('ee000005-0001-0001-0001-000000000001',
   'aaaaaaaa-0001-0001-0001-000000000001',
   'RFI-PF17A-2026-002',
   'Cobrimento armaduras — OA-01 vigas V1 a V4',
   'Clarificação cobrimento mínimo armaduras vigas V1-V4 (exposição XC4).',
   'OA-01 Obra de Arte','high','answered','betao',
   '2026-02-26','2026-02-26','2026-02-22',
   'Confirmado cnom=35mm para XC4, conforme NP EN 1992-1-1. Manter valor de projecto.',
   'IP — Fiscalização','4d4bd489-7cbd-449e-af76-d10ab456d6a3'),

  ('ee000005-0001-0001-0001-000000000002',
   'aaaaaaaa-0001-0001-0001-000000000001',
   'RFI-PF17A-2026-003',
   'Grau de carril desvios PK 14+800 — R260 ou R350HT?',
   'CE omisso para AMV no PK 14+800. Para AV recomenda-se R350HT. Condiciona encomenda urgente.',
   'PK 14+800','high','open','ferrovia',
   '2026-04-03','2026-04-03',NULL,NULL,
   'IP — Projectista','4d4bd489-7cbd-449e-af76-d10ab456d6a3');

-- [6] NOTIFICAÇÕES
INSERT INTO public.notifications
  (id,project_id,user_id,type,title,body,link_entity_type,link_entity_id,is_read)
VALUES
  ('ee000006-0001-0001-0001-000000000001',
   'aaaaaaaa-0001-0001-0001-000000000001','4d4bd489-7cbd-449e-af76-d10ab456d6a3',
   'warning','CRFP pendente — Railworks Portugal',
   'Tiago Nascimento Silva (Railworks) com CRFP pendente. Entrada em obra suspensa.',
   'subcontractor','c2149900-6008-43d9-9b5e-ed65e181916f',false),

  ('ee000006-0001-0001-0001-000000000002',
   'aaaaaaaa-0001-0001-0001-000000000001','4d4bd489-7cbd-449e-af76-d10ab456d6a3',
   'warning','RFI sem resposta — prazo 3 Abr',
   'RFI-PF17A-2026-003 (Grau carril PK 14+800) vence em 3 Abril. Sem resposta IP.',
   'rfi','ee000005-0001-0001-0001-000000000002',false),

  ('ee000006-0001-0001-0001-000000000003',
   'aaaaaaaa-0001-0001-0001-000000000001','4d4bd489-7cbd-449e-af76-d10ab456d6a3',
   'info','Auditoria IP em curso',
   'AE-PF17A-2026-001 em curso. Preparar: PAME carril, CRFPs Railworks, registos soldadura T1-T2.',
   'audit','ee000001-0001-0001-0001-000000000002',false),

  ('ee000006-0001-0001-0001-000000000004',
   'aaaaaaaa-0001-0001-0001-000000000001','4d4bd489-7cbd-449e-af76-d10ab456d6a3',
   'success','Avaliação Q1 aprovada — Hierros Ayala',
   'Score 91.0 (Aprovado). Melhor fornecedor do trimestre.',
   'supplier','b30b11e8-1fd3-4fcb-a1ba-2c6c1789b0ad',true),

  ('ee000006-0001-0001-0001-000000000005',
   'aaaaaaaa-0001-0001-0001-000000000001','4d4bd489-7cbd-449e-af76-d10ab456d6a3',
   'error','Lote betão em quarentena',
   'Lote BET-C25-2026-001 (Valeta V3): slump 215mm > máx 200mm. Aguardar resultado 7d.',
   'nc','c5000001-0000-0000-0000-000000000002',false);
