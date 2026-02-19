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
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string
          doc_type: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_url: string | null
          id: string
          issued_at: string | null
          mime_type: string | null
          project_id: string
          revision: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by: string
          doc_type: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          mime_type?: string | null
          project_id: string
          revision?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          doc_type?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          mime_type?: string | null
          project_id?: string
          revision?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      non_conformities: {
        Row: {
          closure_date: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          origin_entity_id: string | null
          origin_entity_type: string | null
          project_id: string
          reference: string | null
          responsible: string | null
          root_cause: string | null
          severity: string
          status: string
          updated_at: string
          work_item_id: string | null
        }
        Insert: {
          closure_date?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          origin_entity_id?: string | null
          origin_entity_type?: string | null
          project_id: string
          reference?: string | null
          responsible?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          updated_at?: string
          work_item_id?: string | null
        }
        Update: {
          closure_date?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          origin_entity_id?: string | null
          origin_entity_type?: string | null
          project_id?: string
          reference?: string | null
          responsible?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          updated_at?: string
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "non_conformities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
          notes: string | null
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
          notes?: string | null
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
          notes?: string | null
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
      project_members: {
        Row: {
          created_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
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
            foreignKeyName: "subcontractors_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          approval_status: string
          category: string | null
          contacts: Json | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          nif_cif: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          category?: string | null
          contacts?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          nif_cif?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          category?: string | null
          contacts?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          nif_cif?: string | null
          project_id?: string
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
        ]
      }
      technical_office_items: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
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
            foreignKeyName: "technical_office_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      test_results: {
        Row: {
          created_at: string
          date: string
          id: string
          location: string | null
          project_id: string
          result: Json | null
          sample_ref: string | null
          status: string
          supplier_id: string | null
          test_id: string
          updated_at: string
          work_item_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          location?: string | null
          project_id: string
          result?: Json | null
          sample_ref?: string | null
          status?: string
          supplier_id?: string | null
          test_id: string
          updated_at?: string
          work_item_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          location?: string | null
          project_id?: string
          result?: Json | null
          sample_ref?: string | null
          status?: string
          supplier_id?: string | null
          test_id?: string
          updated_at?: string
          work_item_id?: string | null
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
            foreignKeyName: "test_results_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
          frequency: string | null
          id: string
          name: string
          project_id: string
          standard: string | null
          updated_at: string
        }
        Insert: {
          acceptance_criteria?: string | null
          active?: boolean
          code: string
          created_at?: string
          frequency?: string | null
          id?: string
          name: string
          project_id: string
          standard?: string | null
          updated_at?: string
        }
        Update: {
          acceptance_criteria?: string | null
          active?: boolean
          code?: string
          created_at?: string
          frequency?: string | null
          id?: string
          name?: string
          project_id?: string
          standard?: string | null
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
      work_items: {
        Row: {
          created_at: string
          created_by: string | null
          disciplina: string
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          disciplina?: string
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
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          disciplina?: string
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_create_ppi_instance: {
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
      fn_next_ppi_code: { Args: { p_project_id: string }; Returns: string }
      get_project_role: {
        Args: { _project_id: string; _user_id: string }
        Returns: string
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
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
