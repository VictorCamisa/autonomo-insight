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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_agent_conversations: {
        Row: {
          agent_id: string
          channel: string | null
          created_at: string | null
          customer_phone: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          session_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          channel?: string | null
          created_at?: string | null
          customer_phone?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          session_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          channel?: string | null
          created_at?: string | null
          customer_phone?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          session_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_data_sources: {
        Row: {
          agent_id: string
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          source_type: string
          sync_frequency: string | null
        }
        Insert: {
          agent_id: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          source_type: string
          sync_frequency?: string | null
        }
        Update: {
          agent_id?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          source_type?: string
          sync_frequency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_data_sources_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_guardrails: {
        Row: {
          agent_id: string
          config: Json | null
          created_at: string | null
          guardrail_type: string
          id: string
          is_active: boolean | null
          name: string
          violation_action: string | null
        }
        Insert: {
          agent_id: string
          config?: Json | null
          created_at?: string | null
          guardrail_type: string
          id?: string
          is_active?: boolean | null
          name: string
          violation_action?: string | null
        }
        Update: {
          agent_id?: string
          config?: Json | null
          created_at?: string | null
          guardrail_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          violation_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_guardrails_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_human_takeover: {
        Row: {
          conversation_id: string
          created_at: string | null
          handled_by: string | null
          id: string
          reason: string | null
          resolution_notes: string | null
          resolved_at: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          handled_by?: string | null
          id?: string
          reason?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          handled_by?: string | null
          id?: string
          reason?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_human_takeover_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_messages: {
        Row: {
          audio_url: string | null
          content: string | null
          conversation_id: string
          created_at: string | null
          id: string
          latency_ms: number | null
          role: string
          thinking: string | null
          tokens_used: number | null
          tool_calls: Json | null
          tool_results: Json | null
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          role: string
          thinking?: string | null
          tokens_used?: number | null
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          role?: string
          thinking?: string | null
          tokens_used?: number | null
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_metrics: {
        Row: {
          agent_id: string
          avg_response_time_ms: number | null
          created_at: string | null
          date: string
          failed_tool_calls: number | null
          human_takeovers: number | null
          id: string
          satisfaction_score: number | null
          successful_tool_calls: number | null
          total_conversations: number | null
          total_messages: number | null
          total_tokens_used: number | null
        }
        Insert: {
          agent_id: string
          avg_response_time_ms?: number | null
          created_at?: string | null
          date: string
          failed_tool_calls?: number | null
          human_takeovers?: number | null
          id?: string
          satisfaction_score?: number | null
          successful_tool_calls?: number | null
          total_conversations?: number | null
          total_messages?: number | null
          total_tokens_used?: number | null
        }
        Update: {
          agent_id?: string
          avg_response_time_ms?: number | null
          created_at?: string | null
          date?: string
          failed_tool_calls?: number | null
          human_takeovers?: number | null
          id?: string
          satisfaction_score?: number | null
          successful_tool_calls?: number | null
          total_conversations?: number | null
          total_messages?: number | null
          total_tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_metrics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_notifications: {
        Row: {
          agent_id: string
          channels: string[] | null
          condition: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          recipients: Json | null
          threshold: number | null
        }
        Insert: {
          agent_id: string
          channels?: string[] | null
          condition: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          recipients?: Json | null
          threshold?: number | null
        }
        Update: {
          agent_id?: string
          channels?: string[] | null
          condition?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          recipients?: Json | null
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_tests: {
        Row: {
          agent_id: string
          created_at: string | null
          description: string | null
          expected_behaviors: Json | null
          id: string
          last_run_at: string | null
          last_run_details: Json | null
          last_run_result: string | null
          name: string
          test_messages: Json | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          description?: string | null
          expected_behaviors?: Json | null
          id?: string
          last_run_at?: string | null
          last_run_details?: Json | null
          last_run_result?: string | null
          name: string
          test_messages?: Json | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          description?: string | null
          expected_behaviors?: Json | null
          id?: string
          last_run_at?: string | null
          last_run_details?: Json | null
          last_run_result?: string | null
          name?: string
          test_messages?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_tests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_tools: {
        Row: {
          agent_id: string
          auth_config: Json | null
          auth_method: string | null
          created_at: string | null
          description: string | null
          endpoint_url: string | null
          id: string
          is_active: boolean | null
          name: string
          parameters: Json | null
          tool_type: string
        }
        Insert: {
          agent_id: string
          auth_config?: Json | null
          auth_method?: string | null
          created_at?: string | null
          description?: string | null
          endpoint_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parameters?: Json | null
          tool_type: string
        }
        Update: {
          agent_id?: string
          auth_config?: Json | null
          auth_method?: string | null
          created_at?: string | null
          description?: string | null
          endpoint_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parameters?: Json | null
          tool_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_tools_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_workflows: {
        Row: {
          actions: Json | null
          agent_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_config: Json | null
          trigger_type: string
        }
        Insert: {
          actions?: Json | null
          agent_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_config?: Json | null
          trigger_type: string
        }
        Update: {
          actions?: Json | null
          agent_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_workflows_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          api_endpoint: string | null
          api_key_encrypted: string | null
          avatar_url: string | null
          context_window_size: number | null
          created_at: string | null
          created_by: string | null
          deployment_channels: string[] | null
          description: string | null
          elevenlabs_api_key: string | null
          embed_code: string | null
          enable_voice: boolean | null
          id: string
          llm_model: string | null
          llm_provider: string | null
          long_term_memory_enabled: boolean | null
          max_tokens: number | null
          name: string
          objective: string | null
          redis_host: string | null
          redis_password: string | null
          redis_password_encrypted: string | null
          redis_port: number | null
          short_term_memory_type: string | null
          status: string | null
          system_prompt: string | null
          temperature: number | null
          top_p: number | null
          transfer_keywords: string[] | null
          transfer_to_human_enabled: boolean | null
          updated_at: string | null
          vector_db_config: Json | null
          vector_db_provider: string | null
          voice_id: string | null
          voice_model: string | null
          webhook_url: string | null
          whatsapp_auto_reply: boolean | null
          whatsapp_instance_id: string | null
          whatsapp_welcome_message: string | null
        }
        Insert: {
          api_endpoint?: string | null
          api_key_encrypted?: string | null
          avatar_url?: string | null
          context_window_size?: number | null
          created_at?: string | null
          created_by?: string | null
          deployment_channels?: string[] | null
          description?: string | null
          elevenlabs_api_key?: string | null
          embed_code?: string | null
          enable_voice?: boolean | null
          id?: string
          llm_model?: string | null
          llm_provider?: string | null
          long_term_memory_enabled?: boolean | null
          max_tokens?: number | null
          name: string
          objective?: string | null
          redis_host?: string | null
          redis_password?: string | null
          redis_password_encrypted?: string | null
          redis_port?: number | null
          short_term_memory_type?: string | null
          status?: string | null
          system_prompt?: string | null
          temperature?: number | null
          top_p?: number | null
          transfer_keywords?: string[] | null
          transfer_to_human_enabled?: boolean | null
          updated_at?: string | null
          vector_db_config?: Json | null
          vector_db_provider?: string | null
          voice_id?: string | null
          voice_model?: string | null
          webhook_url?: string | null
          whatsapp_auto_reply?: boolean | null
          whatsapp_instance_id?: string | null
          whatsapp_welcome_message?: string | null
        }
        Update: {
          api_endpoint?: string | null
          api_key_encrypted?: string | null
          avatar_url?: string | null
          context_window_size?: number | null
          created_at?: string | null
          created_by?: string | null
          deployment_channels?: string[] | null
          description?: string | null
          elevenlabs_api_key?: string | null
          embed_code?: string | null
          enable_voice?: boolean | null
          id?: string
          llm_model?: string | null
          llm_provider?: string | null
          long_term_memory_enabled?: boolean | null
          max_tokens?: number | null
          name?: string
          objective?: string | null
          redis_host?: string | null
          redis_password?: string | null
          redis_password_encrypted?: string | null
          redis_port?: number | null
          short_term_memory_type?: string | null
          status?: string | null
          system_prompt?: string | null
          temperature?: number | null
          top_p?: number | null
          transfer_keywords?: string[] | null
          transfer_to_human_enabled?: boolean | null
          updated_at?: string | null
          vector_db_config?: Json | null
          vector_db_provider?: string | null
          voice_id?: string | null
          voice_model?: string | null
          webhook_url?: string | null
          whatsapp_auto_reply?: boolean | null
          whatsapp_instance_id?: string | null
          whatsapp_welcome_message?: string | null
        }
        Relationships: []
      }
      campaign_events: {
        Row: {
          all_day: boolean | null
          campaign_id: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          meta_campaign_id: string | null
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          campaign_id?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type: string
          id?: string
          meta_campaign_id?: string | null
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          campaign_id?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          meta_campaign_id?: string | null
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      channel_costs: {
        Row: {
          channel: string
          created_at: string | null
          created_by: string | null
          fixed_cost: number | null
          id: string
          month: string
          notes: string | null
          total_leads: number | null
          total_revenue: number | null
          total_sales: number | null
          updated_at: string | null
          variable_cost: number | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          created_by?: string | null
          fixed_cost?: number | null
          id?: string
          month: string
          notes?: string | null
          total_leads?: number | null
          total_revenue?: number | null
          total_sales?: number | null
          updated_at?: string | null
          variable_cost?: number | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          created_by?: string | null
          fixed_cost?: number | null
          id?: string
          month?: string
          notes?: string | null
          total_leads?: number | null
          total_revenue?: number | null
          total_sales?: number | null
          updated_at?: string | null
          variable_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_costs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_costs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      commission_audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          commission_id: string
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          commission_id: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          commission_id?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commission_audit_log_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "sale_commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          campaign_id: string | null
          commission_type: Database["public"]["Enums"]["commission_type"]
          created_at: string
          created_by: string | null
          description: string | null
          fixed_value: number | null
          goal_period: string | null
          goal_target: number | null
          id: string
          is_active: boolean
          lead_source_bonus: Json | null
          max_days_in_stock: number | null
          max_vehicle_price: number | null
          min_days_in_stock: number | null
          min_profit_margin: number | null
          min_vehicle_price: number | null
          name: string
          percentage_value: number | null
          priority: number
          tiers: Json | null
          updated_at: string
          vehicle_categories: string[] | null
        }
        Insert: {
          campaign_id?: string | null
          commission_type: Database["public"]["Enums"]["commission_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          fixed_value?: number | null
          goal_period?: string | null
          goal_target?: number | null
          id?: string
          is_active?: boolean
          lead_source_bonus?: Json | null
          max_days_in_stock?: number | null
          max_vehicle_price?: number | null
          min_days_in_stock?: number | null
          min_profit_margin?: number | null
          min_vehicle_price?: number | null
          name: string
          percentage_value?: number | null
          priority?: number
          tiers?: Json | null
          updated_at?: string
          vehicle_categories?: string[] | null
        }
        Update: {
          campaign_id?: string | null
          commission_type?: Database["public"]["Enums"]["commission_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          fixed_value?: number | null
          goal_period?: string | null
          goal_target?: number | null
          id?: string
          is_active?: boolean
          lead_source_bonus?: Json | null
          max_days_in_stock?: number | null
          max_vehicle_price?: number | null
          min_days_in_stock?: number | null
          min_profit_margin?: number | null
          min_vehicle_price?: number | null
          name?: string
          percentage_value?: number | null
          priority?: number
          tiers?: Json | null
          updated_at?: string
          vehicle_categories?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_splits: {
        Row: {
          created_at: string
          id: string
          percentage: number
          sale_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          percentage?: number
          sale_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          percentage?: number
          sale_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_splits_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_profit_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_splits_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          lead_id: string | null
          name: string
          notes: string | null
          phone: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          name: string
          notes?: string | null
          phone: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          notes?: string | null
          phone?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          parent_id: string | null
          type: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          parent_id?: string | null
          type: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          parent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          recurrence: string | null
          recurrence_end_date: string | null
          sale_id: string | null
          status: string
          subcategory: string | null
          transaction_date: string
          type: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          recurrence?: string | null
          recurrence_end_date?: string | null
          sale_id?: string | null
          status?: string
          subcategory?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          recurrence?: string | null
          recurrence_end_date?: string | null
          sale_id?: string | null
          status?: string
          subcategory?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_profit_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_executions: {
        Row: {
          executed_at: string
          executed_by: string | null
          flow_id: string
          id: string
          lead_id: string
          message_sent: string | null
          status: string | null
          whatsapp_number: string | null
        }
        Insert: {
          executed_at?: string
          executed_by?: string | null
          flow_id: string
          id?: string
          lead_id: string
          message_sent?: string | null
          status?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          executed_at?: string
          executed_by?: string | null
          flow_id?: string
          id?: string
          lead_id?: string
          message_sent?: string | null
          status?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "follow_up_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_flows: {
        Row: {
          created_at: string
          created_by: string | null
          days_of_week: number[] | null
          delay_days: number | null
          delay_hours: number | null
          description: string | null
          exclude_converted_leads: boolean | null
          exclude_lost_leads: boolean | null
          id: string
          include_company_name: boolean | null
          include_salesperson_name: boolean | null
          include_vehicle_info: boolean | null
          is_active: boolean
          max_contacts_per_lead: number | null
          message_template: string
          min_days_since_last_contact: number | null
          name: string
          priority: number | null
          specific_time: string | null
          target_lead_sources: string[] | null
          target_lead_status: string[] | null
          target_negotiation_status: string[] | null
          target_vehicle_interests: string[] | null
          trigger_type: string
          updated_at: string
          whatsapp_button_text: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_of_week?: number[] | null
          delay_days?: number | null
          delay_hours?: number | null
          description?: string | null
          exclude_converted_leads?: boolean | null
          exclude_lost_leads?: boolean | null
          id?: string
          include_company_name?: boolean | null
          include_salesperson_name?: boolean | null
          include_vehicle_info?: boolean | null
          is_active?: boolean
          max_contacts_per_lead?: number | null
          message_template: string
          min_days_since_last_contact?: number | null
          name: string
          priority?: number | null
          specific_time?: string | null
          target_lead_sources?: string[] | null
          target_lead_status?: string[] | null
          target_negotiation_status?: string[] | null
          target_vehicle_interests?: string[] | null
          trigger_type?: string
          updated_at?: string
          whatsapp_button_text?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_of_week?: number[] | null
          delay_days?: number | null
          delay_hours?: number | null
          description?: string | null
          exclude_converted_leads?: boolean | null
          exclude_lost_leads?: boolean | null
          id?: string
          include_company_name?: boolean | null
          include_salesperson_name?: boolean | null
          include_vehicle_info?: boolean | null
          is_active?: boolean
          max_contacts_per_lead?: number | null
          message_template?: string
          min_days_since_last_contact?: number | null
          name?: string
          priority?: number | null
          specific_time?: string | null
          target_lead_sources?: string[] | null
          target_lead_status?: string[] | null
          target_negotiation_status?: string[] | null
          target_vehicle_interests?: string[] | null
          trigger_type?: string
          updated_at?: string
          whatsapp_button_text?: string | null
        }
        Relationships: []
      }
      google_ad_groups: {
        Row: {
          campaign_id: string | null
          cpc_bid_micros: number | null
          created_at: string
          google_ad_group_id: string
          google_campaign_id: string
          id: string
          last_sync_at: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          cpc_bid_micros?: number | null
          created_at?: string
          google_ad_group_id: string
          google_campaign_id: string
          id?: string
          last_sync_at?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          cpc_bid_micros?: number | null
          created_at?: string
          google_ad_group_id?: string
          google_campaign_id?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ad_groups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "google_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads: {
        Row: {
          ad_group_id: string | null
          ad_type: string | null
          created_at: string
          descriptions: string[] | null
          final_urls: string[] | null
          google_ad_group_id: string
          google_ad_id: string
          headlines: string[] | null
          id: string
          last_sync_at: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          ad_group_id?: string | null
          ad_type?: string | null
          created_at?: string
          descriptions?: string[] | null
          final_urls?: string[] | null
          google_ad_group_id: string
          google_ad_id: string
          headlines?: string[] | null
          id?: string
          last_sync_at?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          ad_group_id?: string | null
          ad_type?: string | null
          created_at?: string
          descriptions?: string[] | null
          final_urls?: string[] | null
          google_ad_group_id?: string
          google_ad_id?: string
          headlines?: string[] | null
          id?: string
          last_sync_at?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_ad_group_id_fkey"
            columns: ["ad_group_id"]
            isOneToOne: false
            referencedRelation: "google_ad_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      google_campaigns: {
        Row: {
          advertising_channel_type: string | null
          bidding_strategy_type: string | null
          created_at: string
          daily_budget: number | null
          end_date: string | null
          google_campaign_id: string
          id: string
          last_sync_at: string | null
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advertising_channel_type?: string | null
          bidding_strategy_type?: string | null
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          google_campaign_id: string
          id?: string
          last_sync_at?: string | null
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          advertising_channel_type?: string | null
          bidding_strategy_type?: string | null
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          google_campaign_id?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      google_insights: {
        Row: {
          avg_cpc_micros: number | null
          avg_cpm_micros: number | null
          clicks: number | null
          conversions: number | null
          conversions_value: number | null
          cost_micros: number | null
          created_at: string
          ctr: number | null
          date_start: string
          date_stop: string
          entity_id: string
          entity_type: string
          id: string
          impressions: number | null
        }
        Insert: {
          avg_cpc_micros?: number | null
          avg_cpm_micros?: number | null
          clicks?: number | null
          conversions?: number | null
          conversions_value?: number | null
          cost_micros?: number | null
          created_at?: string
          ctr?: number | null
          date_start: string
          date_stop: string
          entity_id: string
          entity_type: string
          id?: string
          impressions?: number | null
        }
        Update: {
          avg_cpc_micros?: number | null
          avg_cpm_micros?: number | null
          clicks?: number | null
          conversions?: number | null
          conversions_value?: number | null
          cost_micros?: number | null
          created_at?: string
          ctr?: number | null
          date_start?: string
          date_stop?: string
          entity_id?: string
          entity_type?: string
          id?: string
          impressions?: number | null
        }
        Relationships: []
      }
      google_sync_logs: {
        Row: {
          ad_groups_synced: number | null
          ads_synced: number | null
          campaigns_synced: number | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          insights_synced: number | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          ad_groups_synced?: number | null
          ads_synced?: number | null
          campaigns_synced?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          insights_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Update: {
          ad_groups_synced?: number | null
          ads_synced?: number | null
          campaigns_synced?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          insights_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      lead_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_type: string
          id: string
          lead_id: string
          notes: string | null
          salesperson_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type?: string
          id?: string
          lead_id: string
          notes?: string | null
          salesperson_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type?: string
          id?: string
          lead_id?: string
          notes?: string | null
          salesperson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lead_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lead_costs: {
        Row: {
          campaign_id: string | null
          cost_amount: number
          created_at: string
          description: string | null
          id: string
          lead_id: string
        }
        Insert: {
          campaign_id?: string | null
          cost_amount?: number
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
        }
        Update: {
          campaign_id?: string | null
          cost_amount?: number
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_costs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_costs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          created_at: string
          description: string
          follow_up_completed: boolean | null
          follow_up_date: string | null
          id: string
          lead_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          follow_up_completed?: boolean | null
          follow_up_date?: string | null
          id?: string
          lead_id: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          follow_up_completed?: boolean | null
          follow_up_date?: string | null
          id?: string
          lead_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_qualification_data: {
        Row: {
          additional_info: Json | null
          budget: number | null
          clean_credit: boolean | null
          cpf: string | null
          created_at: string | null
          desired_installment: number | null
          down_payment: number | null
          has_trade_in: boolean | null
          id: string
          is_qualified: boolean | null
          lead_id: string | null
          message_count: number | null
          qualified_at: string | null
          trade_in_vehicle: string | null
          updated_at: string | null
          vehicle_interest: string | null
        }
        Insert: {
          additional_info?: Json | null
          budget?: number | null
          clean_credit?: boolean | null
          cpf?: string | null
          created_at?: string | null
          desired_installment?: number | null
          down_payment?: number | null
          has_trade_in?: boolean | null
          id?: string
          is_qualified?: boolean | null
          lead_id?: string | null
          message_count?: number | null
          qualified_at?: string | null
          trade_in_vehicle?: string | null
          updated_at?: string | null
          vehicle_interest?: string | null
        }
        Update: {
          additional_info?: Json | null
          budget?: number | null
          clean_credit?: boolean | null
          cpf?: string | null
          created_at?: string | null
          desired_installment?: number | null
          down_payment?: number | null
          has_trade_in?: boolean | null
          id?: string
          is_qualified?: boolean | null
          lead_id?: string | null
          message_count?: number | null
          qualified_at?: string | null
          trade_in_vehicle?: string | null
          updated_at?: string | null
          vehicle_interest?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_qualification_data_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_response_at: string | null
          id: string
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          name: string
          notes: string | null
          phone: string
          qualification_reason: string | null
          qualification_status:
            | Database["public"]["Enums"]["qualification_status"]
            | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          vehicle_interest: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_response_at?: string | null
          id?: string
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          name: string
          notes?: string | null
          phone: string
          qualification_reason?: string | null
          qualification_status?:
            | Database["public"]["Enums"]["qualification_status"]
            | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vehicle_interest?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_response_at?: string | null
          id?: string
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          name?: string
          notes?: string | null
          phone?: string
          qualification_reason?: string | null
          qualification_status?:
            | Database["public"]["Enums"]["qualification_status"]
            | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vehicle_interest?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_meta_ad_id_fkey"
            columns: ["meta_ad_id"]
            isOneToOne: false
            referencedRelation: "meta_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_meta_adset_id_fkey"
            columns: ["meta_adset_id"]
            isOneToOne: false
            referencedRelation: "meta_adsets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_meta_campaign_id_fkey"
            columns: ["meta_campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      loss_recovery_executions: {
        Row: {
          executed_at: string
          executed_by: string | null
          id: string
          lead_id: string
          negotiation_id: string
          result_message: string | null
          rule_id: string
          status: string | null
        }
        Insert: {
          executed_at?: string
          executed_by?: string | null
          id?: string
          lead_id: string
          negotiation_id: string
          result_message?: string | null
          rule_id: string
          status?: string | null
        }
        Update: {
          executed_at?: string
          executed_by?: string | null
          id?: string
          lead_id?: string
          negotiation_id?: string
          result_message?: string | null
          rule_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loss_recovery_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loss_recovery_executions_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loss_recovery_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "loss_recovery_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      loss_recovery_rules: {
        Row: {
          action_type: string
          alert_price_range_percent: number | null
          alert_year_range: number | null
          auto_create_alert: boolean | null
          created_at: string
          created_by: string | null
          delay_days: number | null
          delay_hours: number | null
          description: string | null
          id: string
          include_salesperson_name: boolean | null
          include_vehicle_info: boolean | null
          is_active: boolean
          max_attempts_per_lead: number | null
          message_template: string | null
          min_days_since_loss: number | null
          name: string
          priority: number | null
          trigger_loss_reasons: string[]
          updated_at: string
        }
        Insert: {
          action_type?: string
          alert_price_range_percent?: number | null
          alert_year_range?: number | null
          auto_create_alert?: boolean | null
          created_at?: string
          created_by?: string | null
          delay_days?: number | null
          delay_hours?: number | null
          description?: string | null
          id?: string
          include_salesperson_name?: boolean | null
          include_vehicle_info?: boolean | null
          is_active?: boolean
          max_attempts_per_lead?: number | null
          message_template?: string | null
          min_days_since_loss?: number | null
          name: string
          priority?: number | null
          trigger_loss_reasons?: string[]
          updated_at?: string
        }
        Update: {
          action_type?: string
          alert_price_range_percent?: number | null
          alert_year_range?: number | null
          auto_create_alert?: boolean | null
          created_at?: string
          created_by?: string | null
          delay_days?: number | null
          delay_hours?: number | null
          description?: string | null
          id?: string
          include_salesperson_name?: boolean | null
          include_vehicle_info?: boolean | null
          is_active?: boolean
          max_attempts_per_lead?: number | null
          message_template?: string | null
          min_days_since_loss?: number | null
          name?: string
          priority?: number | null
          trigger_loss_reasons?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      marketing_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          data: Json | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message: string
          related_entity_id: string | null
          related_entity_type: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          severity: string
          title: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          budget: number
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          platform: string
          spent: number
          start_date: string
          updated_at: string
        }
        Insert: {
          budget?: number
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          platform: string
          spent?: number
          start_date: string
          updated_at?: string
        }
        Update: {
          budget?: number
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          platform?: string
          spent?: number
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      mercadolibre_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          ml_nickname: string | null
          ml_user_id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          ml_nickname?: string | null
          ml_user_id: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          ml_nickname?: string | null
          ml_user_id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meta_ads: {
        Row: {
          adset_id: string | null
          created_at: string
          creative_id: string | null
          id: string
          last_sync_at: string | null
          meta_ad_id: string
          meta_adset_id: string
          name: string
          preview_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          adset_id?: string | null
          created_at?: string
          creative_id?: string | null
          id?: string
          last_sync_at?: string | null
          meta_ad_id: string
          meta_adset_id: string
          name: string
          preview_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          adset_id?: string | null
          created_at?: string
          creative_id?: string | null
          id?: string
          last_sync_at?: string | null
          meta_ad_id?: string
          meta_adset_id?: string
          name?: string
          preview_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "meta_adsets"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_adsets: {
        Row: {
          billing_event: string | null
          campaign_id: string | null
          created_at: string
          daily_budget: number | null
          id: string
          last_sync_at: string | null
          lifetime_budget: number | null
          meta_adset_id: string
          meta_campaign_id: string
          name: string
          optimization_goal: string | null
          status: string
          targeting: Json | null
          updated_at: string
        }
        Insert: {
          billing_event?: string | null
          campaign_id?: string | null
          created_at?: string
          daily_budget?: number | null
          id?: string
          last_sync_at?: string | null
          lifetime_budget?: number | null
          meta_adset_id: string
          meta_campaign_id: string
          name: string
          optimization_goal?: string | null
          status?: string
          targeting?: Json | null
          updated_at?: string
        }
        Update: {
          billing_event?: string | null
          campaign_id?: string | null
          created_at?: string
          daily_budget?: number | null
          id?: string
          last_sync_at?: string | null
          lifetime_budget?: number | null
          meta_adset_id?: string
          meta_campaign_id?: string
          name?: string
          optimization_goal?: string | null
          status?: string
          targeting?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_adsets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaigns: {
        Row: {
          created_at: string
          created_time: string | null
          daily_budget: number | null
          id: string
          last_sync_at: string | null
          lifetime_budget: number | null
          meta_campaign_id: string
          name: string
          objective: string | null
          start_time: string | null
          status: string
          stop_time: string | null
          updated_at: string
          updated_time: string | null
        }
        Insert: {
          created_at?: string
          created_time?: string | null
          daily_budget?: number | null
          id?: string
          last_sync_at?: string | null
          lifetime_budget?: number | null
          meta_campaign_id: string
          name: string
          objective?: string | null
          start_time?: string | null
          status?: string
          stop_time?: string | null
          updated_at?: string
          updated_time?: string | null
        }
        Update: {
          created_at?: string
          created_time?: string | null
          daily_budget?: number | null
          id?: string
          last_sync_at?: string | null
          lifetime_budget?: number | null
          meta_campaign_id?: string
          name?: string
          objective?: string | null
          start_time?: string | null
          status?: string
          stop_time?: string | null
          updated_at?: string
          updated_time?: string | null
        }
        Relationships: []
      }
      meta_insights: {
        Row: {
          actions: Json | null
          clicks: number | null
          conversions: number | null
          cost_per_result: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          date_start: string
          date_stop: string
          entity_id: string
          entity_type: string
          frequency: number | null
          id: string
          impressions: number | null
          reach: number | null
          spend: number | null
          unique_clicks: number | null
        }
        Insert: {
          actions?: Json | null
          clicks?: number | null
          conversions?: number | null
          cost_per_result?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date_start: string
          date_stop: string
          entity_id: string
          entity_type: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          reach?: number | null
          spend?: number | null
          unique_clicks?: number | null
        }
        Update: {
          actions?: Json | null
          clicks?: number | null
          conversions?: number | null
          cost_per_result?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date_start?: string
          date_stop?: string
          entity_id?: string
          entity_type?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          reach?: number | null
          spend?: number | null
          unique_clicks?: number | null
        }
        Relationships: []
      }
      meta_sync_logs: {
        Row: {
          ads_synced: number | null
          adsets_synced: number | null
          campaigns_synced: number | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          insights_synced: number | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          ads_synced?: number | null
          adsets_synced?: number | null
          campaigns_synced?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          insights_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Update: {
          ads_synced?: number | null
          adsets_synced?: number | null
          campaigns_synced?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          insights_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      negotiations: {
        Row: {
          actual_close_date: string | null
          appointment_date: string | null
          appointment_time: string | null
          contact_attempts: number | null
          created_at: string
          customer_id: string | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          lead_id: string
          loss_reason: string | null
          no_show_count: number | null
          notes: string | null
          objections: Json | null
          probability: number | null
          salesperson_id: string
          showed_up: boolean | null
          status: Database["public"]["Enums"]["negotiation_status"]
          structured_loss_reason:
            | Database["public"]["Enums"]["loss_reason_type"]
            | null
          test_drive_completed: boolean | null
          test_drive_scheduled: boolean | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          actual_close_date?: string | null
          appointment_date?: string | null
          appointment_time?: string | null
          contact_attempts?: number | null
          created_at?: string
          customer_id?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          lead_id: string
          loss_reason?: string | null
          no_show_count?: number | null
          notes?: string | null
          objections?: Json | null
          probability?: number | null
          salesperson_id: string
          showed_up?: boolean | null
          status?: Database["public"]["Enums"]["negotiation_status"]
          structured_loss_reason?:
            | Database["public"]["Enums"]["loss_reason_type"]
            | null
          test_drive_completed?: boolean | null
          test_drive_scheduled?: boolean | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_close_date?: string | null
          appointment_date?: string | null
          appointment_time?: string | null
          contact_attempts?: number | null
          created_at?: string
          customer_id?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string
          loss_reason?: string | null
          no_show_count?: number | null
          notes?: string | null
          objections?: Json | null
          probability?: number | null
          salesperson_id?: string
          showed_up?: boolean | null
          status?: Database["public"]["Enums"]["negotiation_status"]
          structured_loss_reason?:
            | Database["public"]["Enums"]["loss_reason_type"]
            | null
          test_drive_completed?: boolean | null
          test_drive_scheduled?: boolean | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "negotiations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          is_master: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          is_master?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_master?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      round_robin_config: {
        Row: {
          created_at: string
          current_leads_today: number
          id: string
          is_active: boolean
          last_assigned_at: string | null
          max_leads_per_day: number | null
          priority: number
          salesperson_id: string
          total_leads_assigned: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_leads_today?: number
          id?: string
          is_active?: boolean
          last_assigned_at?: string | null
          max_leads_per_day?: number | null
          priority?: number
          salesperson_id: string
          total_leads_assigned?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_leads_today?: number
          id?: string
          is_active?: boolean
          last_assigned_at?: string | null
          max_leads_per_day?: number | null
          priority?: number
          salesperson_id?: string
          total_leads_assigned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_robin_config_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_robin_config_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: true
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sale_commissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          calculated_amount: number
          commission_rule_id: string | null
          created_at: string
          final_amount: number
          id: string
          manual_adjustment: number | null
          notes: string | null
          paid: boolean
          paid_at: string | null
          payment_due_date: string | null
          rejection_reason: string | null
          sale_id: string
          split_percentage: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          calculated_amount?: number
          commission_rule_id?: string | null
          created_at?: string
          final_amount?: number
          id?: string
          manual_adjustment?: number | null
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          payment_due_date?: string | null
          rejection_reason?: string | null
          sale_id: string
          split_percentage?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          calculated_amount?: number
          commission_rule_id?: string | null
          created_at?: string
          final_amount?: number
          id?: string
          manual_adjustment?: number | null
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          payment_due_date?: string | null
          rejection_reason?: string | null
          sale_id?: string
          split_percentage?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_commissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_commissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sale_commissions_commission_rule_id_fkey"
            columns: ["commission_rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_profit_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payment_methods: {
        Row: {
          amount: number
          created_at: string | null
          details: string | null
          financing_bank: string | null
          financing_entry_value: number | null
          financing_financed_value: number | null
          financing_installment_value: number | null
          financing_installments: number | null
          financing_interest_rate: number | null
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          details?: string | null
          financing_bank?: string | null
          financing_entry_value?: number | null
          financing_financed_value?: number | null
          financing_installment_value?: number | null
          financing_installments?: number | null
          financing_interest_rate?: number | null
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          details?: string | null
          financing_bank?: string | null
          financing_entry_value?: number | null
          financing_financed_value?: number | null
          financing_installment_value?: number | null
          financing_installments?: number | null
          financing_interest_rate?: number | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payment_methods_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_profit_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payment_methods_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          customer_id: string
          documentation_cost: number | null
          id: string
          lead_id: string | null
          notes: string | null
          other_sale_costs: number | null
          payment_details: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          sale_date: string
          sale_price: number
          salesperson_id: string
          status: Database["public"]["Enums"]["sale_status"]
          transfer_cost: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          documentation_cost?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          other_sale_costs?: number | null
          payment_details?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sale_date?: string
          sale_price: number
          salesperson_id: string
          status?: Database["public"]["Enums"]["sale_status"]
          transfer_cost?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          documentation_cost?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          other_sale_costs?: number | null
          payment_details?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sale_date?: string
          sale_price?: number
          salesperson_id?: string
          status?: Database["public"]["Enums"]["sale_status"]
          transfer_cost?: number | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      salesperson_goals: {
        Row: {
          created_at: string
          current_profit: number
          current_revenue: number
          current_sales: number
          id: string
          period_end: string
          period_start: string
          target_profit: number
          target_revenue: number
          target_sales: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_profit?: number
          current_revenue?: number
          current_sales?: number
          id?: string
          period_end: string
          period_start: string
          target_profit?: number
          target_revenue?: number
          target_sales?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_profit?: number
          current_revenue?: number
          current_sales?: number
          id?: string
          period_end?: string
          period_start?: string
          target_profit?: number
          target_revenue?: number
          target_sales?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salesperson_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salesperson_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          config: Json | null
          created_at: string | null
          created_by: string | null
          frequency: string
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          name: string
          next_send_at: string | null
          recipients: string[] | null
          report_type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          name: string
          next_send_at?: string | null
          recipients?: string[] | null
          report_type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          name?: string
          next_send_at?: string | null
          recipients?: string[] | null
          report_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          module: string
          permission: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          module: string
          permission: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          module?: string
          permission?: string
          user_id?: string
        }
        Relationships: []
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
      utm_links: {
        Row: {
          base_url: string
          clicks: number | null
          created_at: string | null
          created_by: string | null
          full_url: string
          id: string
          is_template: boolean | null
          leads_generated: number | null
          name: string
          utm_campaign: string
          utm_content: string | null
          utm_medium: string
          utm_source: string
          utm_term: string | null
        }
        Insert: {
          base_url: string
          clicks?: number | null
          created_at?: string | null
          created_by?: string | null
          full_url: string
          id?: string
          is_template?: boolean | null
          leads_generated?: number | null
          name: string
          utm_campaign: string
          utm_content?: string | null
          utm_medium: string
          utm_source: string
          utm_term?: string | null
        }
        Update: {
          base_url?: string
          clicks?: number | null
          created_at?: string | null
          created_by?: string | null
          full_url?: string
          id?: string
          is_template?: boolean | null
          leads_generated?: number | null
          name?: string
          utm_campaign?: string
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      vehicle_costs: {
        Row: {
          amount: number
          cost_date: string
          cost_type: Database["public"]["Enums"]["vehicle_cost_type"]
          created_at: string
          created_by: string | null
          description: string
          id: string
          receipt_url: string | null
          vehicle_id: string
        }
        Insert: {
          amount: number
          cost_date?: string
          cost_type: Database["public"]["Enums"]["vehicle_cost_type"]
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          receipt_url?: string | null
          vehicle_id: string
        }
        Update: {
          amount?: number
          cost_date?: string
          cost_type?: Database["public"]["Enums"]["vehicle_cost_type"]
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          receipt_url?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_costs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_costs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_documents: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_images: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          is_cover: boolean | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          is_cover?: boolean | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          is_cover?: boolean | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_images_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_images_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_interest_alerts: {
        Row: {
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          id: string
          lead_id: string | null
          negotiation_id: string | null
          notes: string | null
          notified_at: string | null
          notified_vehicle_id: string | null
          price_max: number | null
          price_min: number | null
          status: string
          updated_at: string
          vehicle_brand: string | null
          vehicle_model: string | null
          year_max: number | null
          year_min: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          lead_id?: string | null
          negotiation_id?: string | null
          notes?: string | null
          notified_at?: string | null
          notified_vehicle_id?: string | null
          price_max?: number | null
          price_min?: number | null
          status?: string
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          year_max?: number | null
          year_min?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          lead_id?: string | null
          negotiation_id?: string | null
          notes?: string | null
          notified_at?: string | null
          notified_vehicle_id?: string | null
          price_max?: number | null
          price_min?: number | null
          status?: string
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          year_max?: number | null
          year_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_interest_alerts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_interest_alerts_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_interest_alerts_notified_vehicle_id_fkey"
            columns: ["notified_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_interest_alerts_notified_vehicle_id_fkey"
            columns: ["notified_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_simulations: {
        Row: {
          brand: string
          created_at: string
          created_by: string | null
          daily_holding_cost: number | null
          decision: string | null
          estimated_cleaning: number | null
          estimated_documentation: number | null
          estimated_maintenance: number | null
          estimated_other_costs: number | null
          estimated_sale_days: number | null
          expected_margin: number | null
          expected_margin_percent: number | null
          fipe_reference: number | null
          id: string
          km: number
          model: string
          notes: string | null
          purchase_price: number
          suggested_sale_price: number | null
          total_cost: number | null
          year_model: number
        }
        Insert: {
          brand: string
          created_at?: string
          created_by?: string | null
          daily_holding_cost?: number | null
          decision?: string | null
          estimated_cleaning?: number | null
          estimated_documentation?: number | null
          estimated_maintenance?: number | null
          estimated_other_costs?: number | null
          estimated_sale_days?: number | null
          expected_margin?: number | null
          expected_margin_percent?: number | null
          fipe_reference?: number | null
          id?: string
          km: number
          model: string
          notes?: string | null
          purchase_price: number
          suggested_sale_price?: number | null
          total_cost?: number | null
          year_model: number
        }
        Update: {
          brand?: string
          created_at?: string
          created_by?: string | null
          daily_holding_cost?: number | null
          decision?: string | null
          estimated_cleaning?: number | null
          estimated_documentation?: number | null
          estimated_maintenance?: number | null
          estimated_other_costs?: number | null
          estimated_sale_days?: number | null
          expected_margin?: number | null
          expected_margin_percent?: number | null
          fipe_reference?: number | null
          id?: string
          km?: number
          model?: string
          notes?: string | null
          purchase_price?: number
          suggested_sale_price?: number | null
          total_cost?: number | null
          year_model?: number
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          brand: string
          chassis: string | null
          city: string | null
          color: string
          created_at: string
          created_by: string | null
          doors: number | null
          estimated_cleaning: number | null
          estimated_documentation: number | null
          estimated_maintenance: number | null
          estimated_other_costs: number | null
          expected_margin_percent: number | null
          expected_sale_days: number | null
          featured: boolean | null
          fipe_price_at_purchase: number | null
          fuel_type: string
          id: string
          images: string[] | null
          km: number
          mercadolibre_id: string | null
          minimum_price: number | null
          ml_item_id: string | null
          ml_listing_type: string | null
          ml_permalink: string | null
          ml_published_at: string | null
          ml_status: string | null
          model: string
          notes: string | null
          plate: string | null
          purchase_date: string | null
          purchase_price: number | null
          purchase_source: string | null
          renavam: string | null
          sale_price: number | null
          state: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          transmission: string
          updated_at: string
          version: string | null
          year_fabrication: number
          year_model: number
          zip_code: string | null
        }
        Insert: {
          brand: string
          chassis?: string | null
          city?: string | null
          color: string
          created_at?: string
          created_by?: string | null
          doors?: number | null
          estimated_cleaning?: number | null
          estimated_documentation?: number | null
          estimated_maintenance?: number | null
          estimated_other_costs?: number | null
          expected_margin_percent?: number | null
          expected_sale_days?: number | null
          featured?: boolean | null
          fipe_price_at_purchase?: number | null
          fuel_type?: string
          id?: string
          images?: string[] | null
          km?: number
          mercadolibre_id?: string | null
          minimum_price?: number | null
          ml_item_id?: string | null
          ml_listing_type?: string | null
          ml_permalink?: string | null
          ml_published_at?: string | null
          ml_status?: string | null
          model: string
          notes?: string | null
          plate?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          purchase_source?: string | null
          renavam?: string | null
          sale_price?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          transmission?: string
          updated_at?: string
          version?: string | null
          year_fabrication: number
          year_model: number
          zip_code?: string | null
        }
        Update: {
          brand?: string
          chassis?: string | null
          city?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          doors?: number | null
          estimated_cleaning?: number | null
          estimated_documentation?: number | null
          estimated_maintenance?: number | null
          estimated_other_costs?: number | null
          expected_margin_percent?: number | null
          expected_sale_days?: number | null
          featured?: boolean | null
          fipe_price_at_purchase?: number | null
          fuel_type?: string
          id?: string
          images?: string[] | null
          km?: number
          mercadolibre_id?: string | null
          minimum_price?: number | null
          ml_item_id?: string | null
          ml_listing_type?: string | null
          ml_permalink?: string | null
          ml_published_at?: string | null
          ml_status?: string | null
          model?: string
          notes?: string | null
          plate?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          purchase_source?: string | null
          renavam?: string | null
          sale_price?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          transmission?: string
          updated_at?: string
          version?: string | null
          year_fabrication?: number
          year_model?: number
          zip_code?: string | null
        }
        Relationships: []
      }
      whatsapp_contacts: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          last_message_at: string | null
          lead_id: string | null
          name: string | null
          phone: string
          profile_pic_url: string | null
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          name?: string | null
          phone: string
          profile_pic_url?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          name?: string | null
          phone?: string
          profile_pic_url?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          api_key: string
          api_url: string
          created_at: string
          created_by: string | null
          id: string
          instance_name: string
          is_default: boolean | null
          is_shared: boolean | null
          name: string
          phone_number: string | null
          qr_code: string | null
          qr_code_expires_at: string | null
          signature_template: string | null
          status: string
          updated_at: string
          user_id: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key: string
          api_url: string
          created_at?: string
          created_by?: string | null
          id?: string
          instance_name: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name: string
          phone_number?: string | null
          qr_code?: string | null
          qr_code_expires_at?: string | null
          signature_template?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string
          api_url?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instance_name?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name?: string
          phone_number?: string | null
          qr_code?: string | null
          qr_code_expires_at?: string | null
          signature_template?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_instances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "salesperson_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          contact_id: string | null
          content: string | null
          created_at: string
          customer_id: string | null
          direction: string
          id: string
          instance_id: string | null
          lead_id: string | null
          media_mime_type: string | null
          media_url: string | null
          message_id: string | null
          message_type: string
          metadata: Json | null
          quoted_message_id: string | null
          remote_jid: string
          sent_by: string | null
          status: string | null
        }
        Insert: {
          contact_id?: string | null
          content?: string | null
          created_at?: string
          customer_id?: string | null
          direction: string
          id?: string
          instance_id?: string | null
          lead_id?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          quoted_message_id?: string | null
          remote_jid: string
          sent_by?: string | null
          status?: string | null
        }
        Update: {
          contact_id?: string | null
          content?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: string
          id?: string
          instance_id?: string | null
          lead_id?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          quoted_message_id?: string | null
          remote_jid?: string
          sent_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      sale_profit_report: {
        Row: {
          brand: string | null
          created_at: string | null
          customer_id: string | null
          days_in_stock: number | null
          documentation_cost: number | null
          gross_profit: number | null
          holding_cost: number | null
          id: string | null
          lead_cac: number | null
          lead_id: string | null
          model: string | null
          net_profit: number | null
          other_sale_costs: number | null
          plate: string | null
          sale_date: string | null
          sale_price: number | null
          salesperson_id: string | null
          status: Database["public"]["Enums"]["sale_status"] | null
          total_commissions: number | null
          total_sale_costs: number | null
          transfer_cost: number | null
          updated_at: string | null
          vehicle_id: string | null
          vehicle_purchase_price: number | null
          vehicle_total_costs: number | null
          vehicle_total_investment: number | null
          year_model: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      salesperson_ranking: {
        Row: {
          avg_profit_per_sale: number | null
          full_name: string | null
          revenue_this_month: number | null
          sales_this_month: number | null
          total_commissions: number | null
          total_profit: number | null
          total_revenue: number | null
          total_sales: number | null
          user_id: string | null
        }
        Relationships: []
      }
      vehicle_dre: {
        Row: {
          brand: string | null
          cost_aquisicao: number | null
          cost_comissao_compra: number | null
          cost_documentacao: number | null
          cost_frete: number | null
          cost_ipva: number | null
          cost_limpeza: number | null
          cost_manutencao: number | null
          cost_outros: number | null
          cost_transferencia: number | null
          created_at: string | null
          days_in_stock: number | null
          estimated_cleaning: number | null
          estimated_documentation: number | null
          estimated_maintenance: number | null
          estimated_other_costs: number | null
          expected_margin_percent: number | null
          expected_sale_days: number | null
          holding_cost: number | null
          id: string | null
          model: string | null
          plate: string | null
          purchase_date: string | null
          purchase_price: number | null
          sale_price: number | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          total_estimated_costs: number | null
          total_investment: number | null
          total_real_costs: number | null
          updated_at: string | null
          year_model: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      get_next_round_robin_salesperson: { Args: never; Returns: string }
      get_table_columns: {
        Args: { table_name: string }
        Returns: {
          column_name: string
          data_type: string
        }[]
      }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          module: string
          permissions: string[]
        }[]
      }
      has_permission: {
        Args: { _module: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_round_robin_counters: {
        Args: { p_salesperson_id: string }
        Returns: undefined
      }
      is_master_user: { Args: { _user_id: string }; Returns: boolean }
      log_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type: string
        }
        Returns: string
      }
      reset_daily_lead_counts: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "gerente" | "vendedor" | "marketing"
      commission_type:
        | "percentual_lucro"
        | "valor_fixo"
        | "escalonada"
        | "mista"
      lead_source:
        | "website"
        | "indicacao"
        | "facebook"
        | "instagram"
        | "google_ads"
        | "olx"
        | "webmotors"
        | "outros"
        | "whatsapp"
      lead_status:
        | "novo"
        | "contato_inicial"
        | "qualificado"
        | "proposta"
        | "negociacao"
        | "convertido"
        | "perdido"
      loss_reason_type:
        | "sem_entrada"
        | "sem_credito"
        | "curioso"
        | "caro"
        | "comprou_outro"
        | "desistiu"
        | "sem_contato"
        | "veiculo_vendido"
        | "outros"
      negotiation_status:
        | "em_andamento"
        | "proposta_enviada"
        | "negociando"
        | "ganho"
        | "perdido"
        | "pausado"
      payment_method:
        | "dinheiro"
        | "pix"
        | "cartao_credito"
        | "cartao_debito"
        | "financiamento"
        | "consorcio"
        | "permuta"
        | "misto"
      qualification_status: "nao_qualificado" | "qualificado" | "desqualificado"
      sale_status: "pendente" | "concluida" | "cancelada"
      vehicle_cost_type:
        | "aquisicao"
        | "documentacao"
        | "transferencia"
        | "ipva"
        | "manutencao"
        | "limpeza"
        | "frete"
        | "comissao_compra"
        | "outros"
      vehicle_status: "disponivel" | "reservado" | "vendido" | "em_manutencao"
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
      app_role: ["gerente", "vendedor", "marketing"],
      commission_type: [
        "percentual_lucro",
        "valor_fixo",
        "escalonada",
        "mista",
      ],
      lead_source: [
        "website",
        "indicacao",
        "facebook",
        "instagram",
        "google_ads",
        "olx",
        "webmotors",
        "outros",
        "whatsapp",
      ],
      lead_status: [
        "novo",
        "contato_inicial",
        "qualificado",
        "proposta",
        "negociacao",
        "convertido",
        "perdido",
      ],
      loss_reason_type: [
        "sem_entrada",
        "sem_credito",
        "curioso",
        "caro",
        "comprou_outro",
        "desistiu",
        "sem_contato",
        "veiculo_vendido",
        "outros",
      ],
      negotiation_status: [
        "em_andamento",
        "proposta_enviada",
        "negociando",
        "ganho",
        "perdido",
        "pausado",
      ],
      payment_method: [
        "dinheiro",
        "pix",
        "cartao_credito",
        "cartao_debito",
        "financiamento",
        "consorcio",
        "permuta",
        "misto",
      ],
      qualification_status: [
        "nao_qualificado",
        "qualificado",
        "desqualificado",
      ],
      sale_status: ["pendente", "concluida", "cancelada"],
      vehicle_cost_type: [
        "aquisicao",
        "documentacao",
        "transferencia",
        "ipva",
        "manutencao",
        "limpeza",
        "frete",
        "comissao_compra",
        "outros",
      ],
      vehicle_status: ["disponivel", "reservado", "vendido", "em_manutencao"],
    },
  },
} as const
