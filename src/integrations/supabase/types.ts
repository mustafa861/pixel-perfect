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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          agent: string | null
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          agent?: string | null
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          agent?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      code_submissions: {
        Row: {
          code: string
          created_at: string
          error_type: string | null
          id: string
          quality_score: number | null
          stderr: string
          stdout: string
          success: boolean
          topic_id: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          error_type?: string | null
          id?: string
          quality_score?: number | null
          stderr?: string
          stdout?: string
          success?: boolean
          topic_id?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          error_type?: string | null
          id?: string
          quality_score?: number | null
          stderr?: string
          stdout?: string
          success?: boolean
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_submissions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_attempts: {
        Row: {
          code: string
          created_at: string
          exercise_id: string
          feedback: string
          id: string
          passed: boolean
          score: number
          user_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          exercise_id: string
          feedback?: string
          id?: string
          passed?: boolean
          score?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          exercise_id?: string
          feedback?: string
          id?: string
          passed?: boolean
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          difficulty: string
          id: string
          prompt: string
          solution_hint: string
          starter_code: string
          title: string
          topic_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: string
          id?: string
          prompt: string
          solution_hint?: string
          starter_code?: string
          title: string
          topic_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: string
          id?: string
          prompt?: string
          solution_hint?: string
          starter_code?: string
          title?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery_scores: {
        Row: {
          consistency_pct: number
          exercise_pct: number
          id: string
          mastery: number
          quality_pct: number
          quiz_pct: number
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consistency_pct?: number
          exercise_pct?: number
          id?: string
          mastery?: number
          quality_pct?: number
          quiz_pct?: number
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consistency_pct?: number
          exercise_pct?: number
          id?: string
          mastery?: number
          quality_pct?: number
          quiz_pct?: number
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_scores_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          description: string
          id: string
          order_index: number
          slug: string
          title: string
        }
        Insert: {
          description?: string
          id?: string
          order_index: number
          slug: string
          title: string
        }
        Update: {
          description?: string
          id?: string
          order_index?: number
          slug?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          last_active_date: string | null
          streak_days: number
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          last_active_date?: string | null
          streak_days?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          last_active_date?: string | null
          streak_days?: number
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          correct_count: number
          created_at: string
          id: string
          questions: Json
          score: number
          topic_id: string | null
          total_count: number
          user_id: string
        }
        Insert: {
          answers?: Json
          correct_count?: number
          created_at?: string
          id?: string
          questions?: Json
          score?: number
          topic_id?: string | null
          total_count?: number
          user_id: string
        }
        Update: {
          answers?: Json
          correct_count?: number
          created_at?: string
          id?: string
          questions?: Json
          score?: number
          topic_id?: string | null
          total_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      struggle_alerts: {
        Row: {
          created_at: string
          detail: string
          id: string
          resolved: boolean
          student_id: string
          topic_id: string | null
          trigger: string
        }
        Insert: {
          created_at?: string
          detail?: string
          id?: string
          resolved?: boolean
          student_id: string
          topic_id?: string | null
          trigger: string
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          resolved?: boolean
          student_id?: string
          topic_id?: string | null
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "struggle_alerts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          id: string
          module_id: string
          order_index: number
          slug: string
          summary: string
          title: string
        }
        Insert: {
          id?: string
          module_id: string
          order_index: number
          slug: string
          summary?: string
          title: string
        }
        Update: {
          id?: string
          module_id?: string
          order_index?: number
          slug?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
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
      app_role: ["student", "teacher", "admin"],
    },
  },
} as const
