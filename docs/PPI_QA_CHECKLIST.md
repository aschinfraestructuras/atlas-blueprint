# PPI Module — QA / Developer Validation Checklist

> **Stack**: React + TypeScript · Supabase (Postgres + RLS) · i18next (PT / ES)
>
> Run all steps while logged in as a **project member** (role `admin` recommended for full access).

---

## Prerequisites

1. **Create a project** (Projects page → "Novo Projeto"). Copy the project UUID.
2. **Ensure you are a project member** — the creator is automatically added as `admin`.
3. Switch language between **PT** and **ES** using the language toggle at any point to verify instant i18n switch with no hardcoded strings.

---

## Step 1 — Create Demo Templates

### Option A — Demo seed button (recommended for fast validation)

1. Navigate to `/ppi/templates`.
2. Click **"Criar templates demo"** (PT) / **"Crear plantillas demo"** (ES) — dashed-border button next to "Novo Template".
3. **Expected**:
   - Toast: `"Templates demo criados: PPI-EST-FOUND, PPI-DRN-PIPE"`
   - Two rows appear in the table: `PPI-EST-FOUND` (Estruturas, 8 items) and `PPI-DRN-PIPE` (Drenagem, 6 items).
4. Click the button a second time.
   - **Expected**: Toast `"Templates demo já existem: …"` (idempotent — no duplicates created).

### Option B — Manual template creation

1. Click **"Novo Template"**.
2. Fill in: Code = `PPI-TEST-001`, Title = any, Disciplina = Betão.
3. Add at least 2 items with unique `check_code` values.
4. Click **"Criar Template"**.
5. **Expected**: New row in the table. Edit button opens the form pre-filled.

---

## Step 2 — Create a PPI Instance from Template

### From the PPI Instances list (`/ppi`)

1. Click **"Nova Inspeção"**.
2. Select a **Work Item** (create one at `/work-items` if none exist).
3. Select template **PPI-EST-FOUND**.
4. Enter code: `PPI-000001`.
5. Click **"Criar Inspeção"**.
6. **Expected**:
   - Dialog closes.
   - Browser navigates to `/ppi/{id}` (instance detail).
   - Instance header shows: Code, Work Item, Disciplina = "Estruturas", Status = "Rascunho".
   - Checklist table shows **8 rows**, all with result **N/A**.

### From Work Items list (`/work-items`)

1. Hover over any row in the Work Items table.
2. Click the **ClipboardCheck icon** (Demo PPI button) — last icon before the trash icon.
3. **Expected**:
   - Spinner appears on that icon while creating.
   - Toast: `"Inspeção demo criada: PPI-DEMO-0001"`.
   - Browser navigates to the new instance detail page.
   - Checklist shows items cloned from the first active template.
4. **If no active template exists**:
   - Toast error: `"No active PPI templates found. Create demo templates first."`.

### From Work Item Detail (`/work-items/{id}`)

1. Open any Work Item detail page.
2. The **first tab** is now **"Inspeções PPI"**.
3. Click **"Criar PPI"** (in the tab header or the empty state button).
4. The `PPIInstanceFormDialog` opens with `work_item_id` pre-selected and **locked** (disabled select).
5. Select a template or leave blank. Enter a code. Click **"Criar Inspeção"**.
6. **Expected**:
   - New PPI appears in the PPI tab list.
   - Clicking it navigates to `/ppi/{id}`.

---

## Step 3 — Update Instance Items (Checklist)

1. Open `/ppi/{id}` (instance detail page).
2. For each checklist row, change **Result** from `N/A` to `PASS` or `FAIL`.
3. Add optional notes in the notes field.
4. Click **"Guardar Resultados"** (save button).
5. **Expected**:
   - Toast: `"Resultado guardado."` for each saved item.
   - Result badge updates colour: green (PASS), red (FAIL), grey (N/A).

---

## Step 4 — Status Workflow

| Current Status | Allowed Actions |
|---|---|
| `draft`       | → Start (in_progress) |
| `in_progress` | → Submit (submitted) |
| `submitted`   | → Approve (approved) / Reject (rejected) |
| `approved`    | → Archive (archived) |
| `rejected`    | → Archive (archived) |

1. On the instance detail page, click **"Iniciar Inspeção"** → status → `in_progress`.
2. Click **"Submeter para Aprovação"** → status → `submitted`.
3. Click **"Aprovar"** → status → `approved`. `closed_at` is set automatically.
4. **Expected at each step**:
   - Status badge updates immediately.
   - Toast: `"Estado alterado para …"`.
   - Irrelevant action buttons disappear (e.g., no "Approve" on an already-approved instance).

---

## Step 5 — Language Switch (PT ↔ ES)

At any step above, toggle the language:

- All table headers, buttons, status labels, discipline labels, and toast messages must switch **instantly**.
- No hardcoded strings should remain in Portuguese when ES is selected or vice-versa.
- **Disciplines**: `estruturas` → "Estructuras" / "Estruturas"; `drenagem` → "Drenaje" / "Drenagem".
- **Statuses**: `approved` → "Aprobado" / "Aprovado"; `in_progress` → "En Curso" / "Em Curso".
- **Results**: `pass` → "Conforme"; `fail` → "No Conforme" / "Não Conforme".

---

## Step 6 — RLS / Security Validation

### Cross-project isolation

1. Log in as **User A** (admin of Project A). Create a template and instance.
2. Log in as **User B** (not a member of Project A).
3. Attempt to access `/ppi` — only User B's own project instances should appear.
4. **Expected**: 0 rows from Project A. Supabase RLS blocks cross-project reads.

### Non-admin delete blocked

1. Log in as a **member with role ≠ admin** (e.g., `viewer` or `technician`).
2. Attempt to delete a PPI instance.
3. **Expected**: Delete button may be hidden, or the API returns a Supabase RLS error shown as a toast.

### Template creation blocked for non-members

1. Call the Supabase API directly (or via Postman with the anon key) without a valid JWT.
2. Attempt to insert into `ppi_templates`.
3. **Expected**: `403` / RLS violation error.

---

## Step 7 — Cleanup (after validation)

Run in Supabase SQL Editor (service role):

```sql
-- Replace {PROJECT_ID} with the test project UUID
DELETE FROM public.ppi_instance_items
  WHERE instance_id IN (SELECT id FROM public.ppi_instances WHERE project_id = '{PROJECT_ID}');
DELETE FROM public.ppi_instances    WHERE project_id = '{PROJECT_ID}';
DELETE FROM public.ppi_template_items
  WHERE template_id IN (SELECT id FROM public.ppi_templates WHERE project_id = '{PROJECT_ID}');
DELETE FROM public.ppi_templates    WHERE project_id = '{PROJECT_ID}';
```

---

## Common Issues & Fixes

| Symptom | Likely Cause | Fix |
|---|---|---|
| Demo PPI button → "No active templates" | No active template exists | Go to `/ppi/templates` → click "Criar templates demo" first |
| Code already exists error | Unique constraint `(project_id, code)` | Use a different code |
| RLS error on insert | User not a project member | Add user to `project_members` via Projects page |
| Status button missing | Instance already in terminal state | Archived/Approved instances have no further transitions |
| Language not switching | Missing i18n key | Check browser console for `i18next` warning; add key to both `pt.json` and `es.json` |

---

*Last updated: 2026-02-19*
