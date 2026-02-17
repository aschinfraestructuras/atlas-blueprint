# 04 — ENTITY MAP

## Diagrama de Entidades e Relações

```
organization 1──* project
organization 1──* supplier

project 1──* project_member
project 1──* document
project 1──* test_sample
project 1──* itp
project 1──* nonconformity
project 1──* audit
project 1──* survey
project 1──* work_start_checklist
project 1──* material_approval
project 1──* mix_design

document 1──* document_version
document_version 1──* attachment

test_type 1──* test_result
test_sample 1──* test_result
test_sample *──1 supplier              (origem do material)
test_result *──0..1 attachment          (relatório de ensaio)

itp 1──* itp_checkpoint
itp_checkpoint 1──* itp_record
itp_record *──0..* test_result          (ensaios vinculados)
itp_record *──0..* nonconformity        (NC aberta a partir da inspeção)
itp_record *──0..* attachment           (fotos)

nonconformity 1──* corrective_action
nonconformity *──0..* attachment
corrective_action *──0..* attachment

audit 1──* audit_finding
audit_finding *──0..1 nonconformity     (constatação gera NC)

supplier 1──* supplier_evaluation
supplier 1──* attachment               (certificados, seguros)

survey *──1 project
survey *──0..* attachment

work_start_checklist *──0..* material_approval
work_start_checklist *──0..* mix_design

mix_design *──0..* test_result          (ensaios do estudo)

project_member *──1 user (auth.users)
project_member.role ∈ {admin, quality_manager, quality_tech, site_manager, lab_tech, surveyor, inspector, viewer}
```

## Entidades Detalhadas

### organization
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| name | text | |
| tax_id | text | NIF / CIF |
| country | text | PT, ES |
| created_at | timestamptz | |

### project
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | |
| code | text | Código interno da obra |
| name | text | |
| location | text | |
| status | text | draft, active, completed, archived |
| start_date | date | |
| end_date | date | |
| created_at | timestamptz | |

### project_member
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| user_id | uuid FK → auth.users | |
| role | text | Ver lista de roles |
| created_at | timestamptz | |

### document
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| code | text | Codificação documental (ex.: PQ-001) |
| title | text | |
| category | text | procedure, record, plan, form, external |
| status | text | Ver state machine |
| current_version | int | |
| created_by | uuid FK | |
| created_at | timestamptz | |

### document_version
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| document_id | uuid FK | |
| version_number | int | |
| file_path | text | Storage path |
| changelog | text | |
| uploaded_by | uuid FK | |
| created_at | timestamptz | |

### test_type
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| code | text | PROCTOR_MOD, DENSITY_INSITU, CBR, etc. |
| name_pt | text | |
| name_es | text | |
| norm_reference | text | EN, ASTM, LNEC |
| parameters | jsonb | Schema dos campos de resultado |
| acceptance_criteria | jsonb | Regras de conformidade |

### test_sample
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| code | text | Código da amostra |
| material_type | text | Solo, agregado, betão, betuminoso |
| origin | text | Frente de obra, central, pedreira |
| supplier_id | uuid FK nullable | |
| collected_at | timestamptz | |
| collected_by | uuid FK | |
| location_description | text | PK, camada, zona |

### test_result
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| test_sample_id | uuid FK | |
| test_type_id | uuid FK | |
| project_id | uuid FK | |
| results | jsonb | Valores conforme schema do test_type |
| is_conforming | boolean | Calculado |
| performed_at | date | |
| performed_by | uuid FK | |
| lab_name | text | Laboratório responsável |
| status | text | draft, validated, rejected |
| notes | text | |
| created_at | timestamptz | |

### itp
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| code | text | |
| title | text | Atividade (ex.: Aterro em solo) |
| status | text | draft, active, completed |
| created_by | uuid FK | |
| created_at | timestamptz | |

### itp_checkpoint
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| itp_id | uuid FK | |
| seq | int | Ordem |
| description | text | O que verificar |
| control_type | text | witness, hold, review, record |
| frequency | text | each_layer, daily, per_lot, once |
| responsible_role | text | Quem executa |
| test_type_id | uuid FK nullable | Ensaio associado |

### itp_record
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| itp_checkpoint_id | uuid FK | |
| project_id | uuid FK | |
| status | text | pending, passed, failed, na |
| inspector_id | uuid FK | |
| inspected_at | timestamptz | |
| notes | text | |
| signature_contractor | text | |
| signature_inspector | text | |

### nonconformity
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| code | text | NC-001 |
| title | text | |
| description | text | |
| severity | text | minor, major, critical |
| origin | text | inspection, audit, test, complaint |
| origin_ref_id | uuid nullable | itp_record, audit_finding, test_result |
| status | text | Ver state machine |
| detected_by | uuid FK | |
| detected_at | timestamptz | |
| closed_at | timestamptz nullable | |
| root_cause_analysis | text | |

### corrective_action
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| nonconformity_id | uuid FK | |
| type | text | corrective, preventive, correction |
| description | text | |
| responsible_id | uuid FK | |
| due_date | date | |
| status | text | open, in_progress, implemented, verified, overdue |
| completed_at | timestamptz nullable | |
| verified_by | uuid FK nullable | |

### audit
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| code | text | AUD-2025-001 |
| type | text | internal, external, surveillance |
| scope | text | |
| scheduled_date | date | |
| performed_date | date nullable | |
| lead_auditor_id | uuid FK | |
| status | text | Ver state machine |
| summary | text | |

### audit_finding
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| audit_id | uuid FK | |
| seq | int | |
| type | text | conformity, observation, minor_nc, major_nc |
| clause_reference | text | Cláusula normativa |
| description | text | |
| nonconformity_id | uuid FK nullable | NC gerada |

### supplier
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | |
| name | text | |
| tax_id | text | |
| type | text | supplier, subcontractor, lab |
| status | text | pending, qualified, suspended, blocked |
| qualified_until | date nullable | |

### supplier_evaluation
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| supplier_id | uuid FK | |
| project_id | uuid FK nullable | |
| period | text | 2025-Q1 |
| score | numeric | 0-100 |
| criteria | jsonb | Detalhe por critério |
| evaluated_by | uuid FK | |
| evaluated_at | timestamptz | |

### survey
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| type | text | implantation, as_built, control |
| description | text | |
| performed_at | date | |
| performed_by | uuid FK | |
| notes | text | |

### work_start_checklist
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| activity | text | Atividade a iniciar |
| status | text | draft, pending_approval, approved, rejected |
| created_by | uuid FK | |
| approved_by | uuid FK nullable | |
| created_at | timestamptz | |

### material_approval
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| checklist_id | uuid FK nullable | |
| material_description | text | |
| supplier_id | uuid FK nullable | |
| status | text | pending, approved, rejected |
| approved_by | uuid FK nullable | |

### mix_design
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| checklist_id | uuid FK nullable | |
| type | text | concrete, asphalt, soil_cement |
| code | text | |
| description | text | |
| formula | jsonb | Composição |
| status | text | draft, submitted, approved, rejected |
| approved_by | uuid FK nullable | |

### attachment
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| entity_type | text | Tabela de origem |
| entity_id | uuid | PK da entidade |
| file_path | text | Storage path |
| file_name | text | |
| mime_type | text | |
| uploaded_by | uuid FK | |
| uploaded_at | timestamptz | |
