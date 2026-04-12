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
          accuracy_m: number | null
          captured_at: string | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          latitude: number | null
          longitude: number | null
          mime_type: string | null
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          accuracy_m?: number | null
          captured_at?: string | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mime_type?: string | null
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          accuracy_m?: number | null
          captured_at?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      compaction_nuclear_points: {
        Row: {
          compaction_degree: number | null
          created_at: string
          depth_cm: number | null
          eme_calibration_date: string | null
          eme_code: string | null
          gamma_dry_measured: number
          id: string
          notes: string | null
          pass_fail: string | null
          pk_point: string | null
          point_no: number
          project_id: string
          water_content: number | null
          zone_id: string
        }
        Insert: {
          compaction_degree?: number | null
          created_at?: string
          depth_cm?: number | null
          eme_calibration_date?: string | null
          eme_code?: string | null
          gamma_dry_measured: number
          id?: string
          notes?: string | null
          pass_fail?: string | null
          pk_point?: string | null
          point_no: number
          project_id: string
          water_content?: number | null
          zone_id: string
        }
        Update: {
          compaction_degree?: number | null
          created_at?: string
          depth_cm?: number | null
          eme_calibration_date?: string | null
          eme_code?: string | null
          gamma_dry_measured?: number
          id?: string
          notes?: string | null
          pass_fail?: string | null
          pk_point?: string | null
          point_no?: number
          project_id?: string
          water_content?: number | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compaction_nuclear_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compaction_nuclear_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_nuclear_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_nuclear_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_nuclear_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_nuclear_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_nuclear_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_nuclear_points_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "compaction_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      compaction_plate_tests: {
        Row: {
          created_at: string
          ev1_mpa: number | null
          ev2_ev1_ratio: number | null
          ev2_mpa: number | null
          id: string
          notes: string | null
          pass_fail: string | null
          pk_point: string | null
          point_no: number
          project_id: string
          zone_id: string
        }
        Insert: {
          created_at?: string
          ev1_mpa?: number | null
          ev2_ev1_ratio?: number | null
          ev2_mpa?: number | null
          id?: string
          notes?: string | null
          pass_fail?: string | null
          pk_point?: string | null
          point_no: number
          project_id: string
          zone_id: string
        }
        Update: {
          created_at?: string
          ev1_mpa?: number | null
          ev2_ev1_ratio?: number | null
          ev2_mpa?: number | null
          id?: string
          notes?: string | null
          pass_fail?: string | null
          pk_point?: string | null
          point_no?: number
          project_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compaction_plate_tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compaction_plate_tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_plate_tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_plate_tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_plate_tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_plate_tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_plate_tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_plate_tests_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "compaction_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      compaction_zones: {
        Row: {
          code: string
          compaction_criteria: number | null
          created_at: string
          created_by: string | null
          ev2_criteria: number | null
          ev2_ev1_criteria: number | null
          id: string
          layer_no: number | null
          material_ref: string | null
          material_type: string | null
          notes: string | null
          overall_result: string | null
          pk_end: string | null
          pk_start: string | null
          ppi_instance_id: string | null
          proctor_gamma_max: number | null
          proctor_wopt: number | null
          project_id: string
          technician_name: string | null
          test_date: string
          updated_at: string
          work_item_id: string | null
          zone_description: string
        }
        Insert: {
          code: string
          compaction_criteria?: number | null
          created_at?: string
          created_by?: string | null
          ev2_criteria?: number | null
          ev2_ev1_criteria?: number | null
          id?: string
          layer_no?: number | null
          material_ref?: string | null
          material_type?: string | null
          notes?: string | null
          overall_result?: string | null
          pk_end?: string | null
          pk_start?: string | null
          ppi_instance_id?: string | null
          proctor_gamma_max?: number | null
          proctor_wopt?: number | null
          project_id: string
          technician_name?: string | null
          test_date?: string
          updated_at?: string
          work_item_id?: string | null
          zone_description: string
        }
        Update: {
          code?: string
          compaction_criteria?: number | null
          created_at?: string
          created_by?: string | null
          ev2_criteria?: number | null
          ev2_ev1_criteria?: number | null
          id?: string
          layer_no?: number | null
          material_ref?: string | null
          material_type?: string | null
          notes?: string | null
          overall_result?: string | null
          pk_end?: string | null
          pk_start?: string | null
          ppi_instance_id?: string | null
          proctor_gamma_max?: number | null
          proctor_wopt?: number | null
          project_id?: string
          technician_name?: string | null
          test_date?: string
          updated_at?: string
          work_item_id?: string | null
          zone_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "compaction_zones_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "ppi_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compaction_zones_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["ppi_instance_id"]
          },
          {
            foreignKeyName: "compaction_zones_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["ppi_id"]
          },
          {
            foreignKeyName: "compaction_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compaction_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compaction_zones_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "compaction_zones_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "compaction_zones_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "compaction_zones_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "compaction_zones_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      concrete_batches: {
        Row: {
          air_content: number | null
          batch_date: string
          batch_time: string | null
          cement_class: string | null
          cement_type: string | null
          code: string
          concrete_class: string
          consistency_class: string | null
          created_at: string
          created_by: string | null
          delivery_note_ref: string | null
          element_betonado: string
          exc_class: string | null
          exposure_class: string | null
          fab_ref: string | null
          id: string
          lab_name: string | null
          lot_id: string | null
          max_aggregate: number | null
          notes: string | null
          pk_location: string | null
          ppi_instance_id: string | null
          project_id: string
          slump_mm: number | null
          slump_pass: boolean | null
          status: string
          structural_element_mqt_code: string | null
          supplier_id: string | null
          technician_name: string | null
          temp_ambient: number | null
          temp_concrete: number | null
          temp_pass: boolean | null
          truck_plate: string | null
          updated_at: string
          work_item_id: string | null
        }
        Insert: {
          air_content?: number | null
          batch_date?: string
          batch_time?: string | null
          cement_class?: string | null
          cement_type?: string | null
          code: string
          concrete_class?: string
          consistency_class?: string | null
          created_at?: string
          created_by?: string | null
          delivery_note_ref?: string | null
          element_betonado: string
          exc_class?: string | null
          exposure_class?: string | null
          fab_ref?: string | null
          id?: string
          lab_name?: string | null
          lot_id?: string | null
          max_aggregate?: number | null
          notes?: string | null
          pk_location?: string | null
          ppi_instance_id?: string | null
          project_id: string
          slump_mm?: number | null
          slump_pass?: boolean | null
          status?: string
          structural_element_mqt_code?: string | null
          supplier_id?: string | null
          technician_name?: string | null
          temp_ambient?: number | null
          temp_concrete?: number | null
          temp_pass?: boolean | null
          truck_plate?: string | null
          updated_at?: string
          work_item_id?: string | null
        }
        Update: {
          air_content?: number | null
          batch_date?: string
          batch_time?: string | null
          cement_class?: string | null
          cement_type?: string | null
          code?: string
          concrete_class?: string
          consistency_class?: string | null
          created_at?: string
          created_by?: string | null
          delivery_note_ref?: string | null
          element_betonado?: string
          exc_class?: string | null
          exposure_class?: string | null
          fab_ref?: string | null
          id?: string
          lab_name?: string | null
          lot_id?: string | null
          max_aggregate?: number | null
          notes?: string | null
          pk_location?: string | null
          ppi_instance_id?: string | null
          project_id?: string
          slump_mm?: number | null
          slump_pass?: boolean | null
          status?: string
          structural_element_mqt_code?: string | null
          supplier_id?: string | null
          technician_name?: string | null
          temp_ambient?: number | null
          temp_concrete?: number | null
          temp_pass?: boolean | null
          truck_plate?: string | null
          updated_at?: string
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concrete_batches_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "concrete_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concrete_batches_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "view_concrete_lot_conformity"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "concrete_batches_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "ppi_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concrete_batches_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["ppi_instance_id"]
          },
          {
            foreignKeyName: "concrete_batches_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["ppi_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concrete_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "concrete_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "concrete_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "concrete_batches_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "concrete_batches_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "concrete_batches_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "concrete_batches_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "concrete_batches_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      concrete_lots: {
        Row: {
          concrete_class: string
          created_at: string
          created_by: string | null
          date_end: string | null
          date_start: string | null
          element_code: string | null
          element_desc: string
          exc_class: string
          fab_ref: string | null
          id: string
          is_deleted: boolean
          lot_code: string
          notes: string | null
          ppi_instance_id: string | null
          project_id: string
          updated_at: string
          volume_total_m3: number | null
          work_item_id: string | null
        }
        Insert: {
          concrete_class?: string
          created_at?: string
          created_by?: string | null
          date_end?: string | null
          date_start?: string | null
          element_code?: string | null
          element_desc?: string
          exc_class?: string
          fab_ref?: string | null
          id?: string
          is_deleted?: boolean
          lot_code: string
          notes?: string | null
          ppi_instance_id?: string | null
          project_id: string
          updated_at?: string
          volume_total_m3?: number | null
          work_item_id?: string | null
        }
        Update: {
          concrete_class?: string
          created_at?: string
          created_by?: string | null
          date_end?: string | null
          date_start?: string | null
          element_code?: string | null
          element_desc?: string
          exc_class?: string
          fab_ref?: string | null
          id?: string
          is_deleted?: boolean
          lot_code?: string
          notes?: string | null
          ppi_instance_id?: string | null
          project_id?: string
          updated_at?: string
          volume_total_m3?: number | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      concrete_specimens: {
        Row: {
          batch_id: string
          break_load_kn: number | null
          created_at: string
          cure_days: number
          dimension_mm: number | null
          fracture_type: string | null
          id: string
          lab_ref: string | null
          mold_date: string
          notes: string | null
          pass_fail: string | null
          project_id: string
          shape: string | null
          specimen_no: number
          strength_mpa: number | null
          test_date: string | null
        }
        Insert: {
          batch_id: string
          break_load_kn?: number | null
          created_at?: string
          cure_days?: number
          dimension_mm?: number | null
          fracture_type?: string | null
          id?: string
          lab_ref?: string | null
          mold_date: string
          notes?: string | null
          pass_fail?: string | null
          project_id: string
          shape?: string | null
          specimen_no: number
          strength_mpa?: number | null
          test_date?: string | null
        }
        Update: {
          batch_id?: string
          break_load_kn?: number | null
          created_at?: string
          cure_days?: number
          dimension_mm?: number | null
          fracture_type?: string | null
          id?: string
          lab_ref?: string | null
          mold_date?: string
          notes?: string | null
          pass_fail?: string | null
          project_id?: string
          shape?: string | null
          specimen_no?: number
          strength_mpa?: number | null
          test_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concrete_specimens_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "concrete_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concrete_specimens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concrete_specimens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_specimens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_specimens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_specimens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_specimens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_specimens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      daily_report_equipment: {
        Row: {
          created_at: string | null
          daily_report_id: string
          designation: string
          hours_worked: number | null
          id: string
          serial_number: string | null
          sound_power_db: number | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          daily_report_id: string
          designation: string
          hours_worked?: number | null
          id?: string
          serial_number?: string | null
          sound_power_db?: number | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          daily_report_id?: string
          designation?: string
          hours_worked?: number | null
          id?: string
          serial_number?: string | null
          sound_power_db?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_equipment_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_equipment_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_report_context"
            referencedColumns: ["report_id"]
          },
        ]
      }
      daily_report_labour: {
        Row: {
          category: string
          created_at: string | null
          daily_report_id: string
          hours_worked: number | null
          id: string
          name: string | null
          time_end: string | null
          time_start: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          daily_report_id: string
          hours_worked?: number | null
          id?: string
          name?: string | null
          time_end?: string | null
          time_start?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          daily_report_id?: string
          hours_worked?: number | null
          id?: string
          name?: string | null
          time_end?: string | null
          time_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_labour_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_labour_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_report_context"
            referencedColumns: ["report_id"]
          },
        ]
      }
      daily_report_materials: {
        Row: {
          created_at: string | null
          daily_report_id: string
          final_destination: string | null
          id: string
          lot_id: string | null
          lot_number: string | null
          material_id: string | null
          nomenclature: string
          pame_reference: string | null
          preliminary_storage: string | null
          quantity: number | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          daily_report_id: string
          final_destination?: string | null
          id?: string
          lot_id?: string | null
          lot_number?: string | null
          material_id?: string | null
          nomenclature: string
          pame_reference?: string | null
          preliminary_storage?: string | null
          quantity?: number | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          daily_report_id?: string
          final_destination?: string | null
          id?: string
          lot_id?: string | null
          lot_number?: string | null
          material_id?: string | null
          nomenclature?: string
          pame_reference?: string | null
          preliminary_storage?: string | null
          quantity?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_materials_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_materials_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_report_context"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "daily_report_materials_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_materials_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "daily_report_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "view_material_detail_metrics"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "daily_report_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["material_id"]
          },
        ]
      }
      daily_report_rmm: {
        Row: {
          created_at: string | null
          daily_report_id: string
          designation: string
          id: string
          internal_code: string | null
        }
        Insert: {
          created_at?: string | null
          daily_report_id: string
          designation: string
          id?: string
          internal_code?: string | null
        }
        Update: {
          created_at?: string | null
          daily_report_id?: string
          designation?: string
          id?: string
          internal_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_rmm_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_rmm_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_report_context"
            referencedColumns: ["report_id"]
          },
        ]
      }
      daily_report_waste: {
        Row: {
          created_at: string | null
          daily_report_id: string
          final_destination: string | null
          id: string
          packaging_type: string | null
          preliminary_storage: string | null
          quantity: number | null
          type: string
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          daily_report_id: string
          final_destination?: string | null
          id?: string
          packaging_type?: string | null
          preliminary_storage?: string | null
          quantity?: number | null
          type: string
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          daily_report_id?: string
          final_destination?: string | null
          id?: string
          packaging_type?: string | null
          preliminary_storage?: string | null
          quantity?: number | null
          type?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_waste_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_waste_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_report_context"
            referencedColumns: ["report_id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          contractor_rep: string | null
          created_at: string | null
          created_by: string | null
          foreman_name: string | null
          id: string
          ip_rep: string | null
          is_deleted: boolean | null
          observations: string | null
          project_id: string
          report_date: string
          report_number: string
          signed_contractor: boolean | null
          signed_ip: boolean | null
          signed_supervisor: boolean | null
          status: string
          supervisor_rep: string | null
          temperature_max: number | null
          temperature_min: number | null
          updated_at: string | null
          weather: string | null
          work_item_id: string | null
        }
        Insert: {
          contractor_rep?: string | null
          created_at?: string | null
          created_by?: string | null
          foreman_name?: string | null
          id?: string
          ip_rep?: string | null
          is_deleted?: boolean | null
          observations?: string | null
          project_id: string
          report_date: string
          report_number: string
          signed_contractor?: boolean | null
          signed_ip?: boolean | null
          signed_supervisor?: boolean | null
          status?: string
          supervisor_rep?: string | null
          temperature_max?: number | null
          temperature_min?: number | null
          updated_at?: string | null
          weather?: string | null
          work_item_id?: string | null
        }
        Update: {
          contractor_rep?: string | null
          created_at?: string | null
          created_by?: string | null
          foreman_name?: string | null
          id?: string
          ip_rep?: string | null
          is_deleted?: boolean | null
          observations?: string | null
          project_id?: string
          report_date?: string
          report_number?: string
          signed_contractor?: boolean | null
          signed_ip?: boolean | null
          signed_supervisor?: boolean | null
          status?: string
          supervisor_rep?: string | null
          temperature_max?: number | null
          temperature_min?: number | null
          updated_at?: string | null
          weather?: string | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "daily_reports_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "daily_reports_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "daily_reports_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "daily_reports_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dfo_items: {
        Row: {
          code: string
          document_type: string | null
          id: string
          linked_doc_id: string | null
          notes: string | null
          project_id: string
          sort_order: number
          status: string
          title: string
          volume_id: string
        }
        Insert: {
          code: string
          document_type?: string | null
          id?: string
          linked_doc_id?: string | null
          notes?: string | null
          project_id: string
          sort_order?: number
          status?: string
          title: string
          volume_id: string
        }
        Update: {
          code?: string
          document_type?: string | null
          id?: string
          linked_doc_id?: string | null
          notes?: string | null
          project_id?: string
          sort_order?: number
          status?: string
          title?: string
          volume_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dfo_items_linked_doc_id_fkey"
            columns: ["linked_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "dfo_volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      dfo_volumes: {
        Row: {
          description: string | null
          id: string
          project_id: string
          sort_order: number
          title: string
          volume_no: number
        }
        Insert: {
          description?: string | null
          id?: string
          project_id: string
          sort_order?: number
          title: string
          volume_no: number
        }
        Update: {
          description?: string | null
          id?: string
          project_id?: string
          sort_order?: number
          title?: string
          volume_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "dfo_volumes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dfo_volumes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_volumes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_volumes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_volumes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_volumes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_volumes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      distribution_list_members: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          list_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          list_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "project_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "distribution_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_lists: {
        Row: {
          created_at: string
          description: string | null
          entity_type: string
          id: string
          is_default: boolean
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_type?: string
          id?: string
          is_default?: boolean
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_type?: string
          id?: string
          is_default?: boolean
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "distribution_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "distribution_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "distribution_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "distribution_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "distribution_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
          drive_file_name: string | null
          drive_url: string | null
          external_approval_entity: string | null
          external_approval_ref: string | null
          external_approved_at: string | null
          external_approved_by: string | null
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
          drive_file_name?: string | null
          drive_url?: string | null
          external_approval_entity?: string | null
          external_approval_ref?: string | null
          external_approved_at?: string | null
          external_approved_by?: string | null
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
          drive_file_name?: string | null
          drive_url?: string | null
          external_approval_entity?: string | null
          external_approval_ref?: string | null
          external_approved_at?: string | null
          external_approved_by?: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_calibrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_calibrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_calibrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_calibrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      field_record_checks: {
        Row: {
          criteria: string | null
          description: string
          id: string
          item_no: number
          measured_value: string | null
          method: string | null
          record_id: string
          result: string | null
        }
        Insert: {
          criteria?: string | null
          description: string
          id?: string
          item_no: number
          measured_value?: string | null
          method?: string | null
          record_id: string
          result?: string | null
        }
        Update: {
          criteria?: string | null
          description?: string
          id?: string
          item_no?: number
          measured_value?: string | null
          method?: string | null
          record_id?: string
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_record_checks_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "field_records"
            referencedColumns: ["id"]
          },
        ]
      }
      field_record_materials: {
        Row: {
          fav_pame_ref: string | null
          id: string
          lot_ref: string | null
          material_name: string
          quantity: string | null
          record_id: string
        }
        Insert: {
          fav_pame_ref?: string | null
          id?: string
          lot_ref?: string | null
          material_name: string
          quantity?: string | null
          record_id: string
        }
        Update: {
          fav_pame_ref?: string | null
          id?: string
          lot_ref?: string | null
          material_name?: string
          quantity?: string | null
          record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_record_materials_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "field_records"
            referencedColumns: ["id"]
          },
        ]
      }
      field_records: {
        Row: {
          activity: string
          code: string
          created_at: string
          created_by: string | null
          has_photos: boolean
          id: string
          inspection_date: string
          inspector_id: string | null
          location_pk: string | null
          observations: string | null
          point_type: string
          ppi_instance_id: string | null
          project_id: string
          result: string
          specialist_name: string | null
          weather: string | null
        }
        Insert: {
          activity: string
          code: string
          created_at?: string
          created_by?: string | null
          has_photos?: boolean
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          location_pk?: string | null
          observations?: string | null
          point_type?: string
          ppi_instance_id?: string | null
          project_id: string
          result?: string
          specialist_name?: string | null
          weather?: string | null
        }
        Update: {
          activity?: string
          code?: string
          created_at?: string
          created_by?: string | null
          has_photos?: boolean
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          location_pk?: string | null
          observations?: string | null
          point_type?: string
          ppi_instance_id?: string | null
          project_id?: string
          result?: string
          specialist_name?: string | null
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_records_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "ppi_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_records_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["ppi_instance_id"]
          },
          {
            foreignKeyName: "field_records_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["ppi_id"]
          },
          {
            foreignKeyName: "field_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "field_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "field_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "field_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "field_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "field_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      hp_notifications: {
        Row: {
          activity: string
          advance_notice_override: boolean
          advance_notice_reason: string | null
          approved_by_name: string | null
          approved_entity: string | null
          ata_code: string | null
          code: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          instance_id: string
          item_id: string | null
          location_pk: string | null
          notes: string | null
          notified_at: string
          notified_by: string | null
          planned_datetime: string
          point_no: string
          ppi_ref: string
          project_id: string
          rfi_ref: string | null
          status: string
        }
        Insert: {
          activity: string
          advance_notice_override?: boolean
          advance_notice_reason?: string | null
          approved_by_name?: string | null
          approved_entity?: string | null
          ata_code?: string | null
          code: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          instance_id: string
          item_id?: string | null
          location_pk?: string | null
          notes?: string | null
          notified_at?: string
          notified_by?: string | null
          planned_datetime: string
          point_no: string
          ppi_ref: string
          project_id: string
          rfi_ref?: string | null
          status?: string
        }
        Update: {
          activity?: string
          advance_notice_override?: boolean
          advance_notice_reason?: string | null
          approved_by_name?: string | null
          approved_entity?: string | null
          ata_code?: string | null
          code?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          item_id?: string | null
          location_pk?: string | null
          notes?: string | null
          notified_at?: string
          notified_by?: string | null
          planned_datetime?: string
          point_no?: string
          ppi_ref?: string
          project_id?: string
          rfi_ref?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hp_notifications_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "ppi_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hp_notifications_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["ppi_instance_id"]
          },
          {
            foreignKeyName: "hp_notifications_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["ppi_id"]
          },
          {
            foreignKeyName: "hp_notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ppi_instance_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      laboratories: {
        Row: {
          accreditation_body: string | null
          accreditation_code: string | null
          accreditation_valid_until: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          drive_url: string | null
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
          accreditation_valid_until?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          drive_url?: string | null
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
          accreditation_valid_until?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          drive_url?: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "laboratories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "laboratories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "laboratories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
          {
            foreignKeyName: "laboratories_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "laboratories_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
            foreignKeyName: "material_documents_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
          drive_url: string | null
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
          drive_url?: string | null
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
          drive_url?: string | null
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
            foreignKeyName: "material_lots_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "material_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
          {
            foreignKeyName: "material_lots_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "material_lots_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
          fav_documents: Json | null
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
          technical_comparison: Json | null
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
          fav_documents?: Json | null
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
          technical_comparison?: Json | null
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
          fav_documents?: Json | null
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
          technical_comparison?: Json | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      monthly_quality_reports: {
        Row: {
          accepted_at: string | null
          code: string
          corrective_actions: string | null
          created_at: string
          created_by: string | null
          drive_url: string | null
          id: string
          kpi_emes_expiring: number | null
          kpi_hp_approved: number | null
          kpi_hp_rate_pct: number | null
          kpi_hp_total: number | null
          kpi_mat_approved: number | null
          kpi_mat_pending: number | null
          kpi_nc_closed_month: number | null
          kpi_nc_open: number | null
          kpi_nc_overdue_15d: number | null
          kpi_pame_rate_pct: number | null
          kpi_ppi_completed: number | null
          kpi_rm_on_time: boolean | null
          kpi_tests_pass_rate: number | null
          next_month_plan: string | null
          observations: string | null
          production_executed: string | null
          project_id: string
          reference_month: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          tests_performed: string | null
          training_sessions: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          code: string
          corrective_actions?: string | null
          created_at?: string
          created_by?: string | null
          drive_url?: string | null
          id?: string
          kpi_emes_expiring?: number | null
          kpi_hp_approved?: number | null
          kpi_hp_rate_pct?: number | null
          kpi_hp_total?: number | null
          kpi_mat_approved?: number | null
          kpi_mat_pending?: number | null
          kpi_nc_closed_month?: number | null
          kpi_nc_open?: number | null
          kpi_nc_overdue_15d?: number | null
          kpi_pame_rate_pct?: number | null
          kpi_ppi_completed?: number | null
          kpi_rm_on_time?: boolean | null
          kpi_tests_pass_rate?: number | null
          next_month_plan?: string | null
          observations?: string | null
          production_executed?: string | null
          project_id: string
          reference_month: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tests_performed?: string | null
          training_sessions?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          code?: string
          corrective_actions?: string | null
          created_at?: string
          created_by?: string | null
          drive_url?: string | null
          id?: string
          kpi_emes_expiring?: number | null
          kpi_hp_approved?: number | null
          kpi_hp_rate_pct?: number | null
          kpi_hp_total?: number | null
          kpi_mat_approved?: number | null
          kpi_mat_pending?: number | null
          kpi_nc_closed_month?: number | null
          kpi_nc_open?: number | null
          kpi_nc_overdue_15d?: number | null
          kpi_pame_rate_pct?: number | null
          kpi_ppi_completed?: number | null
          kpi_rm_on_time?: boolean | null
          kpi_tests_pass_rate?: number | null
          next_month_plan?: string | null
          observations?: string | null
          production_executed?: string | null
          project_id?: string
          reference_month?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tests_performed?: string | null
          training_sessions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_quality_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_quality_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "monthly_quality_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "monthly_quality_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "monthly_quality_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "monthly_quality_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "monthly_quality_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
          audit_id: string | null
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
          audit_id?: string | null
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
          audit_id?: string | null
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
            foreignKeyName: "non_conformities_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "quality_audits"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "non_conformities_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
            foreignKeyName: "non_conformities_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["ppi_instance_id"]
          },
          {
            foreignKeyName: "non_conformities_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["ppi_id"]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "non_conformities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            foreignKeyName: "non_conformities_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "non_conformities_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "non_conformities_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "non_conformities_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "non_conformities_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
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
      notification_rate_limits: {
        Row: {
          id: string
          project_id: string
          send_count: number
          updated_at: string
          user_id: string
          window_hour: string
        }
        Insert: {
          id?: string
          project_id: string
          send_count?: number
          updated_at?: string
          user_id: string
          window_hour?: string
        }
        Update: {
          id?: string
          project_id?: string
          send_count?: number
          updated_at?: string
          user_id?: string
          window_hour?: string
        }
        Relationships: []
      }
      notification_recipients: {
        Row: {
          confirmation_token: string
          confirmed_at: string | null
          contact_id: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          notification_id: string
          sent_status: string
        }
        Insert: {
          confirmation_token?: string
          confirmed_at?: string | null
          contact_id?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          notification_id: string
          sent_status?: string
        }
        Update: {
          confirmation_token?: string
          confirmed_at?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          notification_id?: string
          sent_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "project_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications_log"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          body: string | null
          created_at: string
          entity_code: string | null
          entity_id: string | null
          entity_type: string
          id: string
          idempotency_key: string | null
          list_id: string | null
          pdf_attached: boolean
          project_id: string
          rate_limited: boolean | null
          sent_at: string
          sent_by: string | null
          subject: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_code?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          idempotency_key?: string | null
          list_id?: string | null
          pdf_attached?: boolean
          project_id: string
          rate_limited?: boolean | null
          sent_at?: string
          sent_by?: string | null
          subject: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_code?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          idempotency_key?: string | null
          list_id?: string | null
          pdf_attached?: boolean
          project_id?: string
          rate_limited?: boolean | null
          sent_at?: string
          sent_by?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "distribution_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notifications_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notifications_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notifications_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notifications_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notifications_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      plan_controlled_copies: {
        Row: {
          ack_ref: string | null
          confirmed_at: string | null
          copy_number: number
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          delivered_by: string | null
          delivery_method: string | null
          doc_code: string | null
          doc_revision: string | null
          id: string
          notes: string | null
          plan_id: string
          project_id: string
          rdc_code: string | null
          received_confirmed: boolean | null
          recipient_entity: string | null
          recipient_name: string
        }
        Insert: {
          ack_ref?: string | null
          confirmed_at?: string | null
          copy_number: number
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_method?: string | null
          doc_code?: string | null
          doc_revision?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          project_id: string
          rdc_code?: string | null
          received_confirmed?: boolean | null
          recipient_entity?: string | null
          recipient_name: string
        }
        Update: {
          ack_ref?: string | null
          confirmed_at?: string | null
          copy_number?: number
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_method?: string | null
          doc_code?: string | null
          doc_revision?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          project_id?: string
          rdc_code?: string | null
          received_confirmed?: boolean | null
          recipient_entity?: string | null
          recipient_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_controlled_copies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      planning_activities: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          code: string | null
          constraints_text: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          id: string
          is_deleted: boolean
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
          code?: string | null
          constraints_text?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          id?: string
          is_deleted?: boolean
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
          code?: string | null
          constraints_text?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          is_deleted?: boolean
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "planning_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "planning_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "planning_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "planning_activities_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "planning_activities_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "planning_activities_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "planning_wbs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "planning_wbs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "planning_wbs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "planning_wbs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
          drive_url: string | null
          external_approval_observations: string | null
          external_approval_status: string | null
          external_response_at: string | null
          external_sent_at: string | null
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
          drive_url?: string | null
          external_approval_observations?: string | null
          external_approval_status?: string | null
          external_response_at?: string | null
          external_sent_at?: string | null
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
          drive_url?: string | null
          external_approval_observations?: string | null
          external_approval_status?: string | null
          external_response_at?: string | null
          external_sent_at?: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            foreignKeyName: "ppi_instance_items_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["ppi_instance_id"]
          },
          {
            foreignKeyName: "ppi_instance_items_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["ppi_id"]
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
          element_ref: string | null
          id: string
          inspection_date: string | null
          inspector_id: string | null
          is_deleted: boolean
          opened_at: string
          pk_fim: string | null
          pk_inicio: string | null
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
          zone: string | null
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
          element_ref?: string | null
          id?: string
          inspection_date?: string | null
          inspector_id?: string | null
          is_deleted?: boolean
          opened_at?: string
          pk_fim?: string | null
          pk_inicio?: string | null
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
          zone?: string | null
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
          element_ref?: string | null
          id?: string
          inspection_date?: string | null
          inspector_id?: string | null
          is_deleted?: boolean
          opened_at?: string
          pk_fim?: string | null
          pk_inicio?: string | null
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
          zone?: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "ppi_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            foreignKeyName: "ppi_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "vw_ppi_template_stats"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "ppi_instances_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "ppi_instances_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "ppi_instances_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "ppi_instances_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
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
          {
            foreignKeyName: "ppi_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "vw_ppi_template_stats"
            referencedColumns: ["template_id"]
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
          sort_order: number | null
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
          sort_order?: number | null
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
          sort_order?: number | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
      project_contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          project_id: string
          role_title: string | null
          role_type: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          project_id: string
          role_title?: string | null
          role_type?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          project_id?: string
          role_title?: string | null
          role_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_integrations: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          project_id: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          project_id: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          project_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_machinery: {
        Row: {
          company: string | null
          created_at: string
          designation: string
          id: string
          notes: string | null
          plate: string | null
          project_id: string
          serial_number: string | null
          sound_power_db: number | null
          status: string
          subcontractor_id: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          designation: string
          id?: string
          notes?: string | null
          plate?: string | null
          project_id: string
          serial_number?: string | null
          sound_power_db?: number | null
          status?: string
          subcontractor_id?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          designation?: string
          id?: string
          notes?: string | null
          plate?: string | null
          project_id?: string
          serial_number?: string | null
          sound_power_db?: number | null
          status?: string
          subcontractor_id?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_machinery_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_machinery_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_machinery_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_machinery_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_machinery_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_machinery_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_machinery_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_machinery_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
      project_workers: {
        Row: {
          company: string | null
          created_at: string
          has_safety_training: boolean
          id: string
          name: string
          notes: string | null
          project_id: string
          role_function: string | null
          status: string
          subcontractor_id: string | null
          updated_at: string
          worker_number: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          has_safety_training?: boolean
          id?: string
          name: string
          notes?: string | null
          project_id: string
          role_function?: string | null
          status?: string
          subcontractor_id?: string | null
          updated_at?: string
          worker_number?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          has_safety_training?: boolean
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          role_function?: string | null
          status?: string
          subcontractor_id?: string | null
          updated_at?: string
          worker_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client: string | null
          code: string
          contract_number: string | null
          contractor: string | null
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
          contract_number?: string | null
          contractor?: string | null
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
          contract_number?: string | null
          contractor?: string | null
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
      quality_audits: {
        Row: {
          audit_type: string
          auditor_name: string | null
          code: string
          completed_date: string | null
          created_at: string
          created_by: string | null
          drive_url: string | null
          findings: string | null
          id: string
          nc_count: number
          obs_count: number
          observations: string | null
          planned_date: string
          project_id: string
          report_ref: string | null
          scope: string | null
          status: string
          updated_at: string
        }
        Insert: {
          audit_type?: string
          auditor_name?: string | null
          code: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          drive_url?: string | null
          findings?: string | null
          id?: string
          nc_count?: number
          obs_count?: number
          observations?: string | null
          planned_date: string
          project_id: string
          report_ref?: string | null
          scope?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          audit_type?: string
          auditor_name?: string | null
          code?: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          drive_url?: string | null
          findings?: string | null
          id?: string
          nc_count?: number
          obs_count?: number
          observations?: string | null
          planned_date?: string
          project_id?: string
          report_ref?: string | null
          scope?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "quality_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "quality_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "quality_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "quality_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "quality_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      recycled_material_documents: {
        Row: {
          document_name: string
          document_type: string
          document_url: string | null
          id: string
          recycled_material_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          document_name: string
          document_type: string
          document_url?: string | null
          id?: string
          recycled_material_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          document_name?: string
          document_type?: string
          document_url?: string | null
          id?: string
          recycled_material_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recycled_material_documents_recycled_material_id_fkey"
            columns: ["recycled_material_id"]
            isOneToOne: false
            referencedRelation: "recycled_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      recycled_materials: {
        Row: {
          application_date: string | null
          application_location: string | null
          certificate_number: string | null
          composition: string | null
          created_at: string | null
          created_by: string | null
          document_ref: string | null
          id: string
          is_deleted: boolean | null
          material_name: string
          observations: string | null
          project_id: string
          quantity_planned: number | null
          quantity_used: number | null
          recycled_content_pct: number | null
          reference_number: string
          reference_type: string
          serial_number: string | null
          status: string
          supplier_id: string | null
          supplier_name: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          application_date?: string | null
          application_location?: string | null
          certificate_number?: string | null
          composition?: string | null
          created_at?: string | null
          created_by?: string | null
          document_ref?: string | null
          id?: string
          is_deleted?: boolean | null
          material_name: string
          observations?: string | null
          project_id: string
          quantity_planned?: number | null
          quantity_used?: number | null
          recycled_content_pct?: number | null
          reference_number: string
          reference_type: string
          serial_number?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          application_date?: string | null
          application_location?: string | null
          certificate_number?: string | null
          composition?: string | null
          created_at?: string | null
          created_by?: string | null
          document_ref?: string | null
          id?: string
          is_deleted?: boolean | null
          material_name?: string
          observations?: string | null
          project_id?: string
          quantity_planned?: number | null
          quantity_used?: number | null
          recycled_content_pct?: number | null
          reference_number?: string
          reference_type?: string
          serial_number?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recycled_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recycled_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "recycled_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "recycled_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "recycled_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "recycled_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "recycled_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "recycled_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recycled_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "recycled_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "recycled_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["supplier_id"]
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
          recipient_name: string | null
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
          recipient_name?: string | null
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
          recipient_name?: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "rfis_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "rfis_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "rfis_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
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
      soil_samples: {
        Row: {
          aashto_class: string | null
          cbr_95: number | null
          cbr_98: number | null
          cbr_criteria: number | null
          cbr_expansion: number | null
          cbr_pass: boolean | null
          chloride_pct: number | null
          code: string
          created_at: string
          created_by: string | null
          depth_from: number | null
          depth_to: number | null
          extra_tests: Json | null
          grading_cc: number | null
          grading_cu: number | null
          grading_d10: number | null
          grading_d30: number | null
          grading_d60: number | null
          grading_p0075: number | null
          grading_p0425: number | null
          grading_p10: number | null
          grading_p2: number | null
          grading_p20: number | null
          grading_p50: number | null
          has_atterberg: boolean | null
          has_cbr: boolean | null
          has_grading: boolean | null
          has_organic: boolean | null
          has_proctor: boolean | null
          has_sulfates: boolean | null
          id: string
          ip_pct: number | null
          ll_pct: number | null
          lp_pct: number | null
          material_type: string | null
          notes: string | null
          organic_limit: number | null
          organic_method: string | null
          organic_pass: boolean | null
          organic_pct: number | null
          overall_result: string | null
          pk_location: string | null
          proctor_gamma_max: number | null
          proctor_points: Json | null
          proctor_wopt: number | null
          project_id: string
          sample_date: string
          sample_ref: string
          sulfate_limit: number | null
          sulfate_pass: boolean | null
          sulfate_pct: number | null
          supplier_id: string | null
          updated_at: string
          work_item_id: string | null
        }
        Insert: {
          aashto_class?: string | null
          cbr_95?: number | null
          cbr_98?: number | null
          cbr_criteria?: number | null
          cbr_expansion?: number | null
          cbr_pass?: boolean | null
          chloride_pct?: number | null
          code: string
          created_at?: string
          created_by?: string | null
          depth_from?: number | null
          depth_to?: number | null
          extra_tests?: Json | null
          grading_cc?: number | null
          grading_cu?: number | null
          grading_d10?: number | null
          grading_d30?: number | null
          grading_d60?: number | null
          grading_p0075?: number | null
          grading_p0425?: number | null
          grading_p10?: number | null
          grading_p2?: number | null
          grading_p20?: number | null
          grading_p50?: number | null
          has_atterberg?: boolean | null
          has_cbr?: boolean | null
          has_grading?: boolean | null
          has_organic?: boolean | null
          has_proctor?: boolean | null
          has_sulfates?: boolean | null
          id?: string
          ip_pct?: number | null
          ll_pct?: number | null
          lp_pct?: number | null
          material_type?: string | null
          notes?: string | null
          organic_limit?: number | null
          organic_method?: string | null
          organic_pass?: boolean | null
          organic_pct?: number | null
          overall_result?: string | null
          pk_location?: string | null
          proctor_gamma_max?: number | null
          proctor_points?: Json | null
          proctor_wopt?: number | null
          project_id: string
          sample_date?: string
          sample_ref: string
          sulfate_limit?: number | null
          sulfate_pass?: boolean | null
          sulfate_pct?: number | null
          supplier_id?: string | null
          updated_at?: string
          work_item_id?: string | null
        }
        Update: {
          aashto_class?: string | null
          cbr_95?: number | null
          cbr_98?: number | null
          cbr_criteria?: number | null
          cbr_expansion?: number | null
          cbr_pass?: boolean | null
          chloride_pct?: number | null
          code?: string
          created_at?: string
          created_by?: string | null
          depth_from?: number | null
          depth_to?: number | null
          extra_tests?: Json | null
          grading_cc?: number | null
          grading_cu?: number | null
          grading_d10?: number | null
          grading_d30?: number | null
          grading_d60?: number | null
          grading_p0075?: number | null
          grading_p0425?: number | null
          grading_p10?: number | null
          grading_p2?: number | null
          grading_p20?: number | null
          grading_p50?: number | null
          has_atterberg?: boolean | null
          has_cbr?: boolean | null
          has_grading?: boolean | null
          has_organic?: boolean | null
          has_proctor?: boolean | null
          has_sulfates?: boolean | null
          id?: string
          ip_pct?: number | null
          ll_pct?: number | null
          lp_pct?: number | null
          material_type?: string | null
          notes?: string | null
          organic_limit?: number | null
          organic_method?: string | null
          organic_pass?: boolean | null
          organic_pct?: number | null
          overall_result?: string | null
          pk_location?: string | null
          proctor_gamma_max?: number | null
          proctor_points?: Json | null
          proctor_wopt?: number | null
          project_id?: string
          sample_date?: string
          sample_ref?: string
          sulfate_limit?: number | null
          sulfate_pass?: boolean | null
          sulfate_pct?: number | null
          supplier_id?: string | null
          updated_at?: string
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soil_samples_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soil_samples_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "soil_samples_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "soil_samples_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "soil_samples_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "soil_samples_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "soil_samples_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "soil_samples_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soil_samples_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_detail_metrics"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "soil_samples_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "soil_samples_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "soil_samples_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "soil_samples_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "soil_samples_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "soil_samples_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "soil_samples_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_documents: {
        Row: {
          created_at: string
          doc_type: string
          document_id: string | null
          drive_url: string | null
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
          drive_url?: string | null
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
          drive_url?: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "subcontractor_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "subcontractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
          {
            foreignKeyName: "subcontractors_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "subcontractors_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          created_at: string
          doc_type: string
          document_id: string
          drive_url: string | null
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
          drive_url?: string | null
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
          drive_url?: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "supplier_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "supplier_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "supplier_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "supplier_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "supplier_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "supplier_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
          {
            foreignKeyName: "supplier_evaluations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_evaluations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
            foreignKeyName: "supplier_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "supplier_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "supplier_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "supplier_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
          {
            foreignKeyName: "supplier_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "survey_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "survey_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "survey_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "survey_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "technical_office_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "technical_office_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "technical_office_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "technical_office_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "technical_office_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "technical_office_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "technical_office_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
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
            foreignKeyName: "test_due_items_assigned_lab_supplier_id_fkey"
            columns: ["assigned_lab_supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "test_due_items_assigned_lab_supplier_id_fkey"
            columns: ["assigned_lab_supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_due_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "test_due_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_due_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "test_due_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "test_due_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "test_due_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
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
          base_normativa: string | null
          created_at: string
          created_by: string | null
          default_lab_supplier_id: string | null
          disciplina: string | null
          elem_description: string | null
          event_triggers: string[] | null
          exc_class: string | null
          frequency_type: string
          frequency_unit: string | null
          frequency_value: number | null
          id: string
          is_active: boolean
          pe_section: string | null
          plan_id: string
          qty_mqt_indicative: number | null
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
          base_normativa?: string | null
          created_at?: string
          created_by?: string | null
          default_lab_supplier_id?: string | null
          disciplina?: string | null
          elem_description?: string | null
          event_triggers?: string[] | null
          exc_class?: string | null
          frequency_type?: string
          frequency_unit?: string | null
          frequency_value?: number | null
          id?: string
          is_active?: boolean
          pe_section?: string | null
          plan_id: string
          qty_mqt_indicative?: number | null
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
          base_normativa?: string | null
          created_at?: string
          created_by?: string | null
          default_lab_supplier_id?: string | null
          disciplina?: string | null
          elem_description?: string | null
          event_triggers?: string[] | null
          exc_class?: string | null
          frequency_type?: string
          frequency_unit?: string | null
          frequency_value?: number | null
          id?: string
          is_active?: boolean
          pe_section?: string | null
          plan_id?: string
          qty_mqt_indicative?: number | null
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
            foreignKeyName: "test_plan_rules_default_lab_supplier_id_fkey"
            columns: ["default_lab_supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "test_plan_rules_default_lab_supplier_id_fkey"
            columns: ["default_lab_supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
          {
            foreignKeyName: "test_plan_rules_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "view_pe_annexb_pf17a"
            referencedColumns: ["id"]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      test_results: {
        Row: {
          ambient_temperature: number | null
          approved_at: string | null
          approved_by: string | null
          be_campo_code: string | null
          be_code: string | null
          code: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          deleted_by: string | null
          eme_calibration_date: string | null
          eme_code: string | null
          gr_id: string | null
          id: string
          is_deleted: boolean
          lab_report_ref: string | null
          location: string | null
          location_pk: string | null
          material: string | null
          material_id: string | null
          material_outro: string | null
          notes: string | null
          pass_fail: string | null
          pk_fim: number | null
          pk_inicio: number | null
          ppi_instance_id: string | null
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
          weather: string | null
          work_item_id: string | null
        }
        Insert: {
          ambient_temperature?: number | null
          approved_at?: string | null
          approved_by?: string | null
          be_campo_code?: string | null
          be_code?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          eme_calibration_date?: string | null
          eme_code?: string | null
          gr_id?: string | null
          id?: string
          is_deleted?: boolean
          lab_report_ref?: string | null
          location?: string | null
          location_pk?: string | null
          material?: string | null
          material_id?: string | null
          material_outro?: string | null
          notes?: string | null
          pass_fail?: string | null
          pk_fim?: number | null
          pk_inicio?: number | null
          ppi_instance_id?: string | null
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
          weather?: string | null
          work_item_id?: string | null
        }
        Update: {
          ambient_temperature?: number | null
          approved_at?: string | null
          approved_by?: string | null
          be_campo_code?: string | null
          be_code?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          eme_calibration_date?: string | null
          eme_code?: string | null
          gr_id?: string | null
          id?: string
          is_deleted?: boolean
          lab_report_ref?: string | null
          location?: string | null
          location_pk?: string | null
          material?: string | null
          material_id?: string | null
          material_outro?: string | null
          notes?: string | null
          pass_fail?: string | null
          pk_fim?: number | null
          pk_inicio?: number | null
          ppi_instance_id?: string | null
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
          weather?: string | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_gr_id_fkey"
            columns: ["gr_id"]
            isOneToOne: false
            referencedRelation: "field_records"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "test_results_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "test_results_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "ppi_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["ppi_instance_id"]
          },
          {
            foreignKeyName: "test_results_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["ppi_id"]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            foreignKeyName: "test_results_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "test_results_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "view_pe_annexb_pf17a"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "test_results_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "test_results_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "test_results_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "test_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
          {
            foreignKeyName: "test_templates_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "view_pe_annexb_pf17a"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tests_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tests_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tests_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tests_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      topography_controls: {
        Row: {
          cota_executado: number | null
          cota_projeto: number | null
          created_at: string
          created_by: string | null
          desvio_cota: number | null
          deviation: string | null
          element: string
          equipment_id: string
          execution_date: string
          ft_code: string | null
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
          cota_executado?: number | null
          cota_projeto?: number | null
          created_at?: string
          created_by?: string | null
          desvio_cota?: number | null
          deviation?: string | null
          element: string
          equipment_id: string
          execution_date?: string
          ft_code?: string | null
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
          cota_executado?: number | null
          cota_projeto?: number | null
          created_at?: string
          created_by?: string | null
          desvio_cota?: number | null
          deviation?: string | null
          element?: string
          equipment_id?: string
          execution_date?: string
          ft_code?: string | null
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
            foreignKeyName: "topography_controls_ppi_id_fkey"
            columns: ["ppi_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["ppi_instance_id"]
          },
          {
            foreignKeyName: "topography_controls_ppi_id_fkey"
            columns: ["ppi_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["ppi_id"]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_controls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "topography_controls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_controls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "topography_controls_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "topography_controls_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "topography_controls_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      topography_ft_points: {
        Row: {
          control_id: string
          created_at: string | null
          delta_x: number | null
          delta_y: number | null
          delta_z: number | null
          id: string
          notes: string | null
          ok_nc: string | null
          pk_element: string | null
          point_no: number
          project_id: string
          x_med: number | null
          x_proj: number | null
          y_med: number | null
          y_proj: number | null
          z_med: number | null
          z_proj: number | null
        }
        Insert: {
          control_id: string
          created_at?: string | null
          delta_x?: number | null
          delta_y?: number | null
          delta_z?: number | null
          id?: string
          notes?: string | null
          ok_nc?: string | null
          pk_element?: string | null
          point_no: number
          project_id: string
          x_med?: number | null
          x_proj?: number | null
          y_med?: number | null
          y_proj?: number | null
          z_med?: number | null
          z_proj?: number | null
        }
        Update: {
          control_id?: string
          created_at?: string | null
          delta_x?: number | null
          delta_y?: number | null
          delta_z?: number | null
          id?: string
          notes?: string | null
          ok_nc?: string | null
          pk_element?: string | null
          point_no?: number
          project_id?: string
          x_med?: number | null
          x_proj?: number | null
          y_med?: number | null
          y_proj?: number | null
          z_med?: number | null
          z_proj?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "topography_ft_points_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "topography_controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topography_ft_points_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "vw_topography_cycle"
            referencedColumns: ["control_id"]
          },
          {
            foreignKeyName: "topography_ft_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topography_ft_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_ft_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_ft_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_ft_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_ft_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_ft_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "topography_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_requests_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "topography_requests_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "topography_requests_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "topography_requests_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
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
      training_attendees: {
        Row: {
          company: string | null
          id: string
          name: string
          role_function: string | null
          session_id: string
          signed: boolean
          worker_id: string | null
        }
        Insert: {
          company?: string | null
          id?: string
          name: string
          role_function?: string | null
          session_id: string
          signed?: boolean
          worker_id?: string | null
        }
        Update: {
          company?: string | null
          id?: string
          name?: string
          role_function?: string | null
          session_id?: string
          signed?: boolean
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_attendees_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendees_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "project_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendees_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "vw_worker_training_gap"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "training_attendees_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "vw_workers_training_status"
            referencedColumns: ["worker_id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          attendee_count: number
          code: string
          created_at: string
          created_by: string | null
          end_time: string | null
          id: string
          location: string | null
          project_id: string
          session_date: string
          session_type: string
          start_time: string | null
          title: string
          topics: string | null
          trainer_name: string | null
        }
        Insert: {
          attendee_count?: number
          code: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          project_id: string
          session_date?: string
          session_type?: string
          start_time?: string | null
          title: string
          topics?: string | null
          trainer_name?: string | null
        }
        Update: {
          attendee_count?: number
          code?: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          project_id?: string
          session_date?: string
          session_type?: string
          start_time?: string | null
          title?: string
          topics?: string | null
          trainer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "training_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "training_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "training_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "training_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "training_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
      weld_records: {
        Row: {
          alignment_criteria: number | null
          alignment_mm: number | null
          alignment_pass: boolean | null
          cert_operator_us: string | null
          code: string
          created_at: string
          created_by: string | null
          excess_material_ok: boolean | null
          fus_code: string | null
          fus_date: string | null
          has_hardness: boolean | null
          has_ut: boolean | null
          hv_criteria_max: number | null
          hv_criteria_min: number | null
          hv_pass: boolean | null
          hv_rail_left: number | null
          hv_rail_right: number | null
          hv_weld_center: number | null
          id: string
          mold_type: string | null
          notes: string | null
          operator_cert_ref: string | null
          operator_name: string | null
          overall_result: string
          pk_location: string
          portion_brand: string | null
          portion_lot: string | null
          post_weld_checks: Json | null
          ppi_instance_id: string | null
          preheat_duration_min: number | null
          preheat_equipment: string | null
          preheat_pass: boolean | null
          preheat_temp_c: number | null
          project_id: string
          rail_profile: string
          rejection_reason: string | null
          track_side: string | null
          updated_at: string
          us_equipment_code: string | null
          us_equipment_serial: string | null
          us_frequency_mhz: number | null
          us_inspection_zones: Json | null
          us_norm_class: string | null
          ut_calibration_date: string | null
          ut_defect_desc: string | null
          ut_equipment_code: string | null
          ut_operator: string | null
          ut_result: string | null
          visual_notes: string | null
          visual_pass: boolean | null
          weld_date: string
          weld_type: string
          work_item_id: string | null
          wps_ref: string | null
        }
        Insert: {
          alignment_criteria?: number | null
          alignment_mm?: number | null
          alignment_pass?: boolean | null
          cert_operator_us?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          excess_material_ok?: boolean | null
          fus_code?: string | null
          fus_date?: string | null
          has_hardness?: boolean | null
          has_ut?: boolean | null
          hv_criteria_max?: number | null
          hv_criteria_min?: number | null
          hv_pass?: boolean | null
          hv_rail_left?: number | null
          hv_rail_right?: number | null
          hv_weld_center?: number | null
          id?: string
          mold_type?: string | null
          notes?: string | null
          operator_cert_ref?: string | null
          operator_name?: string | null
          overall_result?: string
          pk_location: string
          portion_brand?: string | null
          portion_lot?: string | null
          post_weld_checks?: Json | null
          ppi_instance_id?: string | null
          preheat_duration_min?: number | null
          preheat_equipment?: string | null
          preheat_pass?: boolean | null
          preheat_temp_c?: number | null
          project_id: string
          rail_profile?: string
          rejection_reason?: string | null
          track_side?: string | null
          updated_at?: string
          us_equipment_code?: string | null
          us_equipment_serial?: string | null
          us_frequency_mhz?: number | null
          us_inspection_zones?: Json | null
          us_norm_class?: string | null
          ut_calibration_date?: string | null
          ut_defect_desc?: string | null
          ut_equipment_code?: string | null
          ut_operator?: string | null
          ut_result?: string | null
          visual_notes?: string | null
          visual_pass?: boolean | null
          weld_date?: string
          weld_type?: string
          work_item_id?: string | null
          wps_ref?: string | null
        }
        Update: {
          alignment_criteria?: number | null
          alignment_mm?: number | null
          alignment_pass?: boolean | null
          cert_operator_us?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          excess_material_ok?: boolean | null
          fus_code?: string | null
          fus_date?: string | null
          has_hardness?: boolean | null
          has_ut?: boolean | null
          hv_criteria_max?: number | null
          hv_criteria_min?: number | null
          hv_pass?: boolean | null
          hv_rail_left?: number | null
          hv_rail_right?: number | null
          hv_weld_center?: number | null
          id?: string
          mold_type?: string | null
          notes?: string | null
          operator_cert_ref?: string | null
          operator_name?: string | null
          overall_result?: string
          pk_location?: string
          portion_brand?: string | null
          portion_lot?: string | null
          post_weld_checks?: Json | null
          ppi_instance_id?: string | null
          preheat_duration_min?: number | null
          preheat_equipment?: string | null
          preheat_pass?: boolean | null
          preheat_temp_c?: number | null
          project_id?: string
          rail_profile?: string
          rejection_reason?: string | null
          track_side?: string | null
          updated_at?: string
          us_equipment_code?: string | null
          us_equipment_serial?: string | null
          us_frequency_mhz?: number | null
          us_inspection_zones?: Json | null
          us_norm_class?: string | null
          ut_calibration_date?: string | null
          ut_defect_desc?: string | null
          ut_equipment_code?: string | null
          ut_operator?: string | null
          ut_result?: string | null
          visual_notes?: string | null
          visual_pass?: boolean | null
          weld_date?: string
          weld_type?: string
          work_item_id?: string | null
          wps_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weld_records_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "ppi_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_records_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["ppi_instance_id"]
          },
          {
            foreignKeyName: "weld_records_ppi_instance_id_fkey"
            columns: ["ppi_instance_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["ppi_id"]
          },
          {
            foreignKeyName: "weld_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weld_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weld_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weld_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weld_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weld_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weld_records_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "weld_records_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "weld_records_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "weld_records_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "weld_records_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "work_item_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_item_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "work_item_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_item_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            foreignKeyName: "work_item_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_supplier_scorecard"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "work_item_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "work_item_materials_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "work_item_materials_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "work_item_materials_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "work_item_materials_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
      worker_qualifications: {
        Row: {
          cert_ref: string | null
          created_at: string
          created_by: string | null
          id: string
          issued_by: string | null
          notes: string | null
          project_id: string
          qual_code: string
          qualification: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          worker_id: string | null
          worker_name: string
        }
        Insert: {
          cert_ref?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          project_id: string
          qual_code: string
          qualification: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          worker_id?: string | null
          worker_name: string
        }
        Update: {
          cert_ref?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          project_id?: string
          qual_code?: string
          qualification?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          worker_id?: string | null
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "worker_qualifications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "project_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_qualifications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "vw_worker_training_gap"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "worker_qualifications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "vw_workers_training_status"
            referencedColumns: ["worker_id"]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      view_concrete_lot_conformity: {
        Row: {
          concrete_class: string | null
          criterion_applied: string | null
          date_end: string | null
          date_start: string | null
          element_desc: string | null
          exc_class: string | null
          fck_mpa: number | null
          freq_m3_per_sample: number | null
          lot_code: string | null
          lot_id: string | null
          mean_fc_28d: number | null
          min_fc_28d: number | null
          n_batches: number | null
          n_required_min: number | null
          n_tested_28d: number | null
          na_m_result: string | null
          project_id: string | null
          stddev_fc_28d: number | null
          volume_total_m3: number | null
        }
        Relationships: [
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      view_concrete_summary: {
        Row: {
          concrete_class: string | null
          exc_class: string | null
          fck_mpa: number | null
          freq_norm_m3: number | null
          max_fc_28d: number | null
          mean_fc_28d: number | null
          min_fc_28d: number | null
          n_batches: number | null
          n_lots: number | null
          n_overdue_specimens: number | null
          n_specimens_28d: number | null
          n_tested_28d: number | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      view_due_tests_by_discipline: {
        Row: {
          disciplina: string | null
          done: number | null
          due_next_30d: number | null
          due_next_7d: number | null
          overdue: number | null
          project_id: string | null
          total: number | null
        }
        Relationships: [
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_due_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "test_due_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_due_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
      view_pe_annexb_pf17a: {
        Row: {
          acceptance_criteria: string | null
          active: boolean | null
          description: string | null
          disciplina: string | null
          frequency: string | null
          id: string | null
          material_scope: string | null
          project_id: string | null
          requires_lab: boolean | null
          standards: string[] | null
          test_code: string | null
          test_name: string | null
          unit: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          active?: boolean | null
          description?: string | null
          disciplina?: string | null
          frequency?: string | null
          id?: string | null
          material_scope?: string | null
          project_id?: string | null
          requires_lab?: boolean | null
          standards?: string[] | null
          test_code?: string | null
          test_name?: string | null
          unit?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          active?: boolean | null
          description?: string | null
          disciplina?: string | null
          frequency?: string | null
          id?: string | null
          material_scope?: string | null
          project_id?: string | null
          requires_lab?: boolean | null
          standards?: string[] | null
          test_code?: string | null
          test_name?: string | null
          unit?: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tests_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tests_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tests_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tests_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      view_physical_tests_monthly: {
        Row: {
          com_resultado: number | null
          conforme: number | null
          month: string | null
          nao_conforme: number | null
          pendente: number | null
          project_id: string | null
          taxa_conformidade_pct: number | null
          tipo: string | null
          total: number | null
        }
        Relationships: []
      }
      view_physical_tests_monthly_total: {
        Row: {
          com_resultado: number | null
          conforme: number | null
          month: string | null
          nao_conforme: number | null
          project_id: string | null
          taxa_conformidade_pct: number | null
          total: number | null
        }
        Relationships: []
      }
      view_quality_dashboard: {
        Row: {
          concrete_overdue_specimens: number | null
          nc_major_open: number | null
          nc_open: number | null
          ppi_in_progress: number | null
          project_id: string | null
          project_name: string | null
          tests_overdue: number | null
          welds_pending_ut: number | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_concrete_conformity_ce: {
        Row: {
          concrete_class: string | null
          criterio_aplicado: string | null
          exc_class: string | null
          fci_min_28d: number | null
          fck_mpa: number | null
          fcm_28d: number | null
          n_amassadas: number | null
          n_provetes_28d: number | null
          n_provetes_atraso: number | null
          project_id: string | null
          resultado_nam: string | null
          s_28d: number | null
        }
        Relationships: [
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "concrete_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_daily_report_context: {
        Row: {
          disciplina: string | null
          elemento: string | null
          equipment_rows: number | null
          hp_pending: number | null
          labour_rows: number | null
          materials_rows: number | null
          nc_critical: number | null
          nc_open: number | null
          parte: string | null
          ppi_active: number | null
          ppi_approved: number | null
          project_id: string | null
          readiness_status: string | null
          report_date: string | null
          report_id: string | null
          report_number: string | null
          sector: string | null
          status: string | null
          tests_overdue: number | null
          total_hours: number | null
          work_item_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "daily_reports_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "daily_reports_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "daily_reports_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "daily_reports_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
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
      vw_dfo_completeness: {
        Row: {
          auto_complete: boolean | null
          code: string | null
          document_type: string | null
          effective_status: string | null
          id: string | null
          linked_doc_id: string | null
          project_id: string | null
          sort_order: number | null
          status: string | null
          support_count: string | null
          title: string | null
          volume_id: string | null
          volume_no: number | null
          volume_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfo_items_linked_doc_id_fkey"
            columns: ["linked_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "dfo_volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_dfo_volume_progress: {
        Row: {
          complete_items: number | null
          completion_pct: number | null
          pending_items: number | null
          project_id: string | null
          total_items: number | null
          volume_no: number | null
          volume_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dfo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_hp_calendar: {
        Row: {
          activity: string | null
          code: string | null
          confirmed_at: string | null
          day_of_week: number | null
          disciplina: string | null
          hp_id: string | null
          location_pk: string | null
          parte: string | null
          planned_date: string | null
          planned_datetime: string | null
          point_no: string | null
          ppi_code: string | null
          ppi_instance_id: string | null
          ppi_ref: string | null
          ppi_status: string | null
          project_id: string | null
          sector: string | null
          status: string | null
          week_start: string | null
          work_item_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hp_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_monthly_quality_summary: {
        Row: {
          concrete_batches_month: number | null
          current_month: string | null
          daily_reports_month: number | null
          deadlines_critical_30d: number | null
          hp_confirmed_this_month: number | null
          hp_pending: number | null
          nc_closed_this_month: number | null
          nc_critical_open: number | null
          nc_open: number | null
          ppi_approved_this_month: number | null
          ppi_in_progress: number | null
          project_id: string | null
          topo_controls_month: number | null
          topo_fail_month: number | null
          welds_fail_month: number | null
          welds_month: number | null
        }
        Insert: {
          concrete_batches_month?: never
          current_month?: never
          daily_reports_month?: never
          deadlines_critical_30d?: never
          hp_confirmed_this_month?: never
          hp_pending?: never
          nc_closed_this_month?: never
          nc_critical_open?: never
          nc_open?: never
          ppi_approved_this_month?: never
          ppi_in_progress?: never
          project_id?: string | null
          topo_controls_month?: never
          topo_fail_month?: never
          welds_fail_month?: never
          welds_month?: never
        }
        Update: {
          concrete_batches_month?: never
          current_month?: never
          daily_reports_month?: never
          deadlines_critical_30d?: never
          hp_confirmed_this_month?: never
          hp_pending?: never
          nc_closed_this_month?: never
          nc_critical_open?: never
          nc_open?: never
          ppi_approved_this_month?: never
          ppi_in_progress?: never
          project_id?: string | null
          topo_controls_month?: never
          topo_fail_month?: never
          welds_fail_month?: never
          welds_month?: never
        }
        Relationships: []
      }
      vw_nc_aging: {
        Row: {
          aging_0_30d: number | null
          aging_30_60d: number | null
          aging_60_90d: number | null
          aging_90d_plus: number | null
          avg_days_open: number | null
          discipline: string | null
          max_days_open: number | null
          project_id: string | null
          severity: string | null
          total_open: number | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "non_conformities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "ppi_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_ppi_template_stats: {
        Row: {
          approval_rate_pct: number | null
          avg_cycle_days: number | null
          disciplina: string | null
          instances_approved: number | null
          instances_pending: number | null
          instances_rejected: number | null
          instances_total: number | null
          items_fail_total: number | null
          items_pass_total: number | null
          project_id: string | null
          template_code: string | null
          template_id: string | null
          template_title: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ppi_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_programa_ensaios_mensal: {
        Row: {
          concluidos: number | null
          mes_codigo: string | null
          mes_programa: string | null
          pct_execucao: number | null
          previstos: number | null
          project_id: string | null
          total_ensaios: number | null
          vencidos: number | null
        }
        Relationships: [
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_due_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "test_due_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_due_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
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
      vw_qualifications_expiring: {
        Row: {
          cert_ref: string | null
          dias_para_expirar: number | null
          estado_validade: string | null
          id: string | null
          issued_by: string | null
          notes: string | null
          project_id: string | null
          qual_code: string | null
          qualification: string | null
          valid_from: string | null
          valid_until: string | null
          worker_name: string | null
        }
        Insert: {
          cert_ref?: string | null
          dias_para_expirar?: never
          estado_validade?: never
          id?: string | null
          issued_by?: string | null
          notes?: string | null
          project_id?: string | null
          qual_code?: string | null
          qualification?: string | null
          valid_from?: string | null
          valid_until?: string | null
          worker_name?: string | null
        }
        Update: {
          cert_ref?: string | null
          dias_para_expirar?: never
          estado_validade?: never
          id?: string | null
          issued_by?: string | null
          notes?: string | null
          project_id?: string | null
          qual_code?: string | null
          qualification?: string | null
          valid_from?: string | null
          valid_until?: string | null
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_rdc_distribuicao: {
        Row: {
          ack_ref: string | null
          confirmed_at: string | null
          copy_number: number | null
          created_at: string | null
          delivered_at: string | null
          delivered_by_email: string | null
          delivery_method: string | null
          doc_code: string | null
          doc_revision: string | null
          id: string | null
          notes: string | null
          plan_revision: string | null
          plan_title: string | null
          plan_type: string | null
          project_id: string | null
          rdc_code: string | null
          received_confirmed: boolean | null
          recipient_entity: string | null
          recipient_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plan_controlled_copies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_rm_kpis: {
        Row: {
          hp_approved: number | null
          hp_total: number | null
          kpi_hp_rate_pct: number | null
          kpi_hp_status: string | null
          kpi_nc_overdue_status: string | null
          kpi_pame_status: string | null
          kpi_tests_pass_pct: number | null
          kpi_tests_status: string | null
          kpi_us_status: string | null
          mat_approved: number | null
          mat_pending: number | null
          mat_total: number | null
          nc_open: number | null
          nc_overdue_15d: number | null
          project_code: string | null
          project_id: string | null
          project_name: string | null
          tests_pass: number | null
          tests_total: number | null
          welds_total: number | null
          welds_us_ok: number | null
          welds_us_pending: number | null
        }
        Relationships: []
      }
      vw_sgq_matrix_summary: {
        Row: {
          audits_completed: number | null
          audits_total: number | null
          calibrations_total: number | null
          calibrations_valid: number | null
          docs_approved: number | null
          docs_in_review: number | null
          docs_total: number | null
          materials_approved: number | null
          materials_pending: number | null
          materials_total: number | null
          nc_closed: number | null
          nc_open: number | null
          nc_total: number | null
          ppi_completed: number | null
          ppi_pending: number | null
          ppi_total: number | null
          project_id: string | null
          subcontractors_total: number | null
          tests_fail: number | null
          tests_pass: number | null
          tests_total: number | null
          training_attendees: number | null
          training_total: number | null
        }
        Insert: {
          audits_completed?: never
          audits_total?: never
          calibrations_total?: never
          calibrations_valid?: never
          docs_approved?: never
          docs_in_review?: never
          docs_total?: never
          materials_approved?: never
          materials_pending?: never
          materials_total?: never
          nc_closed?: never
          nc_open?: never
          nc_total?: never
          ppi_completed?: never
          ppi_pending?: never
          ppi_total?: never
          project_id?: string | null
          subcontractors_total?: never
          tests_fail?: never
          tests_pass?: never
          tests_total?: never
          training_attendees?: never
          training_total?: never
        }
        Update: {
          audits_completed?: never
          audits_total?: never
          calibrations_total?: never
          calibrations_valid?: never
          docs_approved?: never
          docs_in_review?: never
          docs_total?: never
          materials_approved?: never
          materials_pending?: never
          materials_total?: never
          nc_closed?: never
          nc_open?: never
          nc_total?: never
          ppi_completed?: never
          ppi_pending?: never
          ppi_total?: never
          project_id?: string | null
          subcontractors_total?: never
          tests_fail?: never
          tests_pass?: never
          tests_total?: never
          training_attendees?: never
          training_total?: never
        }
        Relationships: []
      }
      vw_supplier_scorecard: {
        Row: {
          approval_status: string | null
          category: string | null
          evaluations_total: number | null
          last_eval_date: string | null
          last_eval_result: string | null
          lots_approved: number | null
          lots_quarantine: number | null
          lots_rejected: number | null
          nc_critical: number | null
          nc_open: number | null
          project_id: string | null
          qualification_status: string | null
          quality_score: number | null
          score_avg: number | null
          supplier_code: string | null
          supplier_id: string | null
          supplier_name: string | null
          tests_fail: number | null
          tests_total: number | null
          total_lots: number | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_topography_cycle: {
        Row: {
          control_date: string | null
          control_element: string | null
          control_id: string | null
          control_result: string | null
          cycle_status: string | null
          days_to_execute: number | null
          deviation: string | null
          equipment_code: string | null
          measured_value: string | null
          parte: string | null
          priority: string | null
          project_id: string | null
          request_date: string | null
          request_description: string | null
          request_id: string | null
          request_status: string | null
          request_type: string | null
          request_zone: string | null
          sector: string | null
          technician: string | null
          tolerance: string | null
          work_item_id: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "topography_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "topography_requests_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_hp_calendar"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "topography_requests_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_traceability_matrix"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "topography_requests_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_quality_summary"
            referencedColumns: ["work_item_id"]
          },
          {
            foreignKeyName: "topography_requests_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "vw_work_item_readiness_detail"
            referencedColumns: ["work_item_id"]
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
      vw_traceability_matrix: {
        Row: {
          concrete_batches: number | null
          concrete_tested: number | null
          lot_ce: boolean | null
          lot_code: string | null
          lot_id: string | null
          lot_qty: number | null
          lot_status: string | null
          lot_unit: string | null
          material_approval: string | null
          material_category: string | null
          material_code: string | null
          material_created_at: string | null
          material_id: string | null
          material_name: string | null
          material_status: string | null
          nc_open: number | null
          nc_total: number | null
          pame_status: string | null
          ppi_code: string | null
          ppi_id: string | null
          ppi_status: string | null
          project_id: string | null
          reception_date: string | null
          supplier_code: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_qual: string | null
          wi_disciplina: string | null
          wi_elemento: string | null
          wi_parte: string | null
          wi_readiness: string | null
          wi_sector: string | null
          wi_status: string | null
          work_item_id: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_work_item_quality_summary: {
        Row: {
          compaction_fail: number | null
          compaction_pass: number | null
          compaction_total: number | null
          concrete_batches: number | null
          concrete_fail: number | null
          concrete_tested: number | null
          disciplina: string | null
          elemento: string | null
          nc_critical: number | null
          nc_open: number | null
          nc_total: number | null
          parte: string | null
          ppi_approved: number | null
          ppi_pending: number | null
          ppi_total: number | null
          project_id: string | null
          readiness_status: string | null
          sector: string | null
          soils_fail: number | null
          soils_pass: number | null
          soils_total: number | null
          status: string | null
          topo_controls: number | null
          topo_fail: number | null
          topo_requests: number | null
          welds_fail: number | null
          welds_pass: number | null
          welds_pending: number | null
          welds_total: number | null
          work_item_id: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_work_item_readiness_detail: {
        Row: {
          blocking_soils: Json | null
          blocking_welds: Json | null
          disciplina: string | null
          elemento: string | null
          open_ncs: Json | null
          overdue_tests: Json | null
          parte: string | null
          pending_ppis: Json | null
          project_id: string | null
          readiness_status: string | null
          sector: string | null
          status: string | null
          work_item_id: string | null
        }
        Insert: {
          blocking_soils?: never
          blocking_welds?: never
          disciplina?: string | null
          elemento?: string | null
          open_ncs?: never
          overdue_tests?: never
          parte?: string | null
          pending_ppis?: never
          project_id?: string | null
          readiness_status?: string | null
          sector?: string | null
          status?: string | null
          work_item_id?: string | null
        }
        Update: {
          blocking_soils?: never
          blocking_welds?: never
          disciplina?: string | null
          elemento?: string | null
          open_ncs?: never
          overdue_tests?: never
          parte?: string | null
          pending_ppis?: never
          project_id?: string | null
          readiness_status?: string | null
          sector?: string | null
          status?: string | null
          work_item_id?: string | null
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
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
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
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
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_worker_training_gap: {
        Row: {
          all_signed: boolean | null
          company: string | null
          days_since_last_training: number | null
          has_safety_training: boolean | null
          last_training_date: string | null
          name: string | null
          project_id: string | null
          role_function: string | null
          sessions_attended: number | null
          status: string | null
          subcontractor_id: string | null
          subcontractor_name: string | null
          training_status: string | null
          training_types: string | null
          worker_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_workers_training_status: {
        Row: {
          company: string | null
          has_safety_training: boolean | null
          last_training_date: string | null
          name: string | null
          project_id: string | null
          role_function: string | null
          sessions_attended: number | null
          sessions_signed: number | null
          subcontractor_id: string | null
          subcontractor_name: string | null
          training_status: string | null
          training_types: string | null
          worker_id: string | null
          worker_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_dashboard_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_quality_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_monthly_quality_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_rm_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_sgq_matrix_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_workers_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
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
      fn_check_and_increment_rate_limit: {
        Args: {
          p_max_per_hour?: number
          p_project_id: string
          p_user_id: string
        }
        Returns: boolean
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
          drive_file_name: string | null
          drive_url: string | null
          external_approval_entity: string | null
          external_approval_ref: string | null
          external_approved_at: string | null
          external_approved_by: string | null
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
          fav_documents: Json | null
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
          technical_comparison: Json | null
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
      fn_create_nc:
        | {
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
              audit_id: string | null
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
        | {
            Args: {
              p_ac_efficacy_indicator?: string
              p_assigned_to?: string
              p_audit_origin_type?: string
              p_category?: string
              p_category_outro?: string
              p_classification?: string
              p_correction?: string
              p_correction_type?: string
              p_corrective_action?: string
              p_description: string
              p_detected_at?: string
              p_deviation_justification?: string
              p_discipline?: string
              p_discipline_outro?: string
              p_document_id?: string
              p_due_date?: string
              p_efficacy_analysis?: string
              p_location_pk?: string
              p_origin?: string
              p_ppi_instance_id?: string
              p_ppi_instance_item_id?: string
              p_preventive_action?: string
              p_project_id: string
              p_reference?: string
              p_responsible?: string
              p_root_cause?: string
              p_root_cause_method?: string
              p_severity?: string
              p_subcontractor_id?: string
              p_supplier_id?: string
              p_test_result_id?: string
              p_title: string
              p_violated_requirement?: string
              p_work_item_id?: string
            }
            Returns: {
              ac_efficacy_indicator: string | null
              actual_completion_date: string | null
              approver: string | null
              assigned_to: string | null
              audit_id: string | null
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
          audit_id: string | null
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
          audit_id: string | null
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
      fn_create_ppi_instance: {
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
          ambient_temperature: number | null
          approved_at: string | null
          approved_by: string | null
          be_campo_code: string | null
          be_code: string | null
          code: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          deleted_by: string | null
          eme_calibration_date: string | null
          eme_code: string | null
          gr_id: string | null
          id: string
          is_deleted: boolean
          lab_report_ref: string | null
          location: string | null
          location_pk: string | null
          material: string | null
          material_id: string | null
          material_outro: string | null
          notes: string | null
          pass_fail: string | null
          pk_fim: number | null
          pk_inicio: number | null
          ppi_instance_id: string | null
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
          weather: string | null
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
          contract_number: string | null
          contractor: string | null
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
      fn_monthly_kpi_autofill: {
        Args: { p_project_id: string; p_reference_month: string }
        Returns: Json
      }
      fn_next_audit_code: { Args: { p_project_id: string }; Returns: string }
      fn_next_be_campo_code: {
        Args: { p_project_id: string; p_test_type?: string }
        Returns: string
      }
      fn_next_compaction_code: {
        Args: { p_project_id: string }
        Returns: string
      }
      fn_next_concrete_batch_code: {
        Args: { p_project_id: string }
        Returns: string
      }
      fn_next_concrete_lot_code: {
        Args: { p_project_id: string }
        Returns: string
      }
      fn_next_gr_code: { Args: { p_project_id: string }; Returns: string }
      fn_next_hp_notification_code: {
        Args: { p_project_id: string }
        Returns: string
      }
      fn_next_lot_code: {
        Args: { p_material_code: string; p_project_id: string }
        Returns: string
      }
      fn_next_ppi_code: {
        Args: { p_disciplina?: string; p_project_id: string }
        Returns: string
      }
      fn_next_rmsgq_code: { Args: { p_project_id: string }; Returns: string }
      fn_next_soil_code: { Args: { p_project_id: string }; Returns: string }
      fn_next_tech_office_code: {
        Args: { p_prefix: string; p_project_id: string }
        Returns: string
      }
      fn_next_training_code: { Args: { p_project_id: string }; Returns: string }
      fn_next_weld_code: { Args: { p_project_id: string }; Returns: string }
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
              element_ref: string | null
              id: string
              inspection_date: string | null
              inspector_id: string | null
              is_deleted: boolean
              opened_at: string
              pk_fim: string | null
              pk_inicio: string | null
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
              zone: string | null
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
              element_ref: string | null
              id: string
              inspection_date: string | null
              inspector_id: string | null
              is_deleted: boolean
              opened_at: string
              pk_fim: string | null
              pk_inicio: string | null
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
              zone: string | null
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
      fn_update_lot_status: {
        Args: {
          p_lot_id: string
          p_nc_id?: string
          p_new_status: string
          p_notes?: string
          p_user_id: string
        }
        Returns: Json
      }
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
          audit_id: string | null
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
          ambient_temperature: number | null
          approved_at: string | null
          approved_by: string | null
          be_campo_code: string | null
          be_code: string | null
          code: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          deleted_by: string | null
          eme_calibration_date: string | null
          eme_code: string | null
          gr_id: string | null
          id: string
          is_deleted: boolean
          lab_report_ref: string | null
          location: string | null
          location_pk: string | null
          material: string | null
          material_id: string | null
          material_outro: string | null
          notes: string | null
          pass_fail: string | null
          pk_fim: number | null
          pk_inicio: number | null
          ppi_instance_id: string | null
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
          weather: string | null
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
