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
      cash_movements: {
        Row: {
          amount: number
          category: string
          contract_id: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          description: string | null
          id: string
          kind: string
          movement_date: string
          receipt_id: string | null
          source: string
        }
        Insert: {
          amount: number
          category: string
          contract_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          id?: string
          kind: string
          movement_date?: string
          receipt_id?: string | null
          source?: string
        }
        Update: {
          amount?: number
          category?: string
          contract_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          id?: string
          kind?: string
          movement_date?: string
          receipt_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: true
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          admin_reply: string | null
          ai_draft_reply: string | null
          ai_priority: string | null
          ai_summary: string | null
          contract_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          status: string
          title: string
        }
        Insert: {
          admin_reply?: string | null
          ai_draft_reply?: string | null
          ai_priority?: string | null
          ai_summary?: string | null
          contract_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          status?: string
          title: string
        }
        Update: {
          admin_reply?: string | null
          ai_draft_reply?: string | null
          ai_priority?: string | null
          ai_summary?: string | null
          contract_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_adjustments: {
        Row: {
          applied_on: string
          contract_id: string
          created_at: string
          id: string
          index_type: Database["public"]["Enums"]["adjustment_index"]
          new_rent: number
          percentage: number
          previous_rent: number
        }
        Insert: {
          applied_on?: string
          contract_id: string
          created_at?: string
          id?: string
          index_type: Database["public"]["Enums"]["adjustment_index"]
          new_rent: number
          percentage: number
          previous_rent: number
        }
        Update: {
          applied_on?: string
          contract_id?: string
          created_at?: string
          id?: string
          index_type?: Database["public"]["Enums"]["adjustment_index"]
          new_rent?: number
          percentage?: number
          previous_rent?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_adjustments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          adjustment_frequency_months: number
          adjustment_index: Database["public"]["Enums"]["adjustment_index"]
          base_rent: number
          commission_type: Database["public"]["Enums"]["commission_kind"]
          commission_value: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          current_rent: number
          due_day: number
          end_date: string
          fees_amount: number | null
          fees_installments: number | null
          fees_paid: boolean
          id: string
          next_adjustment_date: string | null
          notes: string | null
          property_id: string
          start_date: string
          status: string
          tenant_id: string
        }
        Insert: {
          adjustment_frequency_months?: number
          adjustment_index?: Database["public"]["Enums"]["adjustment_index"]
          base_rent: number
          commission_type?: Database["public"]["Enums"]["commission_kind"]
          commission_value?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          current_rent: number
          due_day?: number
          end_date: string
          fees_amount?: number | null
          fees_installments?: number | null
          fees_paid?: boolean
          id?: string
          next_adjustment_date?: string | null
          notes?: string | null
          property_id: string
          start_date: string
          status?: string
          tenant_id: string
        }
        Update: {
          adjustment_frequency_months?: number
          adjustment_index?: Database["public"]["Enums"]["adjustment_index"]
          base_rent?: number
          commission_type?: Database["public"]["Enums"]["commission_kind"]
          commission_value?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          current_rent?: number
          due_day?: number
          end_date?: string
          fees_amount?: number | null
          fees_installments?: number | null
          fees_paid?: boolean
          id?: string
          next_adjustment_date?: string | null
          notes?: string | null
          property_id?: string
          start_date?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      index_values: {
        Row: {
          applied_count: number
          created_at: string
          id: string
          index_type: Database["public"]["Enums"]["adjustment_index"]
          percentage: number
          period: string
        }
        Insert: {
          applied_count?: number
          created_at?: string
          id?: string
          index_type: Database["public"]["Enums"]["adjustment_index"]
          percentage: number
          period: string
        }
        Update: {
          applied_count?: number
          created_at?: string
          id?: string
          index_type?: Database["public"]["Enums"]["adjustment_index"]
          percentage?: number
          period?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          file_path: string
          id: string
          receipt_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          receipt_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          receipt_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          address: string | null
          bank_account: string | null
          cbu: string | null
          created_at: string
          cuit: string | null
          dni: string | null
          dni_cuit: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          cbu?: string | null
          created_at?: string
          cuit?: string | null
          dni?: string | null
          dni_cuit?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          cbu?: string | null
          created_at?: string
          cuit?: string | null
          dni?: string | null
          dni_cuit?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          ai_amount: number | null
          ai_currency: string | null
          ai_date: string | null
          ai_method: string | null
          ai_notes: string | null
          ai_status: string
          created_at: string
          file_path: string
          file_type: string | null
          id: string
          receipt_id: string
          review_note: string | null
          status: string
          uploaded_by: string | null
        }
        Insert: {
          ai_amount?: number | null
          ai_currency?: string | null
          ai_date?: string | null
          ai_method?: string | null
          ai_notes?: string | null
          ai_status?: string
          created_at?: string
          file_path: string
          file_type?: string | null
          id?: string
          receipt_id: string
          review_note?: string | null
          status?: string
          uploaded_by?: string | null
        }
        Update: {
          ai_amount?: number | null
          ai_currency?: string | null
          ai_date?: string | null
          ai_method?: string | null
          ai_notes?: string | null
          ai_status?: string
          created_at?: string
          file_path?: string
          file_type?: string | null
          id?: string
          receipt_id?: string
          review_note?: string | null
          status?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          cadastral_code: string | null
          city: string | null
          created_at: string
          description: string | null
          floor_unit: string | null
          id: string
          owner_id: string
          property_type: string
          property_value: number | null
          street_number: string | null
          value_currency: Database["public"]["Enums"]["currency_code"]
        }
        Insert: {
          address: string
          cadastral_code?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          floor_unit?: string | null
          id?: string
          owner_id: string
          property_type?: string
          property_value?: number | null
          street_number?: string | null
          value_currency?: Database["public"]["Enums"]["currency_code"]
        }
        Update: {
          address?: string
          cadastral_code?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          floor_unit?: string | null
          id?: string
          owner_id?: string
          property_type?: string
          property_value?: number | null
          street_number?: string | null
          value_currency?: Database["public"]["Enums"]["currency_code"]
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          commission_amount: number
          contract_id: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          due_date: string
          extra_amount: number
          extra_detail: string | null
          id: string
          paid_at: string | null
          period: string
          rent_amount: number
          status: string
        }
        Insert: {
          commission_amount?: number
          contract_id: string
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          due_date: string
          extra_amount?: number
          extra_detail?: string | null
          id?: string
          paid_at?: string | null
          period: string
          rent_amount: number
          status?: string
        }
        Update: {
          commission_amount?: number
          contract_id?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          due_date?: string
          extra_amount?: number
          extra_detail?: string | null
          id?: string
          paid_at?: string | null
          period?: string
          rent_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          created_at: string
          cuit: string | null
          dni: string | null
          dni_cuit: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          cuit?: string | null
          dni?: string | null
          dni_cuit?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          cuit?: string | null
          dni?: string | null
          dni_cuit?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      adjust_contract_manual: {
        Args: { _contract: string; _pct: number }
        Returns: number
      }
      apply_index: {
        Args: {
          _index: Database["public"]["Enums"]["adjustment_index"]
          _pct: number
          _period: string
        }
        Returns: number
      }
      calc_commission: {
        Args: {
          _rent: number
          _type: Database["public"]["Enums"]["commission_kind"]
          _value: number
        }
        Returns: number
      }
      can_read_document: { Args: { _name: string }; Returns: boolean }
      generate_receipts: { Args: { _period: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_contract_owner: { Args: { _contract: string }; Returns: boolean }
      is_contract_tenant: { Args: { _contract: string }; Returns: boolean }
      receipt_contract: { Args: { _receipt: string }; Returns: string }
      review_payment: {
        Args: { _approve: boolean; _note?: string; _proof: string }
        Returns: undefined
      }
    }
    Enums: {
      adjustment_index: "IPC" | "IPC_NEUQUEN" | "ICL" | "ACUERDO"
      app_role: "admin" | "owner" | "tenant"
      commission_kind: "percent" | "fixed"
      currency_code: "ARS" | "USD"
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
      adjustment_index: ["IPC", "IPC_NEUQUEN", "ICL", "ACUERDO"],
      app_role: ["admin", "owner", "tenant"],
      commission_kind: ["percent", "fixed"],
      currency_code: ["ARS", "USD"],
    },
  },
} as const
