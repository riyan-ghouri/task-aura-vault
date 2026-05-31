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
      admin_wallets: {
        Row: {
          address: string | null
          encrypted_private_key: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          encrypted_private_key?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          encrypted_private_key?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      banned_devices: {
        Row: {
          banned_by: string | null
          created_at: string
          device_fp_hash: string
          reason: string | null
        }
        Insert: {
          banned_by?: string | null
          created_at?: string
          device_fp_hash: string
          reason?: string | null
        }
        Update: {
          banned_by?: string | null
          created_at?: string
          device_fp_hash?: string
          reason?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          created_at: string
          display_name: string | null
          email: string | null
          first_auto_withdrawal_done: boolean
          first_name: string | null
          gender: string | null
          id: string
          is_banned: boolean
          last_name: string | null
          occupation: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          verification_bonus_credited: boolean
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_auto_withdrawal_done?: boolean
          first_name?: string | null
          gender?: string | null
          id: string
          is_banned?: boolean
          last_name?: string | null
          occupation?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          verification_bonus_credited?: boolean
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_auto_withdrawal_done?: boolean
          first_name?: string | null
          gender?: string | null
          id?: string
          is_banned?: boolean
          last_name?: string | null
          occupation?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          verification_bonus_credited?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
          reward_cusd: number
        }
        Insert: {
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
          reward_cusd?: number
        }
        Update: {
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
          reward_cusd?: number
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_otps: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          last_sent_at: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          last_sent_at?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          last_sent_at?: string
        }
        Relationships: []
      }
      submission_hashes: {
        Row: {
          created_at: string
          id: string
          phash: number | null
          sha256: string
          submission_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phash?: number | null
          sha256: string
          submission_id: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phash?: number | null
          sha256?: string
          submission_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      task_submissions: {
        Row: {
          auto_decision: string | null
          client_meta: Json
          created_at: string
          fraud_reasons: Json
          fraud_score: number | null
          id: string
          image_bytes: number | null
          image_height: number | null
          image_mime: string | null
          image_phash: number | null
          image_sha256: string | null
          image_width: number | null
          ocr_matched_keywords: string[]
          ocr_missing_keywords: string[]
          ocr_text: string | null
          proof_screenshot_path: string | null
          proof_text: string | null
          reviewed_at: string | null
          reviewer_notes: string | null
          reward_cusd: number
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_decision?: string | null
          client_meta?: Json
          created_at?: string
          fraud_reasons?: Json
          fraud_score?: number | null
          id?: string
          image_bytes?: number | null
          image_height?: number | null
          image_mime?: string | null
          image_phash?: number | null
          image_sha256?: string | null
          image_width?: number | null
          ocr_matched_keywords?: string[]
          ocr_missing_keywords?: string[]
          ocr_text?: string | null
          proof_screenshot_path?: string | null
          proof_text?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          reward_cusd?: number
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_decision?: string | null
          client_meta?: Json
          created_at?: string
          fraud_reasons?: Json
          fraud_score?: number | null
          id?: string
          image_bytes?: number | null
          image_height?: number | null
          image_mime?: string | null
          image_phash?: number | null
          image_sha256?: string | null
          image_width?: number | null
          ocr_matched_keywords?: string[]
          ocr_missing_keywords?: string[]
          ocr_text?: string | null
          proof_screenshot_path?: string | null
          proof_text?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          reward_cusd?: number
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          action: string
          cooldown_hours: number
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          min_image_height: number
          min_image_width: number
          platform: Database["public"]["Enums"]["task_platform"]
          proof_instructions: string | null
          proof_type: Database["public"]["Enums"]["task_proof_type"]
          required_keywords: string[]
          reward_cusd: number
          target_url: string
          title: string
          updated_at: string
          verification_code: string | null
        }
        Insert: {
          action: string
          cooldown_hours?: number
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_image_height?: number
          min_image_width?: number
          platform: Database["public"]["Enums"]["task_platform"]
          proof_instructions?: string | null
          proof_type?: Database["public"]["Enums"]["task_proof_type"]
          required_keywords?: string[]
          reward_cusd: number
          target_url: string
          title: string
          updated_at?: string
          verification_code?: string | null
        }
        Update: {
          action?: string
          cooldown_hours?: number
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_image_height?: number
          min_image_width?: number
          platform?: Database["public"]["Enums"]["task_platform"]
          proof_instructions?: string | null
          proof_type?: Database["public"]["Enums"]["task_proof_type"]
          required_keywords?: string[]
          reward_cusd?: number
          target_url?: string
          title?: string
          updated_at?: string
          verification_code?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      verifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_checked_at: string | null
          provider: string
          raw: Json | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          user_id: string
          verified_at: string | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_checked_at?: string | null
          provider?: string
          raw?: Json | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id: string
          verified_at?: string | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_checked_at?: string | null
          provider?: string
          raw?: Json | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          address: string | null
          created_at: string
          encrypted_private_key: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          encrypted_private_key?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          encrypted_private_key?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_notes: string | null
          amount_cusd: number
          created_at: string
          error: string | null
          id: string
          is_auto: boolean
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash: string | null
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cusd: number
          created_at?: string
          error?: string | null
          id?: string
          is_auto?: boolean
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          admin_notes?: string | null
          amount_cusd?: number
          created_at?: string
          error?: string | null
          id?: string
          is_auto?: boolean
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      effective_verification_status: {
        Args: {
          _expires_at: string
          _status: Database["public"]["Enums"]["verification_status"]
        }
        Returns: Database["public"]["Enums"]["verification_status"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "moderator" | "admin" | "super_admin"
      submission_status: "pending" | "approved" | "rejected"
      task_platform: "instagram" | "tiktok" | "facebook" | "youtube" | "website"
      task_proof_type: "screenshot" | "link" | "auto"
      verification_status: "pending" | "verified" | "rejected" | "expired"
      withdrawal_status: "pending" | "approved" | "rejected" | "completed"
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
      app_role: ["user", "moderator", "admin", "super_admin"],
      submission_status: ["pending", "approved", "rejected"],
      task_platform: ["instagram", "tiktok", "facebook", "youtube", "website"],
      task_proof_type: ["screenshot", "link", "auto"],
      verification_status: ["pending", "verified", "rejected", "expired"],
      withdrawal_status: ["pending", "approved", "rejected", "completed"],
    },
  },
} as const
