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
      budgets: {
        Row: {
          id: string
          user_id: string
          budget_name: string | null
          category: string | null
          planned_amount: number
          actual_amount: number
          period_start: string | null
          period_end: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          budget_name?: string | null
          category?: string | null
          planned_amount?: number
          actual_amount?: number
          period_start?: string | null
          period_end?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          budget_name?: string | null
          category?: string | null
          planned_amount?: number
          actual_amount?: number
          period_start?: string | null
          period_end?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          record_id: string
          session_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          record_id: string
          session_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          record_id?: string
          session_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ciusss_fee_schedules: {
        Row: {
          base_fee: number
          created_at: string | null
          description: string
          effective_date: string | null
          expiry_date: string | null
          id: string
          internal_code: string
          notes: string | null
          payer_type: string | null
          requires_modifier: boolean | null
          site_code: string
          site_name: string
          specialty: string | null
          standard_ramq_code: string | null
        }
        Insert: {
          base_fee: number
          created_at?: string | null
          description: string
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          internal_code: string
          notes?: string | null
          payer_type?: string | null
          requires_modifier?: boolean | null
          site_code: string
          site_name: string
          specialty?: string | null
          standard_ramq_code?: string | null
        }
        Update: {
          base_fee?: number
          created_at?: string | null
          description?: string
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          internal_code?: string
          notes?: string | null
          payer_type?: string | null
          requires_modifier?: boolean | null
          site_code?: string
          site_name?: string
          specialty?: string | null
          standard_ramq_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ciusss_fee_schedules_payer_type_fkey"
            columns: ["payer_type"]
            isOneToOne: false
            referencedRelation: "payer_types"
            referencedColumns: ["code"]
          },
        ]
      }
      diplomatic_claims: {
        Row: {
          amount_received: number | null
          authorization_number: string | null
          billing_contact_email: string | null
          billing_contact_name: string | null
          billing_contact_phone: string | null
          classification_level: string | null
          country_code: string
          created_at: string | null
          diplomatic_protocol_number: string | null
          embassy_or_consulate: string
          id: string
          notes: string | null
          patient_code: string
          requires_encryption: boolean | null
          security_clearance_level: string | null
          service_codes: Json | null
          service_date: string
          status: string | null
          submitted_at: string | null
          total_claimed: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount_received?: number | null
          authorization_number?: string | null
          billing_contact_email?: string | null
          billing_contact_name?: string | null
          billing_contact_phone?: string | null
          classification_level?: string | null
          country_code: string
          created_at?: string | null
          diplomatic_protocol_number?: string | null
          embassy_or_consulate: string
          id?: string
          notes?: string | null
          patient_code: string
          requires_encryption?: boolean | null
          security_clearance_level?: string | null
          service_codes?: Json | null
          service_date: string
          status?: string | null
          submitted_at?: string | null
          total_claimed: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount_received?: number | null
          authorization_number?: string | null
          billing_contact_email?: string | null
          billing_contact_name?: string | null
          billing_contact_phone?: string | null
          classification_level?: string | null
          country_code?: string
          created_at?: string | null
          diplomatic_protocol_number?: string | null
          embassy_or_consulate?: string
          id?: string
          notes?: string | null
          patient_code?: string
          requires_encryption?: boolean | null
          security_clearance_level?: string | null
          service_codes?: Json | null
          service_date?: string
          status?: string | null
          submitted_at?: string | null
          total_claimed?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          doctor_id: string | null
          expense_date: string | null
          id: string
          is_reimbursable: boolean | null
          notes: string | null
          partner_id: string | null
          payment_method: string | null
          receipt_url: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          doctor_id?: string | null
          expense_date?: string | null
          id?: string
          is_reimbursable?: boolean | null
          notes?: string | null
          partner_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          doctor_id?: string | null
          expense_date?: string | null
          id?: string
          is_reimbursable?: boolean | null
          notes?: string | null
          partner_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      federal_claims: {
        Row: {
          amount_approved: number | null
          amount_received: number | null
          approval_number: string | null
          authorizing_officer: string | null
          claim_number: string | null
          created_at: string | null
          id: string
          notes: string | null
          patient_federal_id: string | null
          patient_name: string
          payer_type: string | null
          prior_auth_date: string | null
          prior_auth_number: string | null
          rejection_reason: string | null
          service_codes: Json | null
          service_date: string
          status: string | null
          submitted_at: string | null
          submitted_via: string | null
          total_claimed: number
          unit_or_facility: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount_approved?: number | null
          amount_received?: number | null
          approval_number?: string | null
          authorizing_officer?: string | null
          claim_number?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_federal_id?: string | null
          patient_name: string
          payer_type?: string | null
          prior_auth_date?: string | null
          prior_auth_number?: string | null
          rejection_reason?: string | null
          service_codes?: Json | null
          service_date: string
          status?: string | null
          submitted_at?: string | null
          submitted_via?: string | null
          total_claimed: number
          unit_or_facility?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount_approved?: number | null
          amount_received?: number | null
          approval_number?: string | null
          authorizing_officer?: string | null
          claim_number?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_federal_id?: string | null
          patient_name?: string
          payer_type?: string | null
          prior_auth_date?: string | null
          prior_auth_number?: string | null
          rejection_reason?: string | null
          service_codes?: Json | null
          service_date?: string
          status?: string | null
          submitted_at?: string | null
          submitted_via?: string | null
          total_claimed?: number
          unit_or_facility?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "federal_claims_payer_type_fkey"
            columns: ["payer_type"]
            isOneToOne: false
            referencedRelation: "payer_types"
            referencedColumns: ["code"]
          },
        ]
      }
      hanging_claims: {
        Row: {
          amount_outstanding: number
          claim_number: string | null
          created_at: string | null
          days_outstanding: number
          id: string
          last_follow_up: string | null
          patient_name: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount_outstanding: number
          claim_number?: string | null
          created_at?: string | null
          days_outstanding?: number
          id?: string
          last_follow_up?: string | null
          patient_name: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount_outstanding?: number
          claim_number?: string | null
          created_at?: string | null
          days_outstanding?: number
          id?: string
          last_follow_up?: string | null
          patient_name?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      healthcare_directory: {
        Row: {
          base_fee: number | null
          category: string
          code: string | null
          created_at: string | null
          description: string | null
          id: number
          name: string
          specialty: string | null
          sub_type: string | null
          updated_at: string | null
        }
        Insert: {
          base_fee?: number | null
          category: string
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          specialty?: string | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Update: {
          base_fee?: number | null
          category?: string
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          specialty?: string | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_batches: {
        Row: {
          batch_date: string | null
          batch_name: string | null
          company_id: string | null
          created_at: string | null
          id: string
          invoice_count: number | null
          notes: string | null
          partner_id: string | null
          received_at: string | null
          status: string | null
          submitted_at: string | null
          total_amount: number | null
          transferred_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          batch_date?: string | null
          batch_name?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          invoice_count?: number | null
          notes?: string | null
          partner_id?: string | null
          received_at?: string | null
          status?: string | null
          submitted_at?: string | null
          total_amount?: number | null
          transferred_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          batch_date?: string | null
          batch_name?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          invoice_count?: number | null
          notes?: string | null
          partner_id?: string | null
          received_at?: string | null
          status?: string | null
          submitted_at?: string | null
          total_amount?: number | null
          transferred_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "invoicing_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          amount_paid: number | null
          batch_id: string | null
          consultation_date: string | null
          created_at: string | null
          deleted_at: string | null
          doctor_id: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          partner_id: string | null
          partner_type: string | null
          patient_id: string | null
          patient_name: string | null
          patient_ramq: string | null
          payment_date: string | null
          service_type: string
          status: string | null
          total_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          batch_id?: string | null
          consultation_date?: string | null
          created_at?: string | null
          deleted_at?: string | null
          doctor_id?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          partner_id?: string | null
          partner_type?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_ramq?: string | null
          payment_date?: string | null
          service_type: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          batch_id?: string | null
          consultation_date?: string | null
          created_at?: string | null
          deleted_at?: string | null
          doctor_id?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          partner_id?: string | null
          partner_type?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_ramq?: string | null
          payment_date?: string | null
          service_type?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoicing_companies: {
        Row: {
          address: string | null
          billing_code: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          tax_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          billing_code?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          billing_code?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      localities: {
        Row: {
          created_at: string | null
          id: string
          locality_code: string
          name: string
          tariff_territory: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          locality_code: string
          name: string
          tariff_territory?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          locality_code?: string
          name?: string
          tariff_territory?: string | null
        }
        Relationships: []
      }
      out_of_province_claims: {
        Row: {
          agreement_details: string | null
          amount_received: number | null
          billing_method: string | null
          claim_number: string | null
          created_at: string | null
          has_reciprocal_agreement: boolean | null
          id: string
          notes: string | null
          patient_health_number: string
          patient_name: string
          patient_province: string
          province_code: string
          province_health_plan: string | null
          service_codes: Json | null
          service_date: string
          status: string | null
          submitted_at: string | null
          total_claimed: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agreement_details?: string | null
          amount_received?: number | null
          billing_method?: string | null
          claim_number?: string | null
          created_at?: string | null
          has_reciprocal_agreement?: boolean | null
          id?: string
          notes?: string | null
          patient_health_number: string
          patient_name: string
          patient_province: string
          province_code: string
          province_health_plan?: string | null
          service_codes?: Json | null
          service_date: string
          status?: string | null
          submitted_at?: string | null
          total_claimed: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agreement_details?: string | null
          amount_received?: number | null
          billing_method?: string | null
          claim_number?: string | null
          created_at?: string | null
          has_reciprocal_agreement?: boolean | null
          id?: string
          notes?: string | null
          patient_health_number?: string
          patient_name?: string
          patient_province?: string
          province_code?: string
          province_health_plan?: string | null
          service_codes?: Json | null
          service_date?: string
          status?: string | null
          submitted_at?: string | null
          total_claimed?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          address: string | null
          category: string
          contact_person: string | null
          created_at: string | null
          email: string | null
          facility_type: string | null
          id: string
          is_default: boolean | null
          name: string
          partner_code: string | null
          partner_type: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          category: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          facility_type?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          partner_code?: string | null
          partner_type?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          facility_type?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          partner_code?: string | null
          partner_type?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payer_types: {
        Row: {
          active: boolean | null
          code: string
          contact_info: Json | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          payment_timeline_days: number | null
          requires_prior_auth: boolean | null
          submission_format: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          payment_timeline_days?: number | null
          requires_prior_auth?: boolean | null
          submission_format?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          payment_timeline_days?: number | null
          requires_prior_auth?: boolean | null
          submission_format?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          reference_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_settings: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string | null
          facility_type: string | null
          id: string
          institution_number: string | null
          practice_address: string | null
          practice_name: string | null
          primary_facility_code: string | null
          primary_facility_name: string | null
          site_appartenance: string | null
          tax_number: string | null
          transit_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          facility_type?: string | null
          id?: string
          institution_number?: string | null
          practice_address?: string | null
          practice_name?: string | null
          primary_facility_code?: string | null
          primary_facility_name?: string | null
          site_appartenance?: string | null
          tax_number?: string | null
          transit_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          facility_type?: string | null
          id?: string
          institution_number?: string | null
          practice_address?: string | null
          practice_name?: string | null
          primary_facility_code?: string | null
          primary_facility_name?: string | null
          site_appartenance?: string | null
          tax_number?: string | null
          transit_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          license_number: string | null
          locality_id: string | null
          phone: string | null
          practice_name: string | null
          prefix: string | null
          privacy_consent_date: string | null
          privacy_consent_given: boolean | null
          professional_categories: string[] | null
          professional_category: string | null
          ramq_number: string | null
          remuneration_modes: string[] | null
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          license_number?: string | null
          locality_id?: string | null
          phone?: string | null
          practice_name?: string | null
          prefix?: string | null
          privacy_consent_date?: string | null
          privacy_consent_given?: boolean | null
          professional_categories?: string[] | null
          professional_category?: string | null
          ramq_number?: string | null
          remuneration_modes?: string[] | null
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          license_number?: string | null
          locality_id?: string | null
          phone?: string | null
          practice_name?: string | null
          prefix?: string | null
          privacy_consent_date?: string | null
          privacy_consent_given?: boolean | null
          professional_categories?: string[] | null
          professional_category?: string | null
          ramq_number?: string | null
          remuneration_modes?: string[] | null
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_facility_fee_schedules: {
        Row: {
          base_fee: number
          created_at: string | null
          description: string
          facility_code: string
          facility_name: string
          facility_type: string | null
          id: string
          internal_code: string
          payer_type: string | null
          specialty: string | null
          standard_ramq_code: string | null
        }
        Insert: {
          base_fee: number
          created_at?: string | null
          description: string
          facility_code: string
          facility_name: string
          facility_type?: string | null
          id?: string
          internal_code: string
          payer_type?: string | null
          specialty?: string | null
          standard_ramq_code?: string | null
        }
        Update: {
          base_fee?: number
          created_at?: string | null
          description?: string
          facility_code?: string
          facility_name?: string
          facility_type?: string | null
          id?: string
          internal_code?: string
          payer_type?: string | null
          specialty?: string | null
          standard_ramq_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_facility_fee_schedules_payer_type_fkey"
            columns: ["payer_type"]
            isOneToOne: false
            referencedRelation: "payer_types"
            referencedColumns: ["code"]
          },
        ]
      }
      ramq_act_codes: {
        Row: {
          active: boolean | null
          base_fee: number
          category: string | null
          code: string
          created_at: string | null
          description: string
          id: string
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          base_fee: number
          category?: string | null
          code: string
          created_at?: string | null
          description: string
          id?: string
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          base_fee?: number
          category?: string | null
          code?: string
          created_at?: string | null
          description?: string
          id?: string
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ramq_claims: {
        Row: {
          act_codes: Json | null
          age_at_service: number | null
          amount_received: number | null
          approved_at: string | null
          batch_id: string | null
          claim_number: string | null
          context_elements: string[] | null
          created_at: string | null
          diagnostic_code: string | null
          diagnostic_desc: string | null
          doctor_ramq: string | null
          end_time: string | null
          id: string
          is_pediatric: boolean | null
          lmp_date: string | null
          location_code: string | null
          notes: string | null
          paid_at: string | null
          patient_dob: string | null
          patient_name: string
          patient_ramq: string
          professional_category: string | null
          ramq_response: Json | null
          rejection_code: string | null
          rejection_reason: string | null
          role: string | null
          service_date: string
          start_time: string | null
          status: string | null
          submitted_at: string | null
          territory_premium: number | null
          total_claimed: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          act_codes?: Json | null
          age_at_service?: number | null
          amount_received?: number | null
          approved_at?: string | null
          batch_id?: string | null
          claim_number?: string | null
          context_elements?: string[] | null
          created_at?: string | null
          diagnostic_code?: string | null
          diagnostic_desc?: string | null
          doctor_ramq?: string | null
          end_time?: string | null
          id?: string
          is_pediatric?: boolean | null
          lmp_date?: string | null
          location_code?: string | null
          notes?: string | null
          paid_at?: string | null
          patient_dob?: string | null
          patient_name: string
          patient_ramq: string
          professional_category?: string | null
          ramq_response?: Json | null
          rejection_code?: string | null
          rejection_reason?: string | null
          role?: string | null
          service_date: string
          start_time?: string | null
          status?: string | null
          submitted_at?: string | null
          territory_premium?: number | null
          total_claimed: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          act_codes?: Json | null
          age_at_service?: number | null
          amount_received?: number | null
          approved_at?: string | null
          batch_id?: string | null
          claim_number?: string | null
          context_elements?: string[] | null
          created_at?: string | null
          diagnostic_code?: string | null
          diagnostic_desc?: string | null
          doctor_ramq?: string | null
          end_time?: string | null
          id?: string
          is_pediatric?: boolean | null
          lmp_date?: string | null
          location_code?: string | null
          notes?: string | null
          paid_at?: string | null
          patient_dob?: string | null
          patient_name?: string
          patient_ramq?: string
          professional_category?: string | null
          ramq_response?: Json | null
          rejection_code?: string | null
          rejection_reason?: string | null
          role?: string | null
          service_date?: string
          start_time?: string | null
          status?: string | null
          submitted_at?: string | null
          territory_premium?: number | null
          total_claimed?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ramq_claims_location_code_fkey"
            columns: ["location_code"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["locality_code"]
          },
        ]
      }
      ramq_claims_archive: {
        Row: {
          act_codes: Json | null
          amount_received: number | null
          approved_at: string | null
          batch_id: string | null
          claim_number: string | null
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          patient_name: string
          patient_ramq: string
          ramq_response: Json | null
          rejection_reason: string | null
          service_date: string
          status: string | null
          submitted_at: string | null
          total_claimed: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          act_codes?: Json | null
          amount_received?: number | null
          approved_at?: string | null
          batch_id?: string | null
          claim_number?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          patient_name: string
          patient_ramq: string
          ramq_response?: Json | null
          rejection_reason?: string | null
          service_date: string
          status?: string | null
          submitted_at?: string | null
          total_claimed: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          act_codes?: Json | null
          amount_received?: number | null
          approved_at?: string | null
          batch_id?: string | null
          claim_number?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          patient_name?: string
          patient_ramq?: string
          ramq_response?: Json | null
          rejection_reason?: string | null
          service_date?: string
          status?: string | null
          submitted_at?: string | null
          total_claimed?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ramq_codes: {
        Row: {
          category: string | null
          code: string
          component_type: string | null
          description: string
          fee_base: number
          id: string
          is_active: boolean | null
          min_time_minutes: number | null
          requires_modifier: boolean | null
          specialty_group: string | null
        }
        Insert: {
          category?: string | null
          code: string
          component_type?: string | null
          description: string
          fee_base: number
          id?: string
          is_active?: boolean | null
          min_time_minutes?: number | null
          requires_modifier?: boolean | null
          specialty_group?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          component_type?: string | null
          description?: string
          fee_base?: number
          id?: string
          is_active?: boolean | null
          min_time_minutes?: number | null
          requires_modifier?: boolean | null
          specialty_group?: string | null
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount: number
          created_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          invoice_id: string | null
          patient_email: string | null
          payment_id: string | null
          receipt_url: string | null
          stripe_payment_intent: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          invoice_id?: string | null
          patient_email?: string | null
          payment_id?: string | null
          receipt_url?: string | null
          stripe_payment_intent?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          invoice_id?: string | null
          patient_email?: string | null
          payment_id?: string | null
          receipt_url?: string | null
          stripe_payment_intent?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      shadow_ledger: {
        Row: {
          actual_amount: number | null
          actual_date: string | null
          calculation_basis: Json | null
          claim_id: string | null
          created_at: string | null
          discrepancy_reason: string | null
          expected_amount: number
          expected_date: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_source: string | null
          reconciliation_batch: string | null
          reconciliation_date: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string | null
          user_id: string | null
          variance_amount: number | null
          variance_percentage: number | null
        }
        Insert: {
          actual_amount?: number | null
          actual_date?: string | null
          calculation_basis?: Json | null
          claim_id?: string | null
          created_at?: string | null
          discrepancy_reason?: string | null
          expected_amount: number
          expected_date: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_source?: string | null
          reconciliation_batch?: string | null
          reconciliation_date?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          user_id?: string | null
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Update: {
          actual_amount?: number | null
          actual_date?: string | null
          calculation_basis?: Json | null
          claim_id?: string | null
          created_at?: string | null
          discrepancy_reason?: string | null
          expected_amount?: number
          expected_date?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_source?: string | null
          reconciliation_batch?: string | null
          reconciliation_date?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          user_id?: string | null
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shadow_ledger_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      payment_discrepancies: {
        Row: {
          avg_variance_pct: number | null
          total_discrepancies: number | null
          total_variance: number | null
          unresolved_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      automate_hanging_claims: { Args: never; Returns: undefined }
      has_completed_onboarding: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      ramq_validate_locality: { Args: { p_code: string }; Returns: boolean }
      ramq_validate_provider_number: {
        Args: { p_num: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
