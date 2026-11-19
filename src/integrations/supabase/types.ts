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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appearance_settings: {
        Row: {
          id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          id?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      cob_payers: {
        Row: {
          aktif: boolean
          created_at: string
          id: string
          jenis: string
          kontak: string
          nama: string
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          id?: string
          jenis?: string
          kontak?: string
          nama: string
        }
        Update: {
          aktif?: boolean
          created_at?: string
          id?: string
          jenis?: string
          kontak?: string
          nama?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          billing: number
          created_at: string
          created_by: string | null
          darah: number
          dpjp: string
          farmasi: number
          icd10: string
          id: string
          inacbgs: number
          jasa_dpjp: number
          jasa_du: number
          jasa_penunjang: number
          jenis_naik_kelas: string
          kelas_awal: string
          kelas_tujuan: string
          keterangan_naik_kelas: string
          konsul: number
          lab: number
          nama: string
          nama_penjamin_cob: string
          no_sep: string | null
          ops_lain: number
          pa: number
          penjamin_id: string | null
          radiologi: number
          rm: string
          tambahan_naik_kelas: number
          tanggal: string
          tanggal_masuk: string | null
          tanggal_pulang: string | null
          updated_at: string
        }
        Insert: {
          billing?: number
          created_at?: string
          created_by?: string | null
          darah?: number
          dpjp?: string
          farmasi?: number
          icd10?: string
          id?: string
          inacbgs?: number
          jasa_dpjp?: number
          jasa_du?: number
          jasa_penunjang?: number
          jenis_naik_kelas?: string
          kelas_awal?: string
          kelas_tujuan?: string
          keterangan_naik_kelas?: string
          konsul?: number
          lab?: number
          nama: string
          nama_penjamin_cob?: string
          no_sep?: string | null
          ops_lain?: number
          pa?: number
          penjamin_id?: string | null
          radiologi?: number
          rm?: string
          tambahan_naik_kelas?: number
          tanggal: string
          tanggal_masuk?: string | null
          tanggal_pulang?: string | null
          updated_at?: string
        }
        Update: {
          billing?: number
          created_at?: string
          created_by?: string | null
          darah?: number
          dpjp?: string
          farmasi?: number
          icd10?: string
          id?: string
          inacbgs?: number
          jasa_dpjp?: number
          jasa_du?: number
          jasa_penunjang?: number
          jenis_naik_kelas?: string
          kelas_awal?: string
          kelas_tujuan?: string
          keterangan_naik_kelas?: string
          konsul?: number
          lab?: number
          nama?: string
          nama_penjamin_cob?: string
          no_sep?: string | null
          ops_lain?: number
          pa?: number
          penjamin_id?: string | null
          radiologi?: number
          rm?: string
          tambahan_naik_kelas?: number
          tanggal?: string
          tanggal_masuk?: string | null
          tanggal_pulang?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_penjamin_id_fkey"
            columns: ["penjamin_id"]
            isOneToOne: false
            referencedRelation: "cob_payers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nama: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          nama?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          nama?: string
          username?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_billing: boolean
          can_export: boolean
          can_hapus: boolean
          can_ops: boolean
          can_sdm: boolean
          user_id: string
        }
        Insert: {
          can_billing?: boolean
          can_export?: boolean
          can_hapus?: boolean
          can_ops?: boolean
          can_sdm?: boolean
          user_id: string
        }
        Update: {
          can_billing?: boolean
          can_export?: boolean
          can_hapus?: boolean
          can_ops?: boolean
          can_sdm?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      can_write: { Args: { _user_id: string }; Returns: boolean }
      has_perm: { Args: { _perm: string; _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "inputer" | "viewer"
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
      app_role: ["admin", "inputer", "viewer"],
    },
  },
} as const
