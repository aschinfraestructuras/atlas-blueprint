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
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string
          document_id: string
          id?: string
          material_id: string
          project_id: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          document_id?: string
          id?: string
          material_id?: string
          project_id?: string
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
        ]
      }
      materials: {
        Row: {
          acceptance_criteria: string | null
          category: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          normative_refs: string | null
          project_id: string
          specification: string | null
          status: string
          subcategory: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          acceptance_criteria?: string | null
          category: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          normative_refs?: string | null
          project_id: string
          specification?: string | null
          status?: string
          subcategory?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          acceptance_criteria?: string | null
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          normative_refs?: string | null
          project_id?: string
          specification?: string | null
          status?: string
          subcategory?: string | null
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
        ]
      }
      non_conformities: {
        Row: {
          approver: string | null
          assigned_to: string | null
          category: string
          category_outro: string | null
          closure_date: string | null
          code: string | null
          correction: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          description: string
          detected_at: string
          document_id: string | null
          due_date: string | null
          id: string
          material_id: string | null
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
          severity: string
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
          test_result_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          verification_method: string | null
          verification_result: string | null
          verified_at: string | null
          verified_by: string | null
          work_item_id: string | null
        }
        Insert: {
          approver?: string | null
          assigned_to?: string | null
          category?: string
          category_outro?: string | null
          closure_date?: string | null
          code?: string | null
          correction?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          detected_at?: string
          document_id?: string | null
          due_date?: string | null
          id?: string
          material_id?: string | null
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
          severity?: string
          status?: string
          subcontractor_id?: string | null
          supplier_id?: string | null
          test_result_id?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_method?: string | null
          verification_result?: string | null
          verified_at?: string | null
          verified_by?: string | null
          work_item_id?: string | null
        }
        Update: {
          approver?: string | null
          assigned_to?: string | null
          category?: string
          category_outro?: string | null
          closure_date?: string | null
          code?: string | null
          correction?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          detected_at?: string
          document_id?: string | null
          due_date?: string | null
          id?: string
          material_id?: string | null
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
          severity?: string
          status?: string
          subcontractor_id?: string | null
          supplier_id?: string | null
          test_result_id?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_method?: string | null
          verification_result?: string | null
          verified_at?: string | null
          verified_by?: string | null
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
      plans: {
        Row: {
          created_at: string
          created_by: string
          document_id: string | null
          file_url: string | null
          id: string
          plan_type: string
          project_id: string
          revision: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          document_id?: string | null
          file_url?: string | null
          id?: string
          plan_type?: string
          project_id: string
          revision?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          document_id?: string | null
          file_url?: string | null
          id?: string
          plan_type?: string
          project_id?: string
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
        ]
      }
      ppi_instance_items: {
        Row: {
          check_code: string
          checked_at: string | null
          checked_by: string | null
          evidence_file_id: string | null
          id: string
          instance_id: string
          item_no: number
          label: string
          nc_id: string | null
          notes: string | null
          requires_nc: boolean
          result: string
        }
        Insert: {
          check_code: string
          checked_at?: string | null
          checked_by?: string | null
          evidence_file_id?: string | null
          id?: string
          instance_id: string
          item_no: number
          label: string
          nc_id?: string | null
          notes?: string | null
          requires_nc?: boolean
          result?: string
        }
        Update: {
          check_code?: string
          checked_at?: string | null
          checked_by?: string | null
          evidence_file_id?: string | null
          id?: string
          instance_id?: string
          item_no?: number
          label?: string
          nc_id?: string | null
          notes?: string | null
          requires_nc?: boolean
          result?: string
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
          closed_at: string | null
          code: string
          created_at: string
          created_by: string | null
          disciplina_outro: string | null
          id: string
          inspection_date: string | null
          inspector_id: string | null
          opened_at: string
          project_id: string
          status: string
          template_id: string | null
          updated_at: string
          work_item_id: string
        }
        Insert: {
          closed_at?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          disciplina_outro?: string | null
          id?: string
          inspection_date?: string | null
          inspector_id?: string | null
          opened_at?: string
          project_id: string
          status?: string
          template_id?: string | null
          updated_at?: string
          work_item_id: string
        }
        Update: {
          closed_at?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          disciplina_outro?: string | null
          id?: string
          inspection_date?: string | null
          inspector_id?: string | null
          opened_at?: string
          project_id?: string
          status?: string
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
          evidence_required: boolean
          id: string
          item_no: number
          label: string
          method: string | null
          required: boolean
          sort_order: number
          template_id: string
        }
        Insert: {
          acceptance_criteria?: string | null
          check_code: string
          evidence_required?: boolean
          id?: string
          item_no: number
          label: string
          method?: string | null
          required?: boolean
          sort_order?: number
          template_id: string
        }
        Update: {
          acceptance_criteria?: string | null
          check_code?: string
          evidence_required?: boolean
          id?: string
          item_no?: number
          label?: string
          method?: string | null
          required?: boolean
          sort_order?: number
          template_id?: string
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
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          disciplina: string
          disciplina_outro: string | null
          id: string
          is_active: boolean
          project_id: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          disciplina: string
          disciplina_outro?: string | null
          id?: string
          is_active?: boolean
          project_id: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          disciplina?: string
          disciplina_outro?: string | null
          id?: string
          is_active?: boolean
          project_id?: string
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
      subcontractors: {
        Row: {
          contact_email: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          project_id: string
          status: string
          supplier_id: string | null
          trade: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          project_id: string
          status?: string
          supplier_id?: string | null
          trade?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
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
          code: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contacts: Json | null
          country: string | null
          created_at: string
          created_by: string | null
          id: string
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
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contacts?: Json | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
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
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contacts?: Json | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
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
        ]
      }
      technical_office_items: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          document_id: string | null
          due_date: string | null
          id: string
          project_id: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
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
      test_results: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          code: string | null
          created_at: string
          created_by: string | null
          date: string
          id: string
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
          reviewed_at: string | null
          reviewed_by: string | null
          sample_ref: string | null
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
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
          id?: string
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
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_ref?: string | null
          status?: string
          subcontractor_id?: string | null
          supplier_id?: string | null
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
          id?: string
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
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_ref?: string | null
          status?: string
          subcontractor_id?: string | null
          supplier_id?: string | null
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
          id: string
          laboratorio: string | null
          laboratorio_outro: string | null
          material: string | null
          material_outro: string | null
          name: string
          project_id: string
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
          id?: string
          laboratorio?: string | null
          laboratorio_outro?: string | null
          material?: string | null
          material_outro?: string | null
          name: string
          project_id: string
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
          id?: string
          laboratorio?: string | null
          laboratorio_outro?: string | null
          material?: string | null
          material_outro?: string | null
          name?: string
          project_id?: string
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
          disciplina: string
          disciplina_outro: string | null
          elemento: string | null
          id: string
          lote: string | null
          obra: string | null
          parte: string | null
          pk_fim: number | null
          pk_inicio: number | null
          project_id: string
          sector: string
          status: string
          subcontractor_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          disciplina?: string
          disciplina_outro?: string | null
          elemento?: string | null
          id?: string
          lote?: string | null
          obra?: string | null
          parte?: string | null
          pk_fim?: number | null
          pk_inicio?: number | null
          project_id: string
          sector: string
          status?: string
          subcontractor_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          disciplina?: string
          disciplina_outro?: string | null
          elemento?: string | null
          id?: string
          lote?: string | null
          obra?: string | null
          parte?: string | null
          pk_fim?: number | null
          pk_inicio?: number | null
          project_id?: string
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
          category: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          normative_refs: string | null
          project_id: string
          specification: string | null
          status: string
          subcategory: string | null
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
          approver: string | null
          assigned_to: string | null
          category: string
          category_outro: string | null
          closure_date: string | null
          code: string | null
          correction: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          description: string
          detected_at: string
          document_id: string | null
          due_date: string | null
          id: string
          material_id: string | null
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
          severity: string
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
          test_result_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          verification_method: string | null
          verification_result: string | null
          verified_at: string | null
          verified_by: string | null
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
          approver: string | null
          assigned_to: string | null
          category: string
          category_outro: string | null
          closure_date: string | null
          code: string | null
          correction: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          description: string
          detected_at: string
          document_id: string | null
          due_date: string | null
          id: string
          material_id: string | null
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
          severity: string
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
          test_result_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          verification_method: string | null
          verification_result: string | null
          verified_at: string | null
          verified_by: string | null
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
          approver: string | null
          assigned_to: string | null
          category: string
          category_outro: string | null
          closure_date: string | null
          code: string | null
          correction: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          description: string
          detected_at: string
          document_id: string | null
          due_date: string | null
          id: string
          material_id: string | null
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
          severity: string
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
          test_result_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          verification_method: string | null
          verification_result: string | null
          verified_at: string | null
          verified_by: string | null
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
          code: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contacts: Json | null
          country: string | null
          created_at: string
          created_by: string | null
          id: string
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
          id: string
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
          reviewed_at: string | null
          reviewed_by: string | null
          sample_ref: string | null
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
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
      fn_invite_project_member: {
        Args: { p_email: string; p_project_id: string; p_role?: string }
        Returns: Json
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
      fn_next_ppi_code: { Args: { p_project_id: string }; Returns: string }
      fn_ppi_bulk_mark_ok: { Args: { p_instance_id: string }; Returns: number }
      fn_ppi_bulk_save_items: {
        Args: { p_instance_id: string; p_items: Json }
        Returns: number
      }
      fn_ppi_instance_transition: {
        Args: { p_instance_id: string; p_to_status: string }
        Returns: {
          closed_at: string | null
          code: string
          created_at: string
          created_by: string | null
          disciplina_outro: string | null
          id: string
          inspection_date: string | null
          inspector_id: string | null
          opened_at: string
          project_id: string
          status: string
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
      fn_remove_project_member: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: undefined
      }
      fn_update_member_role: {
        Args: { p_new_role: string; p_project_id: string; p_user_id: string }
        Returns: undefined
      }
      fn_update_nc_status: {
        Args: { p_nc_id: string; p_to_status: string }
        Returns: {
          approver: string | null
          assigned_to: string | null
          category: string
          category_outro: string | null
          closure_date: string | null
          code: string | null
          correction: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          description: string
          detected_at: string
          document_id: string | null
          due_date: string | null
          id: string
          material_id: string | null
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
          severity: string
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
          test_result_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          verification_method: string | null
          verification_result: string | null
          verified_at: string | null
          verified_by: string | null
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
          id: string
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
          reviewed_at: string | null
          reviewed_by: string | null
          sample_ref: string | null
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
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
