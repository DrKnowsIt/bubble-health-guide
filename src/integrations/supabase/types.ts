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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_conversation_strategies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          strategy_config: Json
          strategy_name: string
          subscription_tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          strategy_config?: Json
          strategy_name: string
          subscription_tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          strategy_config?: Json
          strategy_name?: string
          subscription_tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          created_at: string
          id: string
          memory_enabled: boolean | null
          personalization_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          memory_enabled?: boolean | null
          personalization_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          memory_enabled?: boolean | null
          personalization_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_tracking: {
        Row: {
          created_at: string
          estimated_cost: number | null
          function_name: string
          id: string
          input_tokens: number | null
          model_used: string
          output_tokens: number | null
          patient_id: string | null
          request_type: string
          subscription_tier: string | null
          total_tokens: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_cost?: number | null
          function_name: string
          id?: string
          input_tokens?: number | null
          model_used: string
          output_tokens?: number | null
          patient_id?: string | null
          request_type: string
          subscription_tier?: string | null
          total_tokens?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_cost?: number | null
          function_name?: string
          id?: string
          input_tokens?: number | null
          model_used?: string
          output_tokens?: number | null
          patient_id?: string | null
          request_type?: string
          subscription_tier?: string | null
          total_tokens?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comprehensive_health_reports: {
        Row: {
          confidence_score: number | null
          created_at: string
          demographics_summary: Json | null
          health_metrics_summary: Json | null
          id: string
          key_concerns: string[] | null
          overall_health_status: string
          patient_id: string | null
          priority_level: string
          recommendations: string[] | null
          recommended_tests: Json | null
          report_summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          demographics_summary?: Json | null
          health_metrics_summary?: Json | null
          id?: string
          key_concerns?: string[] | null
          overall_health_status?: string
          patient_id?: string | null
          priority_level?: string
          recommendations?: string[] | null
          recommended_tests?: Json | null
          report_summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          demographics_summary?: Json | null
          health_metrics_summary?: Json | null
          id?: string
          key_concerns?: string[] | null
          overall_health_status?: string
          patient_id?: string | null
          priority_level?: string
          recommendations?: string[] | null
          recommended_tests?: Json | null
          report_summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      confirmed_medical_history: {
        Row: {
          condition_name: string
          confirmed_by_doctor: boolean
          created_at: string
          diagnosis_date: string | null
          doctor_confirmation_id: string | null
          id: string
          last_reviewed_date: string | null
          notes: string | null
          patient_id: string | null
          severity: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          condition_name: string
          confirmed_by_doctor?: boolean
          created_at?: string
          diagnosis_date?: string | null
          doctor_confirmation_id?: string | null
          id?: string
          last_reviewed_date?: string | null
          notes?: string | null
          patient_id?: string | null
          severity?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          condition_name?: string
          confirmed_by_doctor?: boolean
          created_at?: string
          diagnosis_date?: string | null
          doctor_confirmation_id?: string | null
          id?: string
          last_reviewed_date?: string | null
          notes?: string | null
          patient_id?: string | null
          severity?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_confirmed_history_doctor_confirmation"
            columns: ["doctor_confirmation_id"]
            isOneToOne: false
            referencedRelation: "doctor_confirmations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_diagnoses: {
        Row: {
          category: string
          confidence: number | null
          conversation_id: string
          created_at: string
          diagnosis: string
          id: string
          patient_id: string
          reasoning: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          confidence?: number | null
          conversation_id: string
          created_at?: string
          diagnosis: string
          id?: string
          patient_id: string
          reasoning?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          confidence?: number | null
          conversation_id?: string
          created_at?: string
          diagnosis?: string
          id?: string
          patient_id?: string
          reasoning?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_diagnoses_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_memory: {
        Row: {
          conversation_id: string
          created_at: string
          health_episode_id: string | null
          id: string
          memory: Json
          patient_id: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          health_episode_id?: string | null
          id?: string
          memory?: Json
          patient_id: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          health_episode_id?: string | null
          id?: string
          memory?: Json
          patient_id?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_memory_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_memory_episode"
            columns: ["health_episode_id"]
            isOneToOne: false
            referencedRelation: "health_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_solutions: {
        Row: {
          category: string
          confidence: number | null
          conversation_id: string
          created_at: string
          id: string
          patient_id: string
          products: Json | null
          reasoning: string | null
          solution: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          confidence?: number | null
          conversation_id: string
          created_at?: string
          id?: string
          patient_id: string
          products?: Json | null
          reasoning?: string | null
          solution: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          confidence?: number | null
          conversation_id?: string
          created_at?: string
          id?: string
          patient_id?: string
          products?: Json | null
          reasoning?: string | null
          solution?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          health_episode_id: string | null
          id: string
          patient_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          health_episode_id?: string | null
          id?: string
          patient_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          health_episode_id?: string | null
          id?: string
          patient_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_conversations_episode"
            columns: ["health_episode_id"]
            isOneToOne: false
            referencedRelation: "health_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_usage_limits: {
        Row: {
          cost_incurred: number | null
          created_at: string
          date: string
          id: string
          messages_used: number | null
          tokens_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_incurred?: number | null
          created_at?: string
          date?: string
          id?: string
          messages_used?: number | null
          tokens_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_incurred?: number | null
          created_at?: string
          date?: string
          id?: string
          messages_used?: number | null
          tokens_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diagnosis_feedback: {
        Row: {
          created_at: string
          diagnosis_text: string
          feedback_type: string
          id: string
          patient_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diagnosis_text: string
          feedback_type: string
          id?: string
          patient_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          diagnosis_text?: string
          feedback_type?: string
          id?: string
          patient_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      doctor_confirmations: {
        Row: {
          confidence_level: string
          confirmation_date: string
          confirmation_type: string
          confirmed_diagnosis: string | null
          created_at: string
          doctor_notes: string | null
          health_episode_id: string | null
          id: string
          next_followup_date: string | null
          patient_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_level?: string
          confirmation_date: string
          confirmation_type: string
          confirmed_diagnosis?: string | null
          created_at?: string
          doctor_notes?: string | null
          health_episode_id?: string | null
          id?: string
          next_followup_date?: string | null
          patient_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_level?: string
          confirmation_date?: string
          confirmation_type?: string
          confirmed_diagnosis?: string | null
          created_at?: string
          doctor_notes?: string | null
          health_episode_id?: string | null
          id?: string
          next_followup_date?: string | null
          patient_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_doctor_confirmations_episode"
            columns: ["health_episode_id"]
            isOneToOne: false
            referencedRelation: "health_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_notes: {
        Row: {
          confidence_score: number | null
          content: string
          conversation_context: Json | null
          created_at: string
          id: string
          is_active: boolean
          note_type: string
          patient_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          content: string
          conversation_context?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          note_type: string
          patient_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          content?: string
          conversation_context?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          note_type?: string
          patient_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      easy_chat_questions: {
        Row: {
          category: string
          created_at: string
          id: string
          is_root: boolean
          parent_question_id: string | null
          question_text: string
          response_leads_to: Json
        }
        Insert: {
          category: string
          created_at?: string
          id: string
          is_root?: boolean
          parent_question_id?: string | null
          question_text: string
          response_leads_to?: Json
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_root?: boolean
          parent_question_id?: string | null
          question_text?: string
          response_leads_to?: Json
        }
        Relationships: []
      }
      easy_chat_responses: {
        Row: {
          created_at: string
          id: string
          question_id: string
          response_text: string
          response_value: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          response_text: string
          response_value: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          response_text?: string
          response_value?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "easy_chat_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "easy_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      easy_chat_sessions: {
        Row: {
          completed: boolean
          created_at: string
          current_question_id: string | null
          final_summary: string | null
          id: string
          patient_id: string | null
          session_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          current_question_id?: string | null
          final_summary?: string | null
          id?: string
          patient_id?: string | null
          session_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          current_question_id?: string | null
          final_summary?: string | null
          id?: string
          patient_id?: string | null
          session_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      final_medical_analysis: {
        Row: {
          analysis_summary: string
          clinical_insights: Json | null
          confidence_score: number | null
          created_at: string
          data_sources_analyzed: Json | null
          doctor_test_recommendations: Json | null
          follow_up_recommendations: string[] | null
          holistic_assessment: string | null
          id: string
          key_findings: Json | null
          patient_id: string | null
          priority_level: string
          risk_assessment: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_summary: string
          clinical_insights?: Json | null
          confidence_score?: number | null
          created_at?: string
          data_sources_analyzed?: Json | null
          doctor_test_recommendations?: Json | null
          follow_up_recommendations?: string[] | null
          holistic_assessment?: string | null
          id?: string
          key_findings?: Json | null
          patient_id?: string | null
          priority_level?: string
          risk_assessment?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_summary?: string
          clinical_insights?: Json | null
          confidence_score?: number | null
          created_at?: string
          data_sources_analyzed?: Json | null
          doctor_test_recommendations?: Json | null
          follow_up_recommendations?: string[] | null
          holistic_assessment?: string | null
          id?: string
          key_findings?: Json | null
          patient_id?: string | null
          priority_level?: string
          risk_assessment?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_data_priorities: {
        Row: {
          created_at: string
          data_type: string
          id: string
          priority_level: string
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_type: string
          id?: string
          priority_level: string
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_type?: string
          id?: string
          priority_level?: string
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_episodes: {
        Row: {
          created_at: string
          end_date: string | null
          episode_description: string | null
          episode_title: string
          episode_type: string
          id: string
          patient_id: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          episode_description?: string | null
          episode_title: string
          episode_type?: string
          id?: string
          patient_id?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          episode_description?: string | null
          episode_title?: string
          episode_type?: string
          id?: string
          patient_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_insights: {
        Row: {
          acknowledged_at: string | null
          confidence_score: number | null
          created_at: string
          description: string
          health_record_id: string
          id: string
          insight_type: string
          is_acknowledged: boolean
          metadata: Json | null
          patient_id: string | null
          recommendation: string | null
          severity_level: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          confidence_score?: number | null
          created_at?: string
          description: string
          health_record_id: string
          id?: string
          insight_type: string
          is_acknowledged?: boolean
          metadata?: Json | null
          patient_id?: string | null
          recommendation?: string | null
          severity_level?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string
          health_record_id?: string
          id?: string
          insight_type?: string
          is_acknowledged?: boolean
          metadata?: Json | null
          patient_id?: string | null
          recommendation?: string | null
          severity_level?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_record_history: {
        Row: {
          change_reason: string | null
          change_type: string
          changed_fields: string[] | null
          created_at: string
          health_record_id: string
          id: string
          new_data: Json | null
          patient_id: string | null
          previous_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          change_reason?: string | null
          change_type: string
          changed_fields?: string[] | null
          created_at?: string
          health_record_id: string
          id?: string
          new_data?: Json | null
          patient_id?: string | null
          previous_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          change_reason?: string | null
          change_type?: string
          changed_fields?: string[] | null
          created_at?: string
          health_record_id?: string
          id?: string
          new_data?: Json | null
          patient_id?: string | null
          previous_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_record_summaries: {
        Row: {
          created_at: string
          health_record_id: string
          id: string
          priority_level: string
          summary_text: string
          summary_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          health_record_id: string
          id?: string
          priority_level?: string
          summary_text: string
          summary_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          health_record_id?: string
          id?: string
          priority_level?: string
          summary_text?: string
          summary_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_health_record_summaries_health_record_id"
            columns: ["health_record_id"]
            isOneToOne: false
            referencedRelation: "health_records"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          category: string | null
          created_at: string
          data: Json | null
          file_url: string | null
          id: string
          metadata: Json | null
          patient_id: string | null
          record_type: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          data?: Json | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          record_type: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          data?: Json | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          record_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_topics_for_discussion: {
        Row: {
          category: string
          conversation_id: string
          created_at: string
          health_topic: string
          id: string
          patient_id: string
          reasoning: string | null
          relevance_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          conversation_id: string
          created_at?: string
          health_topic: string
          id?: string
          patient_id: string
          reasoning?: string | null
          relevance_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          conversation_id?: string
          created_at?: string
          health_topic?: string
          id?: string
          patient_id?: string
          reasoning?: string | null
          relevance_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_tokens: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          token_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          token_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          token_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          breed: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string
          gender: string | null
          id: string
          is_pet: boolean
          is_primary: boolean | null
          last_name: string
          probable_diagnoses: Json | null
          relationship: string
          species: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          breed?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          gender?: string | null
          id?: string
          is_pet?: boolean
          is_primary?: boolean | null
          last_name: string
          probable_diagnoses?: Json | null
          relationship?: string
          species?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          breed?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          is_pet?: boolean
          is_primary?: boolean | null
          last_name?: string
          probable_diagnoses?: Json | null
          relationship?: string
          species?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          alpha_tester: boolean
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          medical_disclaimer_accepted: boolean | null
          medical_disclaimer_accepted_at: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alpha_tester?: boolean
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          medical_disclaimer_accepted?: boolean | null
          medical_disclaimer_accepted_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alpha_tester?: boolean
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          medical_disclaimer_accepted?: boolean | null
          medical_disclaimer_accepted_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      request_tracking: {
        Row: {
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          patient_id: string | null
          request_type: string
          success: boolean | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          request_type: string
          success?: boolean | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          request_type?: string
          success?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      solution_feedback: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          patient_id: string
          solution_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_type: string
          id?: string
          patient_id: string
          solution_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          patient_id?: string
          solution_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_gems: {
        Row: {
          created_at: string
          current_gems: number
          id: string
          last_reset_at: string
          max_gems: number
          next_reset_at: string
          subscription_tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_gems?: number
          id?: string
          last_reset_at?: string
          max_gems?: number
          next_reset_at?: string
          subscription_tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_gems?: number
          id?: string
          last_reset_at?: string
          max_gems?: number
          next_reset_at?: string
          subscription_tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_total_user_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      is_alpha_tester: {
        Args: { user_email: string }
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
