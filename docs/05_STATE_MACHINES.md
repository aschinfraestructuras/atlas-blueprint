# 05 — STATE MACHINES (Workflows)

## 1. Documento (`document.status`)

```
                  ┌──────────┐
                  │  draft   │
                  └────┬─────┘
                       │ submit
                  ┌────▼──────────┐
                  │ in_review     │
                  └──┬────────┬───┘
           approve │        │ reject
            ┌──────▼──┐  ┌──▼───────┐
            │ approved │  │ rejected │
            └──────┬──┘  └────┬─────┘
                   │          │ revise (→ nova version)
                   │     ┌────▼─────┐
                   │     │  draft   │ (nova versão)
                   │     └──────────┘
            obsolete│
            ┌──────▼────┐
            │ obsolete   │
            └────────────┘
```

**Transições permitidas:**
| De | Para | Ação | Quem |
|---|---|---|---|
| draft | in_review | submit | author |
| in_review | approved | approve | quality_manager, admin |
| in_review | rejected | reject | quality_manager, admin |
| rejected | draft | revise | author |
| approved | obsolete | obsolete | quality_manager, admin |

---

## 2. Resultado de Ensaio (`test_result.status`)

```
  ┌────────┐
  │ draft  │
  └───┬────┘
      │ submit
  ┌───▼──────┐
  │ pending  │
  └──┬────┬──┘
     │    │
validate  reject
     │    │
┌────▼──┐ ┌──▼───────┐
│validated│ │ rejected │
└────────┘ └────┬─────┘
                │ revise
           ┌────▼─────┐
           │  draft   │
           └──────────┘
```

**Transições:**
| De | Para | Ação | Quem |
|---|---|---|---|
| draft | pending | submit | lab_tech, quality_tech |
| pending | validated | validate | quality_manager |
| pending | rejected | reject | quality_manager |
| rejected | draft | revise | lab_tech, quality_tech |

---

## 3. PPI — Registo de Inspeção (`itp_record.status`)

```
  ┌─────────┐
  │ pending │
  └──┬───┬──┘
     │   │
  pass  fail
     │   │
┌────▼┐ ┌▼──────┐
│passed│ │failed │──── abre NC
└─────┘ └───┬───┘
             │ re-inspect
        ┌────▼────┐
        │ pending │
        └─────────┘

  Qualquer → na (não aplicável)
```

**Transições:**
| De | Para | Ação | Quem |
|---|---|---|---|
| pending | passed | pass | quality_tech, inspector |
| pending | failed | fail | quality_tech, inspector |
| failed | pending | re-inspect | quality_tech |
| * | na | set_na | quality_manager |

**Regra:** Ao transitar para `failed`, o sistema sugere criação de NC.

---

## 4. Não-Conformidade (`nonconformity.status`)

```
  ┌────────┐
  │  open  │
  └───┬────┘
      │ analyze
  ┌───▼──────────┐
  │ under_analysis│
  └───┬──────────┘
      │ define_actions
  ┌───▼──────────────┐
  │ action_planned   │
  └───┬──────────────┘
      │ all actions implemented
  ┌───▼──────────────────┐
  │ pending_verification │
  └───┬──────────────────┘
      │ verify_effectiveness
  ┌───▼────┐     ┌────────────┐
  │ closed │     │ reopened   │
  └────────┘     └─────┬──────┘
                       │ (volta a under_analysis)
```

**Transições:**
| De | Para | Ação | Quem |
|---|---|---|---|
| open | under_analysis | analyze | quality_tech, quality_manager |
| under_analysis | action_planned | define_actions | quality_manager |
| action_planned | pending_verification | all_implemented | quality_tech |
| pending_verification | closed | verify_ok | quality_manager |
| pending_verification | reopened | verify_nok | quality_manager |
| reopened | under_analysis | re-analyze | quality_manager |

---

## 5. Auditoria (`audit.status`)

```
  ┌───────────┐
  │ planned   │
  └────┬──────┘
       │ start
  ┌────▼──────┐
  │ in_progress│
  └────┬──────┘
       │ complete
  ┌────▼──────────┐
  │ report_draft  │
  └────┬──────────┘
       │ approve_report
  ┌────▼──────┐
  │ completed │
  └────┬──────┘
       │ follow_up_done
  ┌────▼──────┐
  │ closed    │
  └───────────┘
```

**Transições:**
| De | Para | Ação | Quem |
|---|---|---|---|
| planned | in_progress | start | lead_auditor |
| in_progress | report_draft | complete | lead_auditor |
| report_draft | completed | approve_report | quality_manager |
| completed | closed | follow_up_done | quality_manager |

---

## 6. Ação Corretiva (`corrective_action.status`)

```
  ┌──────┐
  │ open │
  └──┬───┘
     │ start
  ┌──▼───────────┐
  │ in_progress  │
  └──┬───────────┘
     │ implement
  ┌──▼────────────┐
  │ implemented   │
  └──┬────────────┘
     │ verify
  ┌──▼────────┐    ┌─────────┐
  │ verified  │    │ overdue │ (automático por data)
  └───────────┘    └─────────┘
```

---

## 7. Fornecedor (`supplier.status`)

```
  ┌──────────┐
  │ pending  │
  └────┬─────┘
       │ qualify
  ┌────▼───────┐
  │ qualified  │
  └──┬─────┬───┘
     │     │ suspend
  block  ┌─▼──────────┐
     │   │ suspended  │
  ┌──▼───┤            │
  │blocked│ requalify │
  └──────┘└────┬──────┘
               │
          ┌────▼──────┐
          │ qualified │
          └───────────┘
```

---

## 8. Checklist de Início de Trabalhos (`work_start_checklist.status`)

```
  draft → pending_approval → approved
                           → rejected → draft
```

## 9. Aprovação de Material (`material_approval.status`)

```
  pending → approved
          → rejected
```

## 10. Estudo de Composição (`mix_design.status`)

```
  draft → submitted → approved
                    → rejected → draft
```
