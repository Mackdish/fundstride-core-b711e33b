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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appraisals: {
        Row: {
          analyst_recommendation: Json | null
          capacity_data: Json | null
          capacity_score: number | null
          capital_data: Json | null
          capital_score: number | null
          character_data: Json | null
          character_score: number | null
          collateral_data: Json | null
          collateral_score: number | null
          committee_decision: Json | null
          conditions_data: Json | null
          conditions_score: number | null
          construction_data: Json | null
          construction_risk_score: number | null
          created_at: string
          created_by: string | null
          customer_id: string
          dscr: number | null
          executive_summary: Json | null
          grade: Database["public"]["Enums"]["risk_grade"] | null
          id: string
          ifrs9_data: Json | null
          ltv: number | null
          project_id: string
          recommended_amount: number | null
          requested_amount: number | null
          risk_data: Json | null
          score: number | null
          status: Database["public"]["Enums"]["entity_status"]
          tenant_id: string
        }
        Insert: {
          analyst_recommendation?: Json | null
          capacity_data?: Json | null
          capacity_score?: number | null
          capital_data?: Json | null
          capital_score?: number | null
          character_data?: Json | null
          character_score?: number | null
          collateral_data?: Json | null
          collateral_score?: number | null
          committee_decision?: Json | null
          conditions_data?: Json | null
          conditions_score?: number | null
          construction_data?: Json | null
          construction_risk_score?: number | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          dscr?: number | null
          executive_summary?: Json | null
          grade?: Database["public"]["Enums"]["risk_grade"] | null
          id?: string
          ifrs9_data?: Json | null
          ltv?: number | null
          project_id: string
          recommended_amount?: number | null
          requested_amount?: number | null
          risk_data?: Json | null
          score?: number | null
          status?: Database["public"]["Enums"]["entity_status"]
          tenant_id?: string
        }
        Update: {
          analyst_recommendation?: Json | null
          capacity_data?: Json | null
          capacity_score?: number | null
          capital_data?: Json | null
          capital_score?: number | null
          character_data?: Json | null
          character_score?: number | null
          collateral_data?: Json | null
          collateral_score?: number | null
          committee_decision?: Json | null
          conditions_data?: Json | null
          conditions_score?: number | null
          construction_data?: Json | null
          construction_risk_score?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          dscr?: number | null
          executive_summary?: Json | null
          grade?: Database["public"]["Enums"]["risk_grade"] | null
          id?: string
          ifrs9_data?: Json | null
          ltv?: number | null
          project_id?: string
          recommended_amount?: number | null
          requested_amount?: number | null
          risk_data?: Json | null
          score?: number | null
          status?: Database["public"]["Enums"]["entity_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appraisals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_conditions: {
        Row: {
          appraisal_id: string
          condition_type: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          responsible_party: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          appraisal_id: string
          condition_type?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          responsible_party?: string | null
          status?: string
          tenant_id?: string
        }
        Update: {
          appraisal_id?: string
          condition_type?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          responsible_party?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_conditions_appraisal_id_fkey"
            columns: ["appraisal_id"]
            isOneToOne: false
            referencedRelation: "appraisals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_conditions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          tenant_id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiaries: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string
          id: string
          mobile_wallet: string | null
          name: string
          tenant_id: string
          verification_status: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          mobile_wallet?: string | null
          name: string
          tenant_id?: string
          verification_status?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          mobile_wallet?: string | null
          name?: string
          tenant_id?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string
          id: string
          location: string | null
          manager: string | null
          name: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          manager?: string | null
          name: string
          status?: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          manager?: string | null
          name?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_contracts: {
        Row: {
          amount: number | null
          contractor_id: string
          created_at: string
          end_date: string | null
          id: string
          project_id: string
          retention_pct: number | null
          scope: string | null
          start_date: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          amount?: number | null
          contractor_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          project_id: string
          retention_pct?: number | null
          scope?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
        }
        Update: {
          amount?: number | null
          contractor_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          project_id?: string
          retention_pct?: number | null
          scope?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_contracts_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_scores: {
        Row: {
          compliance: number | null
          contractor_id: string
          created_at: string
          delivery: number | null
          financial_reliability: number | null
          id: string
          quality: number | null
          safety: number | null
          tenant_id: string
        }
        Insert: {
          compliance?: number | null
          contractor_id: string
          created_at?: string
          delivery?: number | null
          financial_reliability?: number | null
          id?: string
          quality?: number | null
          safety?: number | null
          tenant_id?: string
        }
        Update: {
          compliance?: number | null
          contractor_id?: string
          created_at?: string
          delivery?: number | null
          financial_reliability?: number | null
          id?: string
          quality?: number | null
          safety?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          alt_phone: string | null
          banking: Json | null
          consultancy_type: string | null
          country_of_incorporation: string | null
          created_at: string
          declaration: Json | null
          email: string | null
          id: string
          kra_pin: string | null
          name: string
          nca_category: string | null
          nca_registration: string | null
          phone: string | null
          physical_address: string | null
          postal_address: string | null
          primary_contact: Json | null
          professional_body_number: string | null
          recent_project: Json | null
          registration_number: string | null
          services: string[] | null
          specialization: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tenant_id: string
          town: string | null
          trading_name: string | null
          user_id: string | null
          vat_number: string | null
          website: string | null
          year_established: number | null
        }
        Insert: {
          alt_phone?: string | null
          banking?: Json | null
          consultancy_type?: string | null
          country_of_incorporation?: string | null
          created_at?: string
          declaration?: Json | null
          email?: string | null
          id?: string
          kra_pin?: string | null
          name: string
          nca_category?: string | null
          nca_registration?: string | null
          phone?: string | null
          physical_address?: string | null
          postal_address?: string | null
          primary_contact?: Json | null
          professional_body_number?: string | null
          recent_project?: Json | null
          registration_number?: string | null
          services?: string[] | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tenant_id?: string
          town?: string | null
          trading_name?: string | null
          user_id?: string | null
          vat_number?: string | null
          website?: string | null
          year_established?: number | null
        }
        Update: {
          alt_phone?: string | null
          banking?: Json | null
          consultancy_type?: string | null
          country_of_incorporation?: string | null
          created_at?: string
          declaration?: Json | null
          email?: string | null
          id?: string
          kra_pin?: string | null
          name?: string
          nca_category?: string | null
          nca_registration?: string | null
          phone?: string | null
          physical_address?: string | null
          postal_address?: string | null
          primary_contact?: Json | null
          professional_body_number?: string | null
          recent_project?: Json | null
          registration_number?: string | null
          services?: string[] | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tenant_id?: string
          town?: string | null
          trading_name?: string | null
          user_id?: string | null
          vat_number?: string | null
          website?: string | null
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      covenants: {
        Row: {
          condition: string
          created_at: string
          id: string
          loan_id: string
          monitoring_frequency: string | null
          status: string
          tenant_id: string
          threshold: string | null
        }
        Insert: {
          condition: string
          created_at?: string
          id?: string
          loan_id: string
          monitoring_frequency?: string | null
          status?: string
          tenant_id?: string
          threshold?: string | null
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          loan_id?: string
          monitoring_frequency?: string | null
          status?: string
          tenant_id?: string
          threshold?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "covenants_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "covenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_monitoring_reports: {
        Row: {
          arrears_amount: number | null
          business_progress: Json | null
          collateral_status: Json | null
          created_at: string
          customer_id: string | null
          days_past_due: number | null
          engagement_notes: Json | null
          id: string
          loan_id: string
          missed_installments: number | null
          officer_recommendation: string | null
          payment_trend: string | null
          performance: Json | null
          prepared_by: string | null
          project_id: string | null
          recommended_actions: string[] | null
          relationship_officer: string | null
          repayment_concerns: string | null
          repayment_status: string | null
          report_date: string
          reviewed_by: string | null
          risk_assessment: Json | null
          status: string
          tenant_id: string
          updated_at: string
          warning_indicators: string[] | null
        }
        Insert: {
          arrears_amount?: number | null
          business_progress?: Json | null
          collateral_status?: Json | null
          created_at?: string
          customer_id?: string | null
          days_past_due?: number | null
          engagement_notes?: Json | null
          id?: string
          loan_id: string
          missed_installments?: number | null
          officer_recommendation?: string | null
          payment_trend?: string | null
          performance?: Json | null
          prepared_by?: string | null
          project_id?: string | null
          recommended_actions?: string[] | null
          relationship_officer?: string | null
          repayment_concerns?: string | null
          repayment_status?: string | null
          report_date?: string
          reviewed_by?: string | null
          risk_assessment?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string
          warning_indicators?: string[] | null
        }
        Update: {
          arrears_amount?: number | null
          business_progress?: Json | null
          collateral_status?: Json | null
          created_at?: string
          customer_id?: string | null
          days_past_due?: number | null
          engagement_notes?: Json | null
          id?: string
          loan_id?: string
          missed_installments?: number | null
          officer_recommendation?: string | null
          payment_trend?: string | null
          performance?: Json | null
          prepared_by?: string | null
          project_id?: string | null
          recommended_actions?: string[] | null
          relationship_officer?: string | null
          repayment_concerns?: string | null
          repayment_status?: string | null
          report_date?: string
          reviewed_by?: string | null
          risk_assessment?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string
          warning_indicators?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_monitoring_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_monitoring_reports_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_monitoring_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_monitoring_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_directors: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          id_number: string | null
          kra_pin: string | null
          name: string
          phone: string | null
          shareholding_pct: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          id_number?: string | null
          kra_pin?: string | null
          name: string
          phone?: string | null
          shareholding_pct?: number
          tenant_id?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          id_number?: string | null
          kra_pin?: string | null
          name?: string
          phone?: string | null
          shareholding_pct?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_directors_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_directors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          created_at: string
          customer_id: string
          doc_type: string
          expiry_date: string | null
          file_url: string
          id: string
          status: string
          tenant_id: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          doc_type: string
          expiry_date?: string | null
          file_url: string
          id?: string
          status?: string
          tenant_id?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          doc_type?: string
          expiry_date?: string | null
          file_url?: string
          id?: string
          status?: string
          tenant_id?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_messages: {
        Row: {
          attachment_url: string | null
          body: string
          created_at: string
          customer_id: string
          from_role: string
          id: string
          read_at: string | null
          sender_user_id: string
          tenant_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          created_at?: string
          customer_id: string
          from_role: string
          id?: string
          read_at?: string | null
          sender_user_id: string
          tenant_id?: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          customer_id?: string
          from_role?: string
          id?: string
          read_at?: string | null
          sender_user_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          business_entity: Json | null
          created_at: string
          created_by: string | null
          current_address: string | null
          customer_type: string
          email: string | null
          employment: Json | null
          estate: string | null
          first_name: string | null
          house_no: string | null
          id: string
          marital_status: string | null
          middle_name: string | null
          mobile: string | null
          name: string
          national_id: string | null
          next_of_kin: Json | null
          owner_user_id: string | null
          phone: string | null
          pin: string | null
          postal_address: string | null
          postal_code: string | null
          property: Json | null
          registration_number: string | null
          residence_type: string | null
          sector: string | null
          status: Database["public"]["Enums"]["entity_status"]
          surname: string | null
          tenant_id: string
        }
        Insert: {
          address?: string | null
          business_entity?: Json | null
          created_at?: string
          created_by?: string | null
          current_address?: string | null
          customer_type?: string
          email?: string | null
          employment?: Json | null
          estate?: string | null
          first_name?: string | null
          house_no?: string | null
          id?: string
          marital_status?: string | null
          middle_name?: string | null
          mobile?: string | null
          name: string
          national_id?: string | null
          next_of_kin?: Json | null
          owner_user_id?: string | null
          phone?: string | null
          pin?: string | null
          postal_address?: string | null
          postal_code?: string | null
          property?: Json | null
          registration_number?: string | null
          residence_type?: string | null
          sector?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          surname?: string | null
          tenant_id?: string
        }
        Update: {
          address?: string | null
          business_entity?: Json | null
          created_at?: string
          created_by?: string | null
          current_address?: string | null
          customer_type?: string
          email?: string | null
          employment?: Json | null
          estate?: string | null
          first_name?: string | null
          house_no?: string | null
          id?: string
          marital_status?: string | null
          middle_name?: string | null
          mobile?: string | null
          name?: string
          national_id?: string | null
          next_of_kin?: Json | null
          owner_user_id?: string | null
          phone?: string | null
          pin?: string | null
          postal_address?: string | null
          postal_code?: string | null
          property?: Json | null
          registration_number?: string | null
          residence_type?: string | null
          sector?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          surname?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      drawdown_requests: {
        Row: {
          certified_amount: number | null
          created_at: string
          id: string
          loan_id: string
          milestone_id: string | null
          requested_amount: number
          requested_by: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tenant_id: string
        }
        Insert: {
          certified_amount?: number | null
          created_at?: string
          id?: string
          loan_id: string
          milestone_id?: string | null
          requested_amount: number
          requested_by?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tenant_id?: string
        }
        Update: {
          certified_amount?: number | null
          created_at?: string
          id?: string
          loan_id?: string
          milestone_id?: string | null
          requested_amount?: number
          requested_by?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawdown_requests_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawdown_requests_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawdown_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ifrs9_indicators: {
        Row: {
          calculated_at: string
          days_past_due: number
          id: string
          impairment_driver: string | null
          loan_id: string
          sicr_flags: Json | null
          stage: number
          tenant_id: string
        }
        Insert: {
          calculated_at?: string
          days_past_due?: number
          id?: string
          impairment_driver?: string | null
          loan_id: string
          sicr_flags?: Json | null
          stage?: number
          tenant_id?: string
        }
        Update: {
          calculated_at?: string
          days_past_due?: number
          id?: string
          impairment_driver?: string | null
          loan_id?: string
          sicr_flags?: Json | null
          stage?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifrs9_indicators_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifrs9_indicators_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          category: string | null
          description: string
          due_date: string | null
          id: string
          responsible_party: string | null
          severity: Database["public"]["Enums"]["severity"]
          site_visit_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          category?: string | null
          description: string
          due_date?: string | null
          id?: string
          responsible_party?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          site_visit_id: string
          status?: string
          tenant_id?: string
        }
        Update: {
          category?: string | null
          description?: string
          due_date?: string | null
          id?: string
          responsible_party?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          site_visit_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          balance: number | null
          created_at: string
          credit: number | null
          debit: number | null
          id: string
          loan_id: string
          reference: string | null
          tenant_id: string
          transaction_type: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          id?: string
          loan_id: string
          reference?: string | null
          tenant_id?: string
          transaction_type: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          id?: string
          loan_id?: string
          reference?: string | null
          tenant_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_facilities: {
        Row: {
          account_number: string | null
          activated_at: string | null
          appraisal_id: string
          approved_amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          equity_contribution: number | null
          id: string
          insurance: number | null
          interest_rate: number
          loan_purpose: string | null
          processing_fee: number | null
          product_type: string | null
          project_id: string | null
          recommended_amount: number | null
          relationship_manager: string | null
          repayment_frequency: string
          repayment_holiday_amount: number | null
          repayment_holiday_months: number | null
          repayment_holiday_notes: string | null
          requested_amount: number | null
          security_offered: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tenant_id: string
          tenor_months: number
        }
        Insert: {
          account_number?: string | null
          activated_at?: string | null
          appraisal_id: string
          approved_amount: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          equity_contribution?: number | null
          id?: string
          insurance?: number | null
          interest_rate: number
          loan_purpose?: string | null
          processing_fee?: number | null
          product_type?: string | null
          project_id?: string | null
          recommended_amount?: number | null
          relationship_manager?: string | null
          repayment_frequency?: string
          repayment_holiday_amount?: number | null
          repayment_holiday_months?: number | null
          repayment_holiday_notes?: string | null
          requested_amount?: number | null
          security_offered?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tenant_id?: string
          tenor_months: number
        }
        Update: {
          account_number?: string | null
          activated_at?: string | null
          appraisal_id?: string
          approved_amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          equity_contribution?: number | null
          id?: string
          insurance?: number | null
          interest_rate?: number
          loan_purpose?: string | null
          processing_fee?: number | null
          product_type?: string | null
          project_id?: string | null
          recommended_amount?: number | null
          relationship_manager?: string | null
          repayment_frequency?: string
          repayment_holiday_amount?: number | null
          repayment_holiday_months?: number | null
          repayment_holiday_notes?: string | null
          requested_amount?: number | null
          security_offered?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tenant_id?: string
          tenor_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "loan_facilities_appraisal_id_fkey"
            columns: ["appraisal_id"]
            isOneToOne: false
            referencedRelation: "appraisals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_facilities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_facilities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_facilities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_products: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          default_interest_rate: number | null
          default_tenor_months: number | null
          description: string | null
          id: string
          insurance_fee_rate: number | null
          max_amount: number | null
          max_ltv: number | null
          min_amount: number | null
          name: string
          processing_fee_rate: number | null
          repayment_frequency: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          default_interest_rate?: number | null
          default_tenor_months?: number | null
          description?: string | null
          id?: string
          insurance_fee_rate?: number | null
          max_amount?: number | null
          max_ltv?: number | null
          min_amount?: number | null
          name: string
          processing_fee_rate?: number | null
          repayment_frequency?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          default_interest_rate?: number | null
          default_tenor_months?: number | null
          description?: string | null
          id?: string
          insurance_fee_rate?: number | null
          max_amount?: number | null
          max_ltv?: number | null
          min_amount?: number | null
          name?: string
          processing_fee_rate?: number | null
          repayment_frequency?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          eligible_amount: number | null
          id: string
          name: string
          project_id: string
          sequence: number
          target_pct: number
          tenant_id: string
        }
        Insert: {
          eligible_amount?: number | null
          id?: string
          name: string
          project_id: string
          sequence?: number
          target_pct: number
          tenant_id?: string
        }
        Update: {
          eligible_amount?: number | null
          id?: string
          name?: string
          project_id?: string
          sequence?: number
          target_pct?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_financials: {
        Row: {
          branch_id: string | null
          capital_adequacy: number | null
          closing_portfolio: number | null
          collections: number | null
          created_at: string
          disbursements: number | null
          fee_income: number | null
          id: string
          ifrs9_provision: number | null
          impairment: number | null
          interest_income: number | null
          liquidity_ratio: number | null
          net_profit: number | null
          npl_ratio: number | null
          operating_cost: number | null
          par30: number | null
          period: string
          revenue: number | null
          tenant_id: string
        }
        Insert: {
          branch_id?: string | null
          capital_adequacy?: number | null
          closing_portfolio?: number | null
          collections?: number | null
          created_at?: string
          disbursements?: number | null
          fee_income?: number | null
          id?: string
          ifrs9_provision?: number | null
          impairment?: number | null
          interest_income?: number | null
          liquidity_ratio?: number | null
          net_profit?: number | null
          npl_ratio?: number | null
          operating_cost?: number | null
          par30?: number | null
          period: string
          revenue?: number | null
          tenant_id?: string
        }
        Update: {
          branch_id?: string | null
          capital_adequacy?: number | null
          closing_portfolio?: number | null
          collections?: number | null
          created_at?: string
          disbursements?: number | null
          fee_income?: number | null
          id?: string
          ifrs9_provision?: number | null
          impairment?: number | null
          interest_income?: number | null
          liquidity_ratio?: number | null
          net_profit?: number | null
          npl_ratio?: number | null
          operating_cost?: number | null
          par30?: number | null
          period?: string
          revenue?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_financials_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_financials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      officers: {
        Row: {
          active_clients: number | null
          branch_id: string | null
          collections_actual: number | null
          collections_target: number | null
          created_at: string
          id: string
          name: string
          par_actual: number | null
          portfolio_actual: number | null
          portfolio_target: number | null
          role: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          active_clients?: number | null
          branch_id?: string | null
          collections_actual?: number | null
          collections_target?: number | null
          created_at?: string
          id?: string
          name: string
          par_actual?: number | null
          portfolio_actual?: number | null
          portfolio_target?: number | null
          role?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Update: {
          active_clients?: number | null
          branch_id?: string | null
          collections_actual?: number | null
          collections_target?: number | null
          created_at?: string
          id?: string
          name?: string
          par_actual?: number | null
          portfolio_actual?: number | null
          portfolio_target?: number | null
          role?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "officers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          authorized_by: string | null
          beneficiary_id: string | null
          created_at: string
          created_by: string | null
          drawdown_id: string | null
          id: string
          purpose: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          amount: number
          authorized_by?: string | null
          beneficiary_id?: string | null
          created_at?: string
          created_by?: string | null
          drawdown_id?: string | null
          id?: string
          purpose?: string | null
          status?: string
          tenant_id?: string
        }
        Update: {
          amount?: number
          authorized_by?: string | null
          beneficiary_id?: string | null
          created_at?: string
          created_by?: string | null
          drawdown_id?: string | null
          id?: string
          purpose?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_drawdown_id_fkey"
            columns: ["drawdown_id"]
            isOneToOne: false
            referencedRelation: "drawdown_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employment_type: string | null
          force_password_change: boolean
          full_name: string | null
          gender: string | null
          id: string
          id_number: string | null
          job_title: string | null
          phone: string | null
          start_date: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employment_type?: string | null
          force_password_change?: boolean
          full_name?: string | null
          gender?: string | null
          id: string
          id_number?: string | null
          job_title?: string | null
          phone?: string | null
          start_date?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employment_type?: string | null
          force_password_change?: boolean
          full_name?: string | null
          gender?: string | null
          id?: string
          id_number?: string | null
          job_title?: string | null
          phone?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
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
      project_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_url: string
          id: string
          project_id: string
          status: string
          tenant_id: string
          version: number
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_url: string
          id?: string
          project_id: string
          status?: string
          tenant_id?: string
          version?: number
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_url?: string
          id?: string
          project_id?: string
          status?: string
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          approvals: Json | null
          built_up_area: string | null
          client_contact_person: string | null
          client_email: string | null
          client_equity: number | null
          client_physical_address: string | null
          client_postal_address: string | null
          client_telephone: string | null
          construction_methodology: string | null
          consultants: Json | null
          county: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          end_date: string | null
          expected_monthly_disbursement: number | null
          expected_value: number | null
          floors: number | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          insurance_requirements: string | null
          key_deliverables: string | null
          loan_facility_amount: number | null
          location: string | null
          name: string
          nature_of_development: string | null
          project_type: string | null
          reference_number: string | null
          risks: Json | null
          source_of_funding: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tenant_id: string
          units: number | null
        }
        Insert: {
          approvals?: Json | null
          built_up_area?: string | null
          client_contact_person?: string | null
          client_email?: string | null
          client_equity?: number | null
          client_physical_address?: string | null
          client_postal_address?: string | null
          client_telephone?: string | null
          construction_methodology?: string | null
          consultants?: Json | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          end_date?: string | null
          expected_monthly_disbursement?: number | null
          expected_value?: number | null
          floors?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          insurance_requirements?: string | null
          key_deliverables?: string | null
          loan_facility_amount?: number | null
          location?: string | null
          name: string
          nature_of_development?: string | null
          project_type?: string | null
          reference_number?: string | null
          risks?: Json | null
          source_of_funding?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tenant_id?: string
          units?: number | null
        }
        Update: {
          approvals?: Json | null
          built_up_area?: string | null
          client_contact_person?: string | null
          client_email?: string | null
          client_equity?: number | null
          client_physical_address?: string | null
          client_postal_address?: string | null
          client_telephone?: string | null
          construction_methodology?: string | null
          consultants?: Json | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          end_date?: string | null
          expected_monthly_disbursement?: number | null
          expected_value?: number | null
          floors?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          insurance_requirements?: string | null
          key_deliverables?: string | null
          loan_facility_amount?: number | null
          location?: string | null
          name?: string
          nature_of_development?: string | null
          project_type?: string | null
          reference_number?: string | null
          risks?: Json | null
          source_of_funding?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tenant_id?: string
          units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repayment_schedules: {
        Row: {
          balance: number
          id: string
          instalment_date: string
          interest: number
          loan_id: string
          principal: number
          status: string
          tenant_id: string
          total: number
        }
        Insert: {
          balance: number
          id?: string
          instalment_date: string
          interest: number
          loan_id: string
          principal: number
          status?: string
          tenant_id?: string
          total: number
        }
        Update: {
          balance?: number
          id?: string
          instalment_date?: string
          interest?: number
          loan_id?: string
          principal?: number
          status?: string
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "repayment_schedules_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repayment_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repayments: {
        Row: {
          allocation_interest: number | null
          allocation_principal: number | null
          amount: number
          created_at: string
          id: string
          loan_id: string
          payment_date: string
          reference: string | null
          source: string | null
          tenant_id: string
        }
        Insert: {
          allocation_interest?: number | null
          allocation_principal?: number | null
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          payment_date: string
          reference?: string | null
          source?: string | null
          tenant_id?: string
        }
        Update: {
          allocation_interest?: number | null
          allocation_principal?: number | null
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          payment_date?: string
          reference?: string | null
          source?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repayments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_alerts: {
        Row: {
          created_at: string
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          owner_id: string | null
          severity: Database["public"]["Enums"]["severity"]
          status: string
          tenant_id: string
          trigger_event: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          owner_id?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          status?: string
          tenant_id?: string
          trigger_event: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          owner_id?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          status?: string
          tenant_id?: string
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_scores: {
        Row: {
          created_at: string
          drivers: Json | null
          entity_id: string
          entity_type: string
          grade: Database["public"]["Enums"]["risk_grade"]
          id: string
          score: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          drivers?: Json | null
          entity_id: string
          entity_type: string
          grade: Database["public"]["Enums"]["risk_grade"]
          id?: string
          score: number
          tenant_id?: string
        }
        Update: {
          created_at?: string
          drivers?: Json | null
          entity_id?: string
          entity_type?: string
          grade?: Database["public"]["Enums"]["risk_grade"]
          id?: string
          score?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_leads: {
        Row: {
          contact: string | null
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          product: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          product: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          product?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_media: {
        Row: {
          caption: string | null
          file_url: string
          geotag: string | null
          id: string
          site_visit_id: string
          tenant_id: string
          timestamp: string
        }
        Insert: {
          caption?: string | null
          file_url: string
          geotag?: string | null
          id?: string
          site_visit_id: string
          tenant_id?: string
          timestamp?: string
        }
        Update: {
          caption?: string | null
          file_url?: string
          geotag?: string | null
          id?: string
          site_visit_id?: string
          tenant_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_media_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          action_tracker: Json | null
          actual_progress_pct: number | null
          contractor_scorecard: Json | null
          created_at: string
          drawdown_recommendation: string | null
          drawdown_request_id: string | null
          engineer_qs: string | null
          gps_lat: number | null
          gps_lng: number | null
          hse_compliance: Json | null
          id: string
          loan_id: string | null
          observations: string | null
          officer_id: string | null
          planned_progress_pct: number | null
          project_id: string
          purpose: string | null
          qs_assessment: Json | null
          quality_checklist: Json | null
          recommendation_details: string | null
          risk_matrix: Json | null
          status: string
          tenant_id: string
          visit_date: string
          weather: string | null
          works_completed: string | null
          works_ongoing: string | null
          works_pending: string | null
        }
        Insert: {
          action_tracker?: Json | null
          actual_progress_pct?: number | null
          contractor_scorecard?: Json | null
          created_at?: string
          drawdown_recommendation?: string | null
          drawdown_request_id?: string | null
          engineer_qs?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          hse_compliance?: Json | null
          id?: string
          loan_id?: string | null
          observations?: string | null
          officer_id?: string | null
          planned_progress_pct?: number | null
          project_id: string
          purpose?: string | null
          qs_assessment?: Json | null
          quality_checklist?: Json | null
          recommendation_details?: string | null
          risk_matrix?: Json | null
          status?: string
          tenant_id?: string
          visit_date: string
          weather?: string | null
          works_completed?: string | null
          works_ongoing?: string | null
          works_pending?: string | null
        }
        Update: {
          action_tracker?: Json | null
          actual_progress_pct?: number | null
          contractor_scorecard?: Json | null
          created_at?: string
          drawdown_recommendation?: string | null
          drawdown_request_id?: string | null
          engineer_qs?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          hse_compliance?: Json | null
          id?: string
          loan_id?: string | null
          observations?: string | null
          officer_id?: string | null
          planned_progress_pct?: number | null
          project_id?: string
          purpose?: string | null
          qs_assessment?: Json | null
          quality_checklist?: Json | null
          recommendation_details?: string | null
          risk_matrix?: Json | null
          status?: string
          tenant_id?: string
          visit_date?: string
          weather?: string | null
          works_completed?: string | null
          works_ongoing?: string | null
          works_pending?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_drawdown_request_id_fkey"
            columns: ["drawdown_request_id"]
            isOneToOne: false
            referencedRelation: "drawdown_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          annual_interest_rate: number | null
          avg_project_size: number | null
          collection_efficiency_target: number | null
          currency: string
          current_year: number
          insurance_fee_rate: number | null
          max_ltv: number | null
          min_capital_adequacy: number | null
          min_liquidity_ratio: number | null
          npl_threshold: number | null
          par30_threshold: number | null
          processing_fee_rate: number | null
          roe_target: number | null
          standard_tenor_years: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          annual_interest_rate?: number | null
          avg_project_size?: number | null
          collection_efficiency_target?: number | null
          currency?: string
          current_year?: number
          insurance_fee_rate?: number | null
          max_ltv?: number | null
          min_capital_adequacy?: number | null
          min_liquidity_ratio?: number | null
          npl_threshold?: number | null
          par30_threshold?: number | null
          processing_fee_rate?: number | null
          roe_target?: number | null
          standard_tenor_years?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          annual_interest_rate?: number | null
          avg_project_size?: number | null
          collection_efficiency_target?: number | null
          currency?: string
          current_year?: number
          insurance_fee_rate?: number | null
          max_ltv?: number | null
          min_capital_adequacy?: number | null
          min_liquidity_ratio?: number | null
          npl_threshold?: number | null
          par30_threshold?: number | null
          processing_fee_rate?: number | null
          roe_target?: number | null
          standard_tenor_years?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          name: string
          slug: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name: string
          slug?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name?: string
          slug?: string | null
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_customer_owner: { Args: { _customer_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "credit_officer"
        | "operations_officer"
        | "site_monitoring_officer"
        | "finance_officer"
        | "risk_compliance_officer"
        | "developer"
        | "contractor"
        | "executive"
        | "platform_admin"
        | "admin"
        | "finance"
        | "credit"
        | "operations"
        | "customer"
        | "sales"
        | "projects"
      entity_status:
        | "draft"
        | "pending"
        | "active"
        | "rejected"
        | "blocked"
        | "closed"
        | "completed"
      risk_grade: "green" | "amber" | "red" | "dark_red"
      severity: "low" | "medium" | "high" | "critical"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "credit_officer",
        "operations_officer",
        "site_monitoring_officer",
        "finance_officer",
        "risk_compliance_officer",
        "developer",
        "contractor",
        "executive",
        "platform_admin",
        "admin",
        "finance",
        "credit",
        "operations",
        "customer",
        "sales",
        "projects",
      ],
      entity_status: [
        "draft",
        "pending",
        "active",
        "rejected",
        "blocked",
        "closed",
        "completed",
      ],
      risk_grade: ["green", "amber", "red", "dark_red"],
      severity: ["low", "medium", "high", "critical"],
    },
  },
} as const
