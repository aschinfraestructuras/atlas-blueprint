export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          diff: Json | null
          entity: string
          entity_id: string | null
          id: number
          module: string | null
          performed_by: string | null
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: number
          module?: string | null
          performed_by?: string | null
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: number
          module?: string | null
          performed_by?: string | null
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      document_files: {
        Row: {
          created_at: string
          document_id: string
          file_name: string
          id: string
          mime_type: string | null
          project_id: string
          sha256: string | null
          size: number | null
          storage_bucket: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_id: string
          file_name: string
          id?: string
          mime_type?: string | null
          project_id: string
          sha256?: string | null
          size?: number | null
          storage_bucket?: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_id?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          project_id?: string
          sha256?: string | null
          size?: number | null
          storage_bucket?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_files_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      document_links: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          id: string
          linked_entity_id: string
          linked_entity_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          id?: string
          linked_entity_id: string
          linked_entity_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          id?: string
          linked_entity_id?: string
          linked_entity_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_description: string | null
          document_id: string
          file_name: string | null
          file_path: string
          file_size: number | null
          id: string
          is_current: boolean
          mime_type: string | null
          uploaded_at: string
          uploaded_by: string
          version_number: number
        }
        Insert: {
          change_description?: string | null
          document_id: string
          file_name?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          is_current?: boolean
          mime_type?: string | null
          uploaded_at?: string
          uploaded_by: string
          version_number?: number
        }
        Update: {
          change_description?: string | null
          document_id?: string
          file_name?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          is_current?: boolean
          mime_type?: string | null
          uploaded_at?: string
          uploaded_by?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          code: string | null
          created_at: string
          created_by: string
          current_version_id: string | null
          disciplina: string
          disciplina_outro: string | null
          doc_type: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_url: string | null
          form_data: Json | null
          form_schema: Json | null
          id: string
          is_deleted: boolean
          issued_at: string | null
          mime_type: string | null
          project_id: string
          revision: string | null
          status: string
          tags: string[] | null
          title: string
          type_outro: string | null
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          code?: string | null
          created_at?: string
          created_by: string
          current_version_id?: string | null
          disciplina?: string
          disciplina_outro?: string | null
          doc_type: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          form_data?: Json | null
          form_schema?: Json | null
          id?: string
          is_deleted?: boolean
          issued_at?: string | null
          mime_type?: string | null
          project_id: string
          revision?: string | null
          status?: string
          tags?: string[] | null
          title: string
          type_outro?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          code?: string | null
          created_at?: string
          created_by?: string
          current_version_id?: string | null
          disciplina?: string
          disciplina_outro?: string | null
          doc_type?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          form_data?: Json | null
          form_schema?: Json | null
          id?: string
          is_deleted?: boolean
          issued_at?: string | null
          mime_type?: string | null
          project_id?: string
          revision?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          type_outro?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      equipment_calibrations: {
        Row: {
          approved_by: string | null
          certificate_number: string | null
          certifying_entity: string
          created_at: string
          created_by: string | null
          document_id: string | null
          equipment_id: string
          id: string
          issue_date: string
          notes: string | null
          project_id: string
          status: string
          updated_at: string
          valid_until: string
        }
        Insert: {
          approved_by?: string | null
          certificate_number?: string | null
          certifying_entity: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          equipment_id: string
          id?: string
          issue_date?: string
          notes?: string | null
          project_id: string
          status?: string
          updated_at?: string
          valid_until: string
        }
        Update: {
          approved_by?: string | null
          certificate_number?: string | null
          certifying_entity?: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          equipment_id?: string
          id?: string
          issue_date?: string
          notes?: string | null
          project_id?: string
          status?: string
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_calibrations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_calibrations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "topography_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_calibrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_calibrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_calibrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      laboratories: {
        Row: {
          accreditation_body: string | null
          accreditation_code: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          notes: string | null
          project_id: string
          scope: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          accreditation_body?: string | null
          accreditation_code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          project_id: string
          scope?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          accreditation_body?: string | null
          accreditation_code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          project_id?: string
          scope?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "laboratories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laboratories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "laboratories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "laboratories_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laboratories_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      material_documents: {
        Row: {
          created_at: string
          doc_type: string
          document_id: string
          id: string
          material_id: string
          project_id: string
          status: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string
          document_id: string
          id?: string
          material_id: string
          project_id: string
          status?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          document_id?: string
          id?: string
          material_id?: string
          project_id?: string
          status?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_documents_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_documents_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "view_material_detail_metrics"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "material_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      material_lots: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          ce_marking_ok: boolean | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          delivery_note_ref: string | null
          id: string
          is_deleted: boolean
          lot_code: string
          lot_ref: string | null
          material_id: string
          nc_id: string | null
          notes: string | null
          pame_code: string | null
          physical_state: string
          project_id: string
          quantity_received: number | null
          received_by: string | null
          reception_date: string
          reception_status: string
          rejection_reason: string | null
          storage_location: string | null
          supplier_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          ce_marking_ok?: boolean | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_note_ref?: string | null
          id?: string
          is_deleted?: boolean
          lot_code: string
          lot_ref?: string | null
          material_id: string
          nc_id?: string | null
          notes?: string | null
          pame_code?: string | null
          physical_state?: string
          project_id: string
          quantity_received?: number | null
          received_by?: string | null
          reception_date?: string
          reception_status?: string
          rejection_reason?: string | null
          storage_location?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          ce_marking_ok?: boolean | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_note_ref?: string | null
          id?: string
          is_deleted?: boolean
          lot_code?: string
          lot_ref?: string | null
          material_id?: string
          nc_id?: string | null
          notes?: string | null
          pame_code?: string | null
          physical_state?: string
          project_id?: string
          quantity_received?: number | null
          received_by?: string | null
          reception_date?: string
          reception_status?: string
          rejection_reason?: string | null
          storage_location?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_lots_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "view_material_detail_metrics"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "material_lots_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "non_conformities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_lots_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      materials: {
        Row: {
          acceptance_criteria: string | null
          approval_required: boolean
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          category: string
          code: string
          created_at: string
          created_by: string | null
          current_approved_doc_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          name: string
          normative_refs: string | null
          pame_approved_at: string | null
          pame_approved_by: string | null
          pame_code: string | null
          pame_disciplina: string | null
          pame_docs_req: string | null
          pame_norma: string | null
          pame_ppi_ref: string | null
          pame_prioridade: string | null
          pame_status: string | null
          pame_submitted_at: string | null
          project_id: string
          rejection_reason: string | null
          specification: string | null
          status: string
          subcategory: string | null
          submitted_at: string | null
          submitted_by: string | null
          supplier_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          acceptance_criteria?: string | null
          approval_required?: boolean
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category: string
          code: string
          created_at?: string
          created_by?: string | null
          current_approved_doc_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          normative_refs?: string | null
          pame_approved_at?: string | null
          pame_approved_by?: string | null
          pame_code?: string | null
          pame_disciplina?: string | null
          pame_docs_req?: string | null
          pame_norma?: string | null
          pame_ppi_ref?: string | null
          pame_prioridade?: string | null
          pame_status?: string | null
          pame_submitted_at?: string | null
          project_id: string
          rejection_reason?: string | null
          specification?: string | null
          status?: string
          subcategory?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          acceptance_criteria?: string | null
          approval_required?: boolean
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          current_approved_doc_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          normative_refs?: string | null
          pame_approved_at?: string | null
          pame_approved_by?: string | null
          pame_code?: string | null
          pame_disciplina?: string | null
          pame_docs_req?: string | null
          pame_norma?: string | null
          pame_ppi_ref?: string | null
          pame_prioridade?: string | null
          pame_status?: string | null
          pame_submitted_at?: string | null
          project_id?: string
          rejection_reason?: string | null
          specification?: string | null
          status?: string
          subcategory?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      non_conformities: {
        Row: {
          ac_efficacy_indicator: string | null
          actual_completion_date: string | null
          approver: string | null
          assigned_to: string | null
          audit_origin_type: string | null
          category: string
          category_outro: string | null
          classification: string | null
          closure_date: string | null
          code: string | null
          correction: string | null
          correction_type: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          detected_at: string
          deviation_justification: string | null
          discipline: string | null
          discipline_outro: string | null
          document_id: string | null
          due_date: string | null
          efficacy_analysis: string | null
          fip_validated_at: string | null
          fip_validated_by: string | null
          fip_validation_required: boolean
          id: string
          is_deleted: boolean
          location_pk: string | null
          material_id: string | null
          nc_sequence: number | null
          origin: string
          origin_entity_id: string | null
          origin_entity_type: string | null
          owner: string | null
          ppi_instance_id: string | null
          ppi_instance_item_id: string | null
          preventive_action: string | null
          project_id: string
          reference: string | null
          responsible: string | null
          root_cause: string | null
          root_cause_method: string | null
          severity: string
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
          test_result_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          validation_deadline: string | null
          verification_method: string | null
          verification_result: string | null
          verified_at: string | null
          verified_by: string | null
          violated_requirement: string | null
          work_item_id: string | null
        }
        Insert: {
          ac_efficacy_indicator?: string | null
          actual_completion_date?: string | null
          approver?: string | null
          assigned_to?: string | null
          audit_origin_type?: string | null
          category?: string
          category_outro?: string | null
          classification?: string | null
          closure_date?: string | null
          code?: string | null
          correction?: string | null
          correction_type?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          detected_at?: string
          deviation_justification?: string | null
          discipline?: string | null
          discipline_outro?: string | null
          document_id?: string | null
          due_date?: string | null
          efficacy_analysis?: string | null
          fip_validated_at?: string | null
          fip_validated_by?: string | null
          fip_validation_required?: boolean
          id?: string
          is_deleted?: boolean
          location_pk?: string | null
          material_id?: string | null
          nc_sequence?: number | null
          origin?: string
          origin_entity_id?: string | null
          origin_entity_type?: string | null
          owner?: string | null
          ppi_instance_id?: string | null
          ppi_instance_item_id?: string | null
          preventive_action?: string | null
          project_id: string
          reference?: string | null
          responsible?: string | null
          root_cause?: string | null
          root_cause_method?: string | null
          severity?: string
          status?: string
          subcontractor_id?: string | null
          supplier_id?: string | null
          test_result_id?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          validation_deadline?: string | null
          verification_method?: string | null
          verification_result?: string | null
          verified_at?: string | null
          verified_by?: string | null
          violated_requirement?: string | null
          work_item_id?: string | null
        }
        Update: {
          ac_efficacy_indicator?: string | null
          actual_completion_date?: string | null
          approver?: string | null
          assigned_to?: string | null
          audit_origin_type?: string | null
          category?: string
          category_outro?: string | null
          classification?: string | null
          closure_date?: string | null
          code?: string | null
          correction?: string | null
          correction_type?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          detected_at?: string
          deviation_justification?: string | null
          discipline?: string | null
          discipline_outro?: string | null
          document_id?: string | null
          due_date?: string | null
          efficacy_analysis?: string | null
          fip_validated_at?: string | null
          fip_validated_by?: string | null
          fip_validation_required?: boolean
          id?: string
          is_deleted?: boolean
          location_pk?: string | null
          material_id?: string | null
          nc_sequence?: number | null
          origin?: string
          origin_entity_id?: string | null
          origin_entity_type?: string | null
          owner?: string | null
          ppi_instance_id?: string | null
          ppi_instance_item_id?: string | null
          preventive_action?: string | null
          project_id?: string
          reference?: string | null
          responsible?: string | null
          root_cause?: string | null
          root_cause_method?: string | null
          severity?: string
          status?: string
          subcontractor_id?: string | null
          supplier_id?: string | null
          test_result_id?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          validation_deadline?: string | null
          verification_method?: string | null
          verification_result?: string | null
          verified_at?: string | null
          verified_by?: string | null
          violated_requirement?: string | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "non_conformities_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "view_material_detail_metrics"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "non_conformities_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "ppi_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_ppi_instance_item_id_fkey"
            columns: ["ppi_instance_item_id"]
            isOneToOne: false
            referencedRelation: "ppi_instance_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformities_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "non_conformities_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link_entity_id: string | null
          link_entity_type: string | null
          project_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link_entity_id?: string | null
          link_entity_type?: string | null
          project_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link_entity_id?: string | null
          link_entity_type?: string | null
          project_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      planning_activities: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          constraints_text: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          planned_end: string | null
          planned_start: string | null
          progress_pct: number
          project_id: string
          requires_ppi: boolean
          requires_tests: boolean
          requires_topography: boolean
          status: string
          subcontractor_id: string | null
          updated_at: string
          wbs_id: string | null
          work_item_id: string | null
          zone: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          constraints_text?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          planned_end?: string | null
          planned_start?: string | null
          progress_pct?: number
          project_id: string
          requires_ppi?: boolean
          requires_tests?: boolean
          requires_topography?: boolean
          status?: string
          subcontractor_id?: string | null
          updated_at?: string
          wbs_id?: string | null
          work_item_id?: string | null
          zone?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          constraints_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          planned_end?: string | null
          planned_start?: string | null
          progress_pct?: number
          project_id?: string
          requires_ppi?: boolean
          requires_tests?: boolean
          requires_topography?: boolean
          status?: string
          subcontractor_id?: string | null
          updated_at?: string
          wbs_id?: string | null
          work_item_id?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "planning_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "planning_activities_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_activities_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "planning_wbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_activities_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_wbs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          parent_id: string | null
          planned_end: string | null
          planned_start: string | null
          project_id: string
          responsible: string | null
          updated_at: string
          wbs_code: string
          zone: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          parent_id?: string | null
          planned_end?: string | null
          planned_start?: string | null
          project_id: string
          responsible?: string | null
          updated_at?: string
          wbs_code: string
          zone?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          parent_id?: string | null
          planned_end?: string | null
          planned_start?: string | null
          project_id?: string
          responsible?: string | null
          updated_at?: string
          wbs_code?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_wbs_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "planning_wbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_wbs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_wbs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "planning_wbs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      plans: {
        Row: {
          approval_date: string | null
          code: string | null
          created_at: string
          created_by: string
          discipline: string | null
          doc_reference: string | null
          document_id: string | null
          file_url: string | null
          id: string
          notes: string | null
          plan_type: string
          project_id: string
          responsible: string | null
          revision: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approval_date?: string | null
          code?: string | null
          created_at?: string
          created_by: string
          discipline?: string | null
          doc_reference?: string | null
          document_id?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          plan_type?: string
          project_id: string
          responsible?: string | null
          revision?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approval_date?: string | null
          code?: string | null
          created_at?: string
          created_by?: string
          discipline?: string | null
          doc_reference?: string | null
          document_id?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          plan_type?: string
          project_id?: string
          responsible?: string | null
          revision?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      ppi_instance_items: {
        Row: {
          acceptance_criteria: string | null
          check_code: string
          checked_at: string | null
          checked_by: string | null
          evidence_file_id: string | null
          evidence_required: boolean
          id: string
          inspection_point_type: string | null
          instance_id: string
          ipt_e: string | null
          ipt_f: string | null
          ipt_ip: string | null
          item_no: number
          label: string
          method: string | null
          nc_id: string | null
          notes: string | null
          requires_nc: boolean
          result: string
          sort_order: number
        }
        Insert: {
          acceptance_criteria?: string | null
          check_code: string
          checked_at?: string | null
          checked_by?: string | null
          evidence_file_id?: string | null
          evidence_required?: boolean
          id?: string
          inspection_point_type?: string | null
          instance_id: string
          ipt_e?: string | null
          ipt_f?: string | null
          ipt_ip?: string | null
          item_no: number
          label: string
          method?: string | null
          nc_id?: string | null
          notes?: string | null
          requires_nc?: boolean
          result?: string
          sort_order?: number
        }
        Update: {
          acceptance_criteria?: string | null
          check_code?: string
          checked_at?: string | null
          checked_by?: string | null
          evidence_file_id?: string | null
          evidence_required?: boolean
          id?: string
          inspection_point_type?: string | null
          instance_id?: string
          ipt_e?: string | null
          ipt_f?: string | null
          ipt_ip?: string | null
          item_no?: number
          label?: string
          method?: string | null
          nc_id?: string | null
          notes?: string | null
          requires_nc?: boolean
          result?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ppi_instance_items_evidence_file_id_fkey"
            columns: ["evidence_file_id"]
            isOneToOne: false
            referencedRelation: "document_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppi_instance_items_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "ppi_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppi_instance_items_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "non_conformities"
            referencedColumns: ["id"]
          },
        ]
      }
      ppi_instances: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          archived_by: string | null
          closed_at: string | null
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          disciplina_outro: string | null
          id: string
          inspection_date: string | null
          inspector_id: string | null
          is_deleted: boolean
          opened_at: string
          project_id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          template_id: string | null
          updated_at: string
          work_item_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
          closed_at?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          disciplina_outro?: string | null
          id?: string
          inspection_date?: string | null
          inspector_id?: string | null
          is_deleted?: boolean
          opened_at?: string
          project_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          template_id?: string | null
          updated_at?: string
          work_item_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
          closed_at?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          disciplina_outro?: string | null
          id?: string
          inspection_date?: string | null
          inspector_id?: string | null
          is_deleted?: boolean
          opened_at?: string
          project_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          template_id?: string | null
          updated_at?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ppi_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppi_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ppi_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppi_instances_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ppi_template_items: {
        Row: {
          acceptance_criteria: string | null
          check_code: string
          doc_record: string | null
          evidence_required: boolean
          id: string
          inspection_point_type: string | null
          ipt_e: string | null
          ipt_f: string | null
          ipt_ip: string | null
          item_no: number
          label: string
          method: string | null
          phase_name: string | null
          phase_no: number | null
          required: boolean
          sort_order: number
          template_id: string
          test_pe_code: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          check_code: string
          doc_record?: string | null
          evidence_required?: boolean
          id?: string
          inspection_point_type?: string | null
          ipt_e?: string | null
          ipt_f?: string | null
          ipt_ip?: string | null
          item_no: number
          label: string
          method?: string | null
          phase_name?: string | null
          phase_no?: number | null
          required?: boolean
          sort_order?: number
          template_id: string
          test_pe_code?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          check_code?: string
          doc_record?: string | null
          evidence_required?: boolean
          id?: string
          inspection_point_type?: string | null
          ipt_e?: string | null
          ipt_f?: string | null
          ipt_ip?: string | null
          item_no?: number
          label?: string
          method?: string | null
          phase_name?: string | null
          phase_no?: number | null
          required?: boolean
          sort_order?: number
          template_id?: string
          test_pe_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppi_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ppi_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ppi_templates: {
        Row: {
          approval_entity: string | null
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          disciplina: string
          disciplina_outro: string | null
          doc_reference: string | null
          id: string
          is_active: boolean
          norms: string | null
          project_id: string
          project_volume: string | null
          revision: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          approval_entity?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          disciplina: string
          disciplina_outro?: string | null
          doc_reference?: string | null
          id?: string
          is_active?: boolean
          norms?: string | null
          project_id: string
          project_volume?: string | null
          revision?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          approval_entity?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          disciplina?: string
          disciplina_outro?: string | null
          doc_reference?: string | null
          id?: string
          is_active?: boolean
          norms?: string | null
          project_id?: string
          project_volume?: string | null
          revision?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ppi_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppi_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          project_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          project_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          project_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          is_active: boolean
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
      projects: {
        Row: {
          client: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          start_date: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          client?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          client?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          rfi_id: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          rfi_id: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          rfi_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_messages_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
        ]
      }
      rfis: {
        Row: {
          code: string | null
          created_at: string
          created_by: string
          deadline: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          discipline: string | null
          doc_reference: string | null
          id: string
          is_deleted: boolean
          nc_id: string | null
          ppi_ref: string | null
          priority: string
          project_id: string
          pt_code: string | null
          recipient: string | null
          responded_at: string | null
          responded_by: string | null
          response_deadline: string | null
          response_text: string | null
          rfi_sequence: number | null
          status: string
          subject: string
          updated_at: string
          work_item_id: string | null
          zone: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          discipline?: string | null
          doc_reference?: string | null
          id?: string
          is_deleted?: boolean
          nc_id?: string | null
          ppi_ref?: string | null
          priority?: string
          project_id: string
          pt_code?: string | null
          recipient?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_deadline?: string | null
          response_text?: string | null
          rfi_sequence?: number | null
          status?: string
          subject: string
          updated_at?: string
          work_item_id?: string | null
          zone?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          discipline?: string | null
          doc_reference?: string | null
          id?: string
          is_deleted?: boolean
          nc_id?: string | null
          ppi_ref?: string | null
          priority?: string
          project_id?: string
          pt_code?: string | null
          recipient?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_deadline?: string | null
          response_text?: string | null
          rfi_sequence?: number | null
          status?: string
          subject?: string
          updated_at?: string
          work_item_id?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfis_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "non_conformities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      subcontractor_documents: {
        Row: {
          created_at: string
          doc_type: string
          document_id: string | null
          id: string
          project_id: string
          status: string
          subcontractor_id: string
          title: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string
          document_id?: string | null
          id?: string
          project_id: string
          status?: string
          subcontractor_id: string
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          document_id?: string | null
          id?: string
          project_id?: string
          status?: string
          subcontractor_id?: string
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_documents_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          documentation_status: string
          id: string
          is_deleted: boolean
          name: string
          notes: string | null
          performance_score: number | null
          project_id: string
          status: string
          supplier_id: string | null
          trade: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          documentation_status?: string
          id?: string
          is_deleted?: boolean
          name: string
          notes?: string | null
          performance_score?: number | null
          project_id: string
          status?: string
          supplier_id?: string | null
          trade?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          documentation_status?: string
          id?: string
          is_deleted?: boolean
          name?: string
          notes?: string | null
          performance_score?: number | null
          project_id?: string
          status?: string
          supplier_id?: string | null
          trade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractors_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractors_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          created_at: string
          doc_type: string
          document_id: string
          id: string
          project_id: string
          status: string
          supplier_id: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string
          document_id: string
          id?: string
          project_id: string
          status?: string
          supplier_id: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          document_id?: string
          id?: string
          project_id?: string
          status?: string
          supplier_id?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "supplier_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_evaluations: {
        Row: {
          created_at: string
          created_by: string | null
          criteria: Json
          eval_date: string
          id: string
          notes: string | null
          project_id: string
          result: string
          score: number | null
          supplier_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          eval_date?: string
          id?: string
          notes?: string | null
          project_id: string
          result?: string
          score?: number | null
          supplier_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          eval_date?: string
          id?: string
          notes?: string | null
          project_id?: string
          result?: string
          score?: number | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "supplier_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "supplier_evaluations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_evaluations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_materials: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          is_primary: boolean | null
          lead_time_days: number | null
          material_id: string | null
          material_name: string
          project_id: string
          supplier_id: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          is_primary?: boolean | null
          lead_time_days?: number | null
          material_id?: string | null
          material_name: string
          project_id: string
          supplier_id: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          is_primary?: boolean | null
          lead_time_days?: number | null
          material_id?: string | null
          material_name?: string
          project_id?: string
          supplier_id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "view_material_detail_metrics"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "supplier_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "supplier_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "supplier_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          approval_status: string
          category: string | null
          category_outro: string | null
          code: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contacts: Json | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          name: string
          nif_cif: string | null
          notes: string | null
          project_id: string
          qualification_score: number | null
          qualification_status: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          approval_status?: string
          category?: string | null
          category_outro?: string | null
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contacts?: Json | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          nif_cif?: string | null
          notes?: string | null
          project_id: string
          qualification_score?: number | null
          qualification_status?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          approval_status?: string
          category?: string | null
          category_outro?: string | null
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contacts?: Json | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          nif_cif?: string | null
          notes?: string | null
          project_id?: string
          qualification_score?: number | null
          qualification_status?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      survey_records: {
        Row: {
          area_or_pk: string
          created_at: string
          created_by: string
          date: string
          description: string | null
          file_url: string | null
          id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          area_or_pk: string
          created_at?: string
          created_by: string
          date?: string
          description?: string | null
          file_url?: string | null
          id?: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          area_or_pk?: string
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          file_url?: string | null
          id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "survey_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      technical_office_items: {
        Row: {
          assigned_to: string | null
          code: string | null
          created_at: string
          created_by: string
          deadline: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          document_id: string | null
          due_date: string | null
          id: string
          is_deleted: boolean
          nc_id: string | null
          priority: string
          project_id: string
          recipient: string | null
          responded_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
          work_item_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          code?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean
          nc_id?: string | null
          priority?: string
          project_id: string
          recipient?: string | null
          responded_at?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          work_item_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          code?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean
          nc_id?: string | null
          priority?: string
          project_id?: string
          recipient?: string | null
          responded_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_office_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_office_items_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "non_conformities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_office_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_office_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "technical_office_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "technical_office_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_office_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          item_id: string
          message: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          item_id: string
          message: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          item_id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_office_messages_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "technical_office_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          country: string | null
          created_at: string
          id: string
          name: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          name: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      test_due_items: {
        Row: {
          activity_id: string | null
          assigned_lab_supplier_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          due_at_date: string | null
          due_at_quantity: number | null
          due_reason: string
          id: string
          is_deleted: boolean
          plan_rule_id: string
          project_id: string
          related_test_result_id: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
          waived_reason: string | null
          work_item_id: string | null
        }
        Insert: {
          activity_id?: string | null
          assigned_lab_supplier_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          due_at_date?: string | null
          due_at_quantity?: number | null
          due_reason?: string
          id?: string
          is_deleted?: boolean
          plan_rule_id: string
          project_id: string
          related_test_result_id?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          waived_reason?: string | null
          work_item_id?: string | null
        }
        Update: {
          activity_id?: string | null
          assigned_lab_supplier_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          due_at_date?: string | null
          due_at_quantity?: number | null
          due_reason?: string
          id?: string
          is_deleted?: boolean
          plan_rule_id?: string
          project_id?: string
          related_test_result_id?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          waived_reason?: string | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_due_items_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "planning_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_due_items_assigned_lab_supplier_id_fkey"
            columns: ["assigned_lab_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_due_items_assigned_lab_supplier_id_fkey"
            columns: ["assigned_lab_supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "test_due_items_plan_rule_id_fkey"
            columns: ["plan_rule_id"]
            isOneToOne: false
            referencedRelation: "test_plan_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_due_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_due_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_due_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_due_items_related_test_result_id_fkey"
            columns: ["related_test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_due_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      test_plan_rules: {
        Row: {
          acceptance_criteria_override: string | null
          activity_filter: Json | null
          applies_to: string
          created_at: string
          created_by: string | null
          default_lab_supplier_id: string | null
          disciplina: string | null
          event_triggers: string[] | null
          frequency_type: string
          frequency_unit: string | null
          frequency_value: number | null
          id: string
          is_active: boolean
          plan_id: string
          requires_photos: boolean
          requires_report: boolean
          requires_witness: boolean
          standards_override: string[] | null
          test_id: string
          updated_at: string
          work_item_filter: Json | null
        }
        Insert: {
          acceptance_criteria_override?: string | null
          activity_filter?: Json | null
          applies_to?: string
          created_at?: string
          created_by?: string | null
          default_lab_supplier_id?: string | null
          disciplina?: string | null
          event_triggers?: string[] | null
          frequency_type?: string
          frequency_unit?: string | null
          frequency_value?: number | null
          id?: string
          is_active?: boolean
          plan_id: string
          requires_photos?: boolean
          requires_report?: boolean
          requires_witness?: boolean
          standards_override?: string[] | null
          test_id: string
          updated_at?: string
          work_item_filter?: Json | null
        }
        Update: {
          acceptance_criteria_override?: string | null
          activity_filter?: Json | null
          applies_to?: string
          created_at?: string
          created_by?: string | null
          default_lab_supplier_id?: string | null
          disciplina?: string | null
          event_triggers?: string[] | null
          frequency_type?: string
          frequency_unit?: string | null
          frequency_value?: number | null
          id?: string
          is_active?: boolean
          plan_id?: string
          requires_photos?: boolean
          requires_report?: boolean
          requires_witness?: boolean
          standards_override?: string[] | null
          test_id?: string
          updated_at?: string
          work_item_filter?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "test_plan_rules_default_lab_supplier_id_fkey"
            columns: ["default_lab_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_plan_rules_default_lab_supplier_id_fkey"
            columns: ["default_lab_supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "test_plan_rules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "test_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_plan_rules_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_plan_rules_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "view_advanced_quality_metrics"
            referencedColumns: ["test_catalog_id"]
          },
        ]
      }
      test_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          project_id: string
          scope_disciplina: string | null
          scope_notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          project_id: string
          scope_disciplina?: string | null
          scope_notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          project_id?: string
          scope_disciplina?: string | null
          scope_notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      test_results: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          code: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          location: string | null
          material: string | null
          material_id: string | null
          material_outro: string | null
          notes: string | null
          pass_fail: string | null
          pk_fim: number | null
          pk_inicio: number | null
          project_id: string
          report_number: string | null
          result: Json | null
          result_payload: Json | null
          result_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_ref: string | null
          status: string
          status_workflow: string
          subcontractor_id: string | null
          supplier_id: string | null
          template_id: string | null
          template_version: number | null
          test_id: string
          updated_at: string
          updated_by: string | null
          work_item_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          location?: string | null
          material?: string | null
          material_id?: string | null
          material_outro?: string | null
          notes?: string | null
          pass_fail?: string | null
          pk_fim?: number | null
          pk_inicio?: number | null
          project_id: string
          report_number?: string | null
          result?: Json | null
          result_payload?: Json | null
          result_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_ref?: string | null
          status?: string
          status_workflow?: string
          subcontractor_id?: string | null
          supplier_id?: string | null
          template_id?: string | null
          template_version?: number | null
          test_id: string
          updated_at?: string
          updated_by?: string | null
          work_item_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          location?: string | null
          material?: string | null
          material_id?: string | null
          material_outro?: string | null
          notes?: string | null
          pass_fail?: string | null
          pk_fim?: number | null
          pk_inicio?: number | null
          project_id?: string
          report_number?: string | null
          result?: Json | null
          result_payload?: Json | null
          result_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_ref?: string | null
          status?: string
          status_workflow?: string
          subcontractor_id?: string | null
          supplier_id?: string | null
          template_id?: string | null
          template_version?: number | null
          test_id?: string
          updated_at?: string
          updated_by?: string | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "view_material_detail_metrics"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "test_results_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "test_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "view_advanced_quality_metrics"
            referencedColumns: ["test_catalog_id"]
          },
          {
            foreignKeyName: "test_results_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      test_templates: {
        Row: {
          created_at: string
          created_by: string | null
          form_schema: Json
          id: string
          is_active: boolean
          project_id: string
          test_id: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          form_schema?: Json
          id?: string
          is_active?: boolean
          project_id: string
          test_id: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          form_schema?: Json
          id?: string
          is_active?: boolean
          project_id?: string
          test_id?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_templates_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_templates_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "view_advanced_quality_metrics"
            referencedColumns: ["test_catalog_id"]
          },
        ]
      }
      tests_catalog: {
        Row: {
          acceptance_criteria: string | null
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          disciplina: string
          disciplina_outro: string | null
          frequency: string | null
          frequency_type: string | null
          frequency_unit: string | null
          frequency_value: number | null
          id: string
          lab_required: boolean
          laboratorio: string | null
          laboratorio_outro: string | null
          material: string | null
          material_outro: string | null
          name: string
          pe_code: string | null
          phase_code: string | null
          phase_label: string | null
          project_id: string
          responsible_code: string | null
          standard: string | null
          standards: string[] | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          acceptance_criteria?: string | null
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          disciplina?: string
          disciplina_outro?: string | null
          frequency?: string | null
          frequency_type?: string | null
          frequency_unit?: string | null
          frequency_value?: number | null
          id?: string
          lab_required?: boolean
          laboratorio?: string | null
          laboratorio_outro?: string | null
          material?: string | null
          material_outro?: string | null
          name: string
          pe_code?: string | null
          phase_code?: string | null
          phase_label?: string | null
          project_id: string
          responsible_code?: string | null
          standard?: string | null
          standards?: string[] | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          acceptance_criteria?: string | null
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          disciplina?: string
          disciplina_outro?: string | null
          frequency?: string | null
          frequency_type?: string | null
          frequency_unit?: string | null
          frequency_value?: number | null
          id?: string
          lab_required?: boolean
          laboratorio?: string | null
          laboratorio_outro?: string | null
          material?: string | null
          material_outro?: string | null
          name?: string
          pe_code?: string | null
          phase_code?: string | null
          phase_label?: string | null
          project_id?: string
          responsible_code?: string | null
          standard?: string | null
          standards?: string[] | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tests_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      topography_controls: {
        Row: {
          created_at: string
          created_by: string | null
          deviation: string | null
          element: string
          equipment_id: string
          execution_date: string
          id: string
          measured_value: string | null
          nc_id: string | null
          notes: string | null
          ppi_id: string | null
          project_id: string
          result: string
          technician: string | null
          test_id: string | null
          tolerance: string | null
          updated_at: string
          work_item_id: string | null
          zone: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deviation?: string | null
          element: string
          equipment_id: string
          execution_date?: string
          id?: string
          measured_value?: string | null
          nc_id?: string | null
          notes?: string | null
          ppi_id?: string | null
          project_id: string
          result?: string
          technician?: string | null
          test_id?: string | null
          tolerance?: string | null
          updated_at?: string
          work_item_id?: string | null
          zone?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deviation?: string | null
          element?: string
          equipment_id?: string
          execution_date?: string
          id?: string
          measured_value?: string | null
          nc_id?: string | null
          notes?: string | null
          ppi_id?: string | null
          project_id?: string
          result?: string
          technician?: string | null
          test_id?: string | null
          tolerance?: string | null
          updated_at?: string
          work_item_id?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topography_controls_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "topography_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topography_controls_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "non_conformities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topography_controls_ppi_id_fkey"
            columns: ["ppi_id"]
            isOneToOne: false
            referencedRelation: "ppi_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topography_controls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topography_controls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_controls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_controls_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topography_controls_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      topography_equipment: {
        Row: {
          brand: string | null
          calibration_status: string
          calibration_valid_until: string | null
          code: string
          created_at: string
          created_by: string | null
          current_location: string | null
          equipment_type: string
          id: string
          model: string | null
          project_id: string
          responsible: string | null
          serial_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          calibration_status?: string
          calibration_valid_until?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          current_location?: string | null
          equipment_type?: string
          id?: string
          model?: string | null
          project_id: string
          responsible?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          calibration_status?: string
          calibration_valid_until?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          current_location?: string | null
          equipment_type?: string
          id?: string
          model?: string | null
          project_id?: string
          responsible?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topography_equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topography_equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      topography_requests: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          notes: string | null
          priority: string
          project_id: string
          request_date: string
          request_type: string
          responsible: string | null
          status: string
          updated_at: string
          work_item_id: string | null
          zone: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          notes?: string | null
          priority?: string
          project_id: string
          request_date?: string
          request_type?: string
          responsible?: string | null
          status?: string
          updated_at?: string
          work_item_id?: string | null
          zone?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          notes?: string | null
          priority?: string
          project_id?: string
          request_date?: string
          request_type?: string
          responsible?: string | null
          status?: string
          updated_at?: string
          work_item_id?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topography_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topography_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_requests_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_item_materials: {
        Row: {
          created_at: string
          id: string
          lot_ref: string | null
          material_id: string
          project_id: string
          quantity: number | null
          supplier_id: string | null
          unit: string | null
          work_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lot_ref?: string | null
          material_id: string
          project_id: string
          quantity?: number | null
          supplier_id?: string | null
          unit?: string | null
          work_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lot_ref?: string | null
          material_id?: string
          project_id?: string
          quantity?: number | null
          supplier_id?: string | null
          unit?: string | null
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "view_material_detail_metrics"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "work_item_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_item_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_item_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "work_item_materials_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_items: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          disciplina: string
          disciplina_outro: string | null
          elemento: string | null
          has_open_nc: boolean
          has_pending_ppi: boolean
          has_pending_tests: boolean
          id: string
          is_deleted: boolean
          lote: string | null
          obra: string | null
          parte: string | null
          pk_fim: number | null
          pk_inicio: number | null
          project_id: string
          readiness_status: string
          sector: string
          status: string
          subcontractor_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          disciplina?: string
          disciplina_outro?: string | null
          elemento?: string | null
          has_open_nc?: boolean
          has_pending_ppi?: boolean
          has_pending_tests?: boolean
          id?: string
          is_deleted?: boolean
          lote?: string | null
          obra?: string | null
          parte?: string | null
          pk_fim?: number | null
          pk_inicio?: number | null
          project_id: string
          readiness_status?: string
          sector: string
          status?: string
          subcontractor_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          disciplina?: string
          disciplina_outro?: string | null
          elemento?: string | null
          has_open_nc?: boolean
          has_pending_ppi?: boolean
          has_pending_tests?: boolean
          id?: string
          is_deleted?: boolean
          lote?: string | null
          obra?: string | null
          parte?: string | null
          pk_fim?: number | null
          pk_inicio?: number | null
          project_id?: string
          readiness_status?: string
          sector?: string
          status?: string
          subcontractor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_items_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      view_advanced_quality_metrics: {
        Row: {
          conform: number | null
          disciplina: string | null
          failure_rate_pct: number | null
          material: string | null
          non_conform: number | null
          project_id: string | null
          standard: string | null
          test_catalog_id: string | null
          test_code: string | null
          test_name: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      view_dashboard_summary: {
        Row: {
          docs_in_review: number | null
          docs_total: number | null
          nc_avg_aging: number | null
          nc_avg_lead_time: number | null
          nc_closed: number | null
          nc_open: number | null
          ppi_approved: number | null
          ppi_conform_pct: number | null
          ppi_submitted: number | null
          ppi_total: number | null
          project_id: string | null
          tests_completed: number | null
          tests_conform_pct: number | null
          tests_non_conform: number | null
          tests_total: number | null
          wi_in_progress: number | null
          wi_total: number | null
        }
        Relationships: []
      }
      view_document_metrics: {
        Row: {
          approved: number | null
          avg_approval_days: number | null
          doc_type: string | null
          draft: number | null
          in_review: number | null
          project_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      view_material_detail_metrics: {
        Row: {
          docs_expired: number | null
          docs_expiring_30d: number | null
          material_id: string | null
          nc_open_count: number | null
          project_id: string | null
          suppliers_count: number | null
          tests_nonconform: number | null
          tests_total: number | null
          work_items_count: number | null
        }
        Insert: {
          docs_expired?: never
          docs_expiring_30d?: never
          material_id?: string | null
          nc_open_count?: never
          project_id?: string | null
          suppliers_count?: never
          tests_nonconform?: never
          tests_total?: never
          work_items_count?: never
        }
        Update: {
          docs_expired?: never
          docs_expiring_30d?: never
          material_id?: string | null
          nc_open_count?: never
          project_id?: string | null
          suppliers_count?: never
          tests_nonconform?: never
          tests_total?: never
          work_items_count?: never
        }
        Relationships: [
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      view_materials_kpi: {
        Row: {
          materials_active: number | null
          materials_discontinued: number | null
          materials_total: number | null
          materials_with_expired_docs: number | null
          materials_with_nonconform_tests_30d: number | null
          materials_with_open_nc: number | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      view_nc_monthly: {
        Row: {
          closed: number | null
          month: string | null
          opened: number | null
          project_id: string | null
        }
        Relationships: []
      }
      view_supplier_detail_metrics: {
        Row: {
          docs_expired: number | null
          docs_expiring_30d: number | null
          docs_total: number | null
          evals_total: number | null
          latest_eval_result: string | null
          latest_score: number | null
          materials_count: number | null
          nc_open_count: number | null
          project_id: string | null
          supplier_id: string | null
          tests_nonconform: number | null
          tests_total: number | null
        }
        Insert: {
          docs_expired?: never
          docs_expiring_30d?: never
          docs_total?: never
          evals_total?: never
          latest_eval_result?: never
          latest_score?: never
          materials_count?: never
          nc_open_count?: never
          project_id?: string | null
          supplier_id?: string | null
          tests_nonconform?: never
          tests_total?: never
        }
        Update: {
          docs_expired?: never
          docs_expiring_30d?: never
          docs_total?: never
          evals_total?: never
          latest_eval_result?: never
          latest_score?: never
          materials_count?: never
          nc_open_count?: never
          project_id?: string | null
          supplier_id?: string | null
          tests_nonconform?: never
          tests_total?: never
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      view_suppliers_kpi: {
        Row: {
          project_id: string | null
          supplier_docs_expired: number | null
          supplier_docs_expiring_30d: number | null
          suppliers_active: number | null
          suppliers_blocked: number | null
          suppliers_pending_qualification: number | null
          suppliers_total: number | null
          suppliers_with_nonconform_tests_30d: number | null
          suppliers_with_open_nc: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      view_tests_monthly: {
        Row: {
          conform: number | null
          month: string | null
          non_conform: number | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_audit_log: {
        Row: {
          action: string | null
          created_at: string | null
          description: string | null
          diff: Json | null
          entity: string | null
          entity_id: string | null
          id: number | null
          module: string | null
          performed_by: string | null
          project_id: string | null
          user_display_name: string | null
          user_email: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_deadlines: {
        Row: {
          days_remaining: number | null
          doc_name: string | null
          due_date: string | null
          id: string | null
          project_id: string | null
          related_id: string | null
          severity: string | null
          source: string | null
        }
        Relationships: []
      }
      vw_ppi_kpis: {
        Row: {
          approved_count: number | null
          archived_count: number | null
          avg_cycle_days: number | null
          draft_count: number | null
          in_progress_count: number | null
          items_fail: number | null
          items_pass: number | null
          items_pending: number | null
          overdue_approval: number | null
          project_id: string | null
          rejected_count: number | null
          submitted_count: number | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ppi_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppi_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_project_health: {
        Row: {
          activities_blocked: number | null
          health_score: number | null
          health_status: string | null
          project_id: string | null
          readiness_ratio: number | null
          total_calibrations_expired: number | null
          total_documents_expired: number | null
          total_nc_open: number | null
          total_nc_overdue: number | null
          total_ppi_pending: number | null
          total_tests_fail_30d: number | null
          total_tests_pending: number | null
        }
        Relationships: []
      }
      vw_work_items_summary: {
        Row: {
          com_nc_aberta: number | null
          com_ppi_pendente: number | null
          concluidas: number | null
          disciplina: string | null
          em_execucao: number | null
          obra: string | null
          previstas: number | null
          project_id: string | null
          prontas: number | null
          sector: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
        ]
      }
    }
    Functions: {
      fn_accept_project_invite: { Args: { p_token: string }; Returns: Json }
      fn_bulk_export_tests: {
        Args: { p_ids?: string[]; p_project_id: string }
        Returns: {
          approved_at: string
          approved_by: string
          code: string
          created_by: string
          date: string
          id: string
          location: string
          material: string
          notes: string
          pass_fail: string
          pk_fim: number
          pk_inicio: number
          report_number: string
          result_payload: Json
          sample_ref: string
          standard: string
          status: string
          test_code: string
          test_name: string
        }[]
      }
      fn_check_activity_completion: {
        Args: { p_activity_id: string }
        Returns: Json
      }
      fn_claim_my_pending_invites: { Args: never; Returns: Json }
      fn_create_document: {
        Args: {
          p_disciplina?: string
          p_disciplina_outro?: string
          p_doc_type: string
          p_project_id: string
          p_revision?: string
          p_status?: string
          p_title: string
          p_type_outro?: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          code: string | null
          created_at: string
          created_by: string
          current_version_id: string | null
          disciplina: string
          disciplina_outro: string | null
          doc_type: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_url: string | null
          form_data: Json | null
          form_schema: Json | null
          id: string
          is_deleted: boolean
          issued_at: string | null
          mime_type: string | null
          project_id: string
          revision: string | null
          status: string
          tags: string[] | null
          title: string
          type_outro: string | null
          updated_at: string
          updated_by: string | null
          version: string
        }
        SetofOptions: {
          from: "*"
          to: "documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_create_material: {
        Args: {
          p_acceptance_criteria?: string
          p_category: string
          p_name: string
          p_normative_refs?: string
          p_project_id: string
          p_specification?: string
          p_subcategory?: string
          p_unit?: string
        }
        Returns: {
          acceptance_criteria: string | null
          approval_required: boolean
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          category: string
          code: string
          created_at: string
          created_by: string | null
          current_approved_doc_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          name: string
          normative_refs: string | null
          pame_approved_at: string | null
          pame_approved_by: string | null
          pame_code: string | null
          pame_disciplina: string | null
          pame_docs_req: string | null
          pame_norma: string | null
          pame_ppi_ref: string | null
          pame_prioridade: string | null
          pame_status: string | null
          pame_submitted_at: string | null
          project_id: string
          rejection_reason: string | null
          specification: string | null
          status: string
          subcategory: string | null
          submitted_at: string | null
          submitted_by: string | null
          supplier_id: string | null
          unit: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "materials"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_create_nc: {
        Args: {
          p_assigned_to?: string
          p_category?: string
          p_category_outro?: string
          p_description: string
          p_detected_at?: string
          p_document_id?: string
          p_due_date?: string
          p_origin?: string
          p_ppi_instance_id?: string
          p_ppi_instance_item_id?: string
          p_project_id: string
          p_reference?: string
          p_responsible?: string
          p_severity?: string
          p_subcontractor_id?: string
          p_supplier_id?: string
          p_test_result_id?: string
          p_title: string
          p_work_item_id?: string
        }
        Returns: {
          ac_efficacy_indicator: string | null
          actual_completion_date: string | null
          approver: string | null
          assigned_to: string | null
          audit_origin_type: string | null
          category: string
          category_outro: string | null
          classification: string | null
          closure_date: string | null
          code: string | null
          correction: string | null
          correction_type: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          detected_at: string
          deviation_justification: string | null
          discipline: string | null
          discipline_outro: string | null
          document_id: string | null
          due_date: string | null
          efficacy_analysis: string | null
          fip_validated_at: string | null
          fip_validated_by: string | null
          fip_validation_required: boolean
          id: string
          is_deleted: boolean
          location_pk: string | null
          material_id: string | null
          nc_sequence: number | null
          origin: string
          origin_entity_id: string | null
          origin_entity_type: string | null
          owner: string | null
          ppi_instance_id: string | null
          ppi_instance_item_id: string | null
          preventive_action: string | null
          project_id: string
          reference: string | null
          responsible: string | null
          root_cause: string | null
          root_cause_method: string | null
          severity: string
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
          test_result_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          validation_deadline: string | null
          verification_method: string | null
          verification_result: string | null
          verified_at: string | null
          verified_by: string | null
          violated_requirement: string | null
          work_item_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "non_conformities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_create_nc_from_ppi_item: {
        Args: {
          p_due_date?: string
          p_ppi_instance_item_id: string
          p_responsible?: string
          p_severity?: string
        }
        Returns: {
          ac_efficacy_indicator: string | null
          actual_completion_date: string | null
          approver: string | null
          assigned_to: string | null
          audit_origin_type: string | null
          category: string
          category_outro: string | null
          classification: string | null
          closure_date: string | null
          code: string | null
          correction: string | null
          correction_type: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          detected_at: string
          deviation_justification: string | null
          discipline: string | null
          discipline_outro: string | null
          document_id: string | null
          due_date: string | null
          efficacy_analysis: string | null
          fip_validated_at: string | null
          fip_validated_by: string | null
          fip_validation_required: boolean
          id: string
          is_deleted: boolean
          location_pk: string | null
          material_id: string | null
          nc_sequence: number | null
          origin: string
          origin_entity_id: string | null
          origin_entity_type: string | null
          owner: string | null
          ppi_instance_id: string | null
          ppi_instance_item_id: string | null
          preventive_action: string | null
          project_id: string
          reference: string | null
          responsible: string | null
          root_cause: string | null
          root_cause_method: string | null
          severity: string
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
          test_result_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          validation_deadline: string | null
          verification_method: string | null
          verification_result: string | null
          verified_at: string | null
          verified_by: string | null
          violated_requirement: string | null
          work_item_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "non_conformities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_create_nc_from_test: {
        Args: {
          p_due_date?: string
          p_responsible?: string
          p_severity?: string
          p_test_result_id: string
        }
        Returns: {
          ac_efficacy_indicator: string | null
          actual_completion_date: string | null
          approver: string | null
          assigned_to: string | null
          audit_origin_type: string | null
          category: string
          category_outro: string | null
          classification: string | null
          closure_date: string | null
          code: string | null
          correction: string | null
          correction_type: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          detected_at: string
          deviation_justification: string | null
          discipline: string | null
          discipline_outro: string | null
          document_id: string | null
          due_date: string | null
          efficacy_analysis: string | null
          fip_validated_at: string | null
          fip_validated_by: string | null
          fip_validation_required: boolean
          id: string
          is_deleted: boolean
          location_pk: string | null
          material_id: string | null
          nc_sequence: number | null
          origin: string
          origin_entity_id: string | null
          origin_entity_type: string | null
          owner: string | null
          ppi_instance_id: string | null
          ppi_instance_item_id: string | null
          preventive_action: string | null
          project_id: string
          reference: string | null
          responsible: string | null
          root_cause: string | null
          root_cause_method: string | null
          severity: string
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
          test_result_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          validation_deadline: string | null
          verification_method: string | null
          verification_result: string | null
          verified_at: string | null
          verified_by: string | null
          violated_requirement: string | null
          work_item_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "non_conformities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_create_new_version: {
        Args: {
          p_change_description?: string
          p_document_id: string
          p_file_name?: string
          p_file_path: string
          p_file_size?: number
          p_mime_type?: string
        }
        Returns: {
          change_description: string | null
          document_id: string
          file_name: string | null
          file_path: string
          file_size: number | null
          id: string
          is_current: boolean
          mime_type: string | null
          uploaded_at: string
          uploaded_by: string
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "document_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_create_ppi_instance:
        | {
            Args: {
              p_code?: string
              p_created_by?: string
              p_disciplina_outro?: string
              p_inspector_id?: string
              p_project_id: string
              p_template_id?: string
              p_work_item_id: string
            }
            Returns: {
              generated_code: string
              had_existing_items: boolean
              instance_id: string
              items_created: number
            }[]
          }
        | {
            Args: {
              p_code?: string
              p_created_by?: string
              p_disciplina_outro?: string
              p_inspection_date?: string
              p_inspector_id?: string
              p_project_id: string
              p_template_id?: string
              p_work_item_id: string
            }
            Returns: {
              generated_code: string
              had_existing_items: boolean
              instance_id: string
              items_created: number
            }[]
          }
      fn_create_supplier: {
        Args: {
          p_address?: string
          p_category?: string
          p_contact_email?: string
          p_contact_name?: string
          p_contact_phone?: string
          p_country?: string
          p_name: string
          p_notes?: string
          p_project_id: string
          p_tax_id?: string
        }
        Returns: {
          address: string | null
          approval_status: string
          category: string | null
          category_outro: string | null
          code: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contacts: Json | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          name: string
          nif_cif: string | null
          notes: string | null
          project_id: string
          qualification_score: number | null
          qualification_status: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "suppliers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_create_test_result: {
        Args: {
          p_code?: string
          p_date?: string
          p_location?: string
          p_material?: string
          p_notes?: string
          p_pk_fim?: number
          p_pk_inicio?: number
          p_project_id: string
          p_report_number?: string
          p_result_payload?: Json
          p_sample_ref?: string
          p_supplier_id?: string
          p_test_id: string
          p_work_item_id?: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          code: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          location: string | null
          material: string | null
          material_id: string | null
          material_outro: string | null
          notes: string | null
          pass_fail: string | null
          pk_fim: number | null
          pk_inicio: number | null
          project_id: string
          report_number: string | null
          result: Json | null
          result_payload: Json | null
          result_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_ref: string | null
          status: string
          status_workflow: string
          subcontractor_id: string | null
          supplier_id: string | null
          template_id: string | null
          template_version: number | null
          test_id: string
          updated_at: string
          updated_by: string | null
          work_item_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "test_results"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_dashboard_summary: {
        Args: { p_months?: number; p_project_id: string }
        Returns: Json
      }
      fn_generate_deadline_notifications: {
        Args: { p_days_ahead?: number; p_project_id: string }
        Returns: number
      }
      fn_generate_due_tests: {
        Args: { p_date_from?: string; p_date_to?: string; p_project_id: string }
        Returns: number
      }
      fn_invite_project_member: {
        Args: { p_email: string; p_project_id: string; p_role?: string }
        Returns: Json
      }
      fn_link_due_to_result: {
        Args: { p_due_id: string; p_test_result_id: string }
        Returns: undefined
      }
      fn_list_my_projects: {
        Args: never
        Returns: {
          client: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          start_date: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_next_lot_code: {
        Args: { p_material_code: string; p_project_id: string }
        Returns: string
      }
      fn_next_ppi_code: { Args: { p_project_id: string }; Returns: string }
      fn_next_tech_office_code: {
        Args: { p_prefix: string; p_project_id: string }
        Returns: string
      }
      fn_ppi_bulk_mark_ok: { Args: { p_instance_id: string }; Returns: number }
      fn_ppi_bulk_save_items: {
        Args: { p_instance_id: string; p_items: Json }
        Returns: number
      }
      fn_ppi_instance_transition:
        | {
            Args: { p_instance_id: string; p_to_status: string }
            Returns: {
              approved_at: string | null
              approved_by: string | null
              archived_at: string | null
              archived_by: string | null
              closed_at: string | null
              code: string
              created_at: string
              created_by: string | null
              deleted_at: string | null
              deleted_by: string | null
              disciplina_outro: string | null
              id: string
              inspection_date: string | null
              inspector_id: string | null
              is_deleted: boolean
              opened_at: string
              project_id: string
              rejected_at: string | null
              rejected_by: string | null
              rejection_reason: string | null
              status: string
              submitted_at: string | null
              submitted_by: string | null
              template_id: string | null
              updated_at: string
              work_item_id: string
            }
            SetofOptions: {
              from: "*"
              to: "ppi_instances"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_instance_id: string
              p_reason?: string
              p_to_status: string
            }
            Returns: {
              approved_at: string | null
              approved_by: string | null
              archived_at: string | null
              archived_by: string | null
              closed_at: string | null
              code: string
              created_at: string
              created_by: string | null
              deleted_at: string | null
              deleted_by: string | null
              disciplina_outro: string | null
              id: string
              inspection_date: string | null
              inspector_id: string | null
              is_deleted: boolean
              opened_at: string
              project_id: string
              rejected_at: string | null
              rejected_by: string | null
              rejection_reason: string | null
              status: string
              submitted_at: string | null
              submitted_by: string | null
              template_id: string | null
              updated_at: string
              work_item_id: string
            }
            SetofOptions: {
              from: "*"
              to: "ppi_instances"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      fn_project_health_kpis: { Args: { p_project_id: string }; Returns: Json }
      fn_qc_report_summary: {
        Args: { p_end_date: string; p_project_id: string; p_start_date: string }
        Returns: Json
      }
      fn_recalc_work_item_readiness: {
        Args: { p_work_item_id: string }
        Returns: undefined
      }
      fn_remove_project_member: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: undefined
      }
      fn_supplier_eval_template: { Args: never; Returns: Json }
      fn_update_member_role: {
        Args: { p_new_role: string; p_project_id: string; p_user_id: string }
        Returns: undefined
      }
      fn_update_nc_status: {
        Args: { p_nc_id: string; p_to_status: string }
        Returns: {
          ac_efficacy_indicator: string | null
          actual_completion_date: string | null
          approver: string | null
          assigned_to: string | null
          audit_origin_type: string | null
          category: string
          category_outro: string | null
          classification: string | null
          closure_date: string | null
          code: string | null
          correction: string | null
          correction_type: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          detected_at: string
          deviation_justification: string | null
          discipline: string | null
          discipline_outro: string | null
          document_id: string | null
          due_date: string | null
          efficacy_analysis: string | null
          fip_validated_at: string | null
          fip_validated_by: string | null
          fip_validation_required: boolean
          id: string
          is_deleted: boolean
          location_pk: string | null
          material_id: string | null
          nc_sequence: number | null
          origin: string
          origin_entity_id: string | null
          origin_entity_type: string | null
          owner: string | null
          ppi_instance_id: string | null
          ppi_instance_item_id: string | null
          preventive_action: string | null
          project_id: string
          reference: string | null
          responsible: string | null
          root_cause: string | null
          root_cause_method: string | null
          severity: string
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
          test_result_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          validation_deadline: string | null
          verification_method: string | null
          verification_result: string | null
          verified_at: string | null
          verified_by: string | null
          violated_requirement: string | null
          work_item_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "non_conformities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_update_test_status: {
        Args: { p_result_id: string; p_to_status: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          code: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          location: string | null
          material: string | null
          material_id: string | null
          material_outro: string | null
          notes: string | null
          pass_fail: string | null
          pk_fim: number | null
          pk_inicio: number | null
          project_id: string
          report_number: string | null
          result: Json | null
          result_payload: Json | null
          result_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_ref: string | null
          status: string
          status_workflow: string
          subcontractor_id: string | null
          supplier_id: string | null
          template_id: string | null
          template_version: number | null
          test_id: string
          updated_at: string
          updated_by: string | null
          work_item_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "test_results"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_waive_due_test: {
        Args: { p_due_id: string; p_reason: string }
        Returns: undefined
      }
      fn_work_item_report: { Args: { p_work_item_id: string }; Returns: Json }
      get_project_role: {
        Args: { _project_id: string; _user_id: string }
        Returns: string
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_project_role: {
        Args: { _project_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_admin: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _diff?: Json
          _entity: string
          _entity_id: string
          _project_id: string
        }
        Returns: undefined
      }
      storage_path_project_id: { Args: { path: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "tenant_admin"
        | "project_manager"
        | "quality_manager"
        | "technician"
        | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "tenant_admin",
        "project_manager",
        "quality_manager",
        "technician",
        "viewer",
      ],
    },
  },
} as const
