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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      connected_accounts: {
        Row: {
          access_token_ciphertext: string | null
          account_type: string
          connected_at: string
          created_at: string
          email_address: string | null
          id: string
          is_active: boolean
          last_synced: string | null
          refresh_token_ciphertext: string | null
          scope: string | null
          token_iv: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_ciphertext?: string | null
          account_type: string
          connected_at?: string
          created_at?: string
          email_address?: string | null
          id?: string
          is_active?: boolean
          last_synced?: string | null
          refresh_token_ciphertext?: string | null
          scope?: string | null
          token_iv?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_ciphertext?: string | null
          account_type?: string
          connected_at?: string
          created_at?: string
          email_address?: string | null
          id?: string
          is_active?: boolean
          last_synced?: string | null
          refresh_token_ciphertext?: string | null
          scope?: string | null
          token_iv?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          ai_event_suggestions: boolean
          conflict_warnings: boolean
          created_at: string
          draft_replies: boolean
          event_reminders: boolean
          id: string
          key_contact_alerts: boolean
          morning_schedule_briefing: boolean
          summarize_emails_daily: boolean
          updated_at: string
          urgent_email_alerts: boolean
          user_id: string
        }
        Insert: {
          ai_event_suggestions?: boolean
          conflict_warnings?: boolean
          created_at?: string
          draft_replies?: boolean
          event_reminders?: boolean
          id?: string
          key_contact_alerts?: boolean
          morning_schedule_briefing?: boolean
          summarize_emails_daily?: boolean
          updated_at?: string
          urgent_email_alerts?: boolean
          user_id: string
        }
        Update: {
          ai_event_suggestions?: boolean
          conflict_warnings?: boolean
          created_at?: string
          draft_replies?: boolean
          event_reminders?: boolean
          id?: string
          key_contact_alerts?: boolean
          morning_schedule_briefing?: boolean
          summarize_emails_daily?: boolean
          updated_at?: string
          urgent_email_alerts?: boolean
          user_id?: string
        }
        Relationships: []
      }
      oauth_connection_states: {
        Row: {
          account_type: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          redirect_url: string
          state_hash: string
          user_id: string
        }
        Insert: {
          account_type: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          redirect_url: string
          state_hash: string
          user_id: string
        }
        Update: {
          account_type?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          redirect_url?: string
          state_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_pending_tokens: {
        Row: {
          access_token_ciphertext: string
          created_at: string
          email_address: string | null
          refresh_token_ciphertext: string | null
          scope: string
          state_hash: string
          token_iv: string
        }
        Insert: {
          access_token_ciphertext: string
          created_at?: string
          email_address?: string | null
          refresh_token_ciphertext?: string | null
          scope: string
          state_hash: string
          token_iv: string
        }
        Update: {
          access_token_ciphertext?: string
          created_at?: string
          email_address?: string | null
          refresh_token_ciphertext?: string | null
          scope?: string
          state_hash?: string
          token_iv?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          communication_style: string | null
          connections_skipped_at: string | null
          created_at: string
          display_name: string | null
          focus_areas: string[] | null
          id: string
          onboarded_at: string | null
          preferred_name: string | null
          sleep_time: string | null
          timezone: string | null
          tone_preference: string | null
          top_goals: string | null
          updated_at: string
          values_notes: string | null
          wake_time: string | null
          work_hours: string | null
          work_role: string | null
        }
        Insert: {
          communication_style?: string | null
          connections_skipped_at?: string | null
          created_at?: string
          display_name?: string | null
          focus_areas?: string[] | null
          id: string
          onboarded_at?: string | null
          preferred_name?: string | null
          sleep_time?: string | null
          timezone?: string | null
          tone_preference?: string | null
          top_goals?: string | null
          updated_at?: string
          values_notes?: string | null
          wake_time?: string | null
          work_hours?: string | null
          work_role?: string | null
        }
        Update: {
          communication_style?: string | null
          connections_skipped_at?: string | null
          created_at?: string
          display_name?: string | null
          focus_areas?: string[] | null
          id?: string
          onboarded_at?: string | null
          preferred_name?: string | null
          sleep_time?: string | null
          timezone?: string | null
          tone_preference?: string | null
          top_goals?: string | null
          updated_at?: string
          values_notes?: string | null
          wake_time?: string | null
          work_hours?: string | null
          work_role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
