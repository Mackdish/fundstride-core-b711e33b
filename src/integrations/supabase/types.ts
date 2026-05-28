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
          created_at: string
          created_by: string | null
          customer_id: string
          dscr: number | null
          grade: Database["public"]["Enums"]["risk_grade"] | null
          id: string
          ltv: number | null
          project_id: string
          recommended_amount: number | null
          requested_amount: number | null
          score: number | null
          status: Database["public"]["Enums"]["entity_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          dscr?: number | null
          grade?: Database["public"]["Enums"]["risk_grade"] | null
          id?: string
          ltv?: number | null
          project_id: string
          recommended_amount?: number | null
          requested_amount?: number | null
          score?: number | null
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          dscr?: number | null
          grade?: Database["public"]["Enums"]["risk_grade"] | null
          id?: string
          ltv?: number | null
          project_id?: string
          recommended_amount?: number | null
          requested_amount?: number | null
          score?: number | null
          status?: Database["public"]["Enums"]["entity_status"]
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
        }
        Relationships: [
          {
            foreignKeyName: "approval_conditions_appraisal_id_fkey"
            columns: ["appraisal_id"]
            isOneToOne: false
            referencedRelation: "appraisals"
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
          user_id?: string | null
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string
          id: string
          mobile_wallet: string | null
          name: string
          verification_status: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          mobile_wallet?: string | null
          name: string
          verification_status?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          mobile_wallet?: string | null
          name?: string
          verification_status?: string
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "contractor_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
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
          town?: string | null
          trading_name?: string | null
          user_id?: string | null
          vat_number?: string | null
          website?: string | null
          year_established?: number | null
        }
        Relationships: []
      }
      covenants: {
        Row: {
          condition: string
          created_at: string
          id: string
          loan_id: string
          monitoring_frequency: string | null
          status: string
          threshold: string | null
        }
        Insert: {
          condition: string
          created_at?: string
          id?: string
          loan_id: string
          monitoring_frequency?: string | null
          status?: string
          threshold?: string | null
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          loan_id?: string
          monitoring_frequency?: string | null
          status?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "customer_directors_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
        }
        Relationships: []
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
        }
        Insert: {
          calculated_at?: string
          days_past_due?: number
          id?: string
          impairment_driver?: string | null
          loan_id: string
          sicr_flags?: Json | null
          stage?: number
        }
        Update: {
          calculated_at?: string
          days_past_due?: number
          id?: string
          impairment_driver?: string | null
          loan_id?: string
          sicr_flags?: Json | null
          stage?: number
        }
        Relationships: [
          {
            foreignKeyName: "ifrs9_indicators_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_facilities"
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
        }
        Relationships: [
          {
            foreignKeyName: "issues_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
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
        ]
      }
      loan_facilities: {
        Row: {
          activated_at: string | null
          appraisal_id: string
          approved_amount: number
          created_at: string
          id: string
          insurance: number | null
          interest_rate: number
          processing_fee: number | null
          repayment_frequency: string
          status: Database["public"]["Enums"]["entity_status"]
          tenor_months: number
        }
        Insert: {
          activated_at?: string | null
          appraisal_id: string
          approved_amount: number
          created_at?: string
          id?: string
          insurance?: number | null
          interest_rate: number
          processing_fee?: number | null
          repayment_frequency?: string
          status?: Database["public"]["Enums"]["entity_status"]
          tenor_months: number
        }
        Update: {
          activated_at?: string | null
          appraisal_id?: string
          approved_amount?: number
          created_at?: string
          id?: string
          insurance?: number | null
          interest_rate?: number
          processing_fee?: number | null
          repayment_frequency?: string
          status?: Database["public"]["Enums"]["entity_status"]
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
        }
        Insert: {
          eligible_amount?: number | null
          id?: string
          name: string
          project_id: string
          sequence?: number
          target_pct: number
        }
        Update: {
          eligible_amount?: number | null
          id?: string
          name?: string
          project_id?: string
          sequence?: number
          target_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_url: string
          id: string
          project_id: string
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_url: string
          id?: string
          project_id: string
          status?: string
          version?: number
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_url?: string
          id?: string
          project_id?: string
          status?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_facilities"
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
          trigger_event?: string
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string
          drivers?: Json | null
          entity_id: string
          entity_type: string
          grade: Database["public"]["Enums"]["risk_grade"]
          id?: string
          score: number
        }
        Update: {
          created_at?: string
          drivers?: Json | null
          entity_id?: string
          entity_type?: string
          grade?: Database["public"]["Enums"]["risk_grade"]
          id?: string
          score?: number
        }
        Relationships: []
      }
      site_media: {
        Row: {
          caption: string | null
          file_url: string
          geotag: string | null
          id: string
          site_visit_id: string
          timestamp: string
        }
        Insert: {
          caption?: string | null
          file_url: string
          geotag?: string | null
          id?: string
          site_visit_id: string
          timestamp?: string
        }
        Update: {
          caption?: string | null
          file_url?: string
          geotag?: string | null
          id?: string
          site_visit_id?: string
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
        ]
      }
      site_visits: {
        Row: {
          created_at: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          observations: string | null
          officer_id: string | null
          project_id: string
          status: string
          visit_date: string
          weather: string | null
        }
        Insert: {
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          observations?: string | null
          officer_id?: string | null
          project_id: string
          status?: string
          visit_date: string
          weather?: string | null
        }
        Update: {
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          observations?: string | null
          officer_id?: string | null
          project_id?: string
          status?: string
          visit_date?: string
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_project_id_fkey"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
        "credit_officer",
        "operations_officer",
        "site_monitoring_officer",
        "finance_officer",
        "risk_compliance_officer",
        "developer",
        "contractor",
        "executive",
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
