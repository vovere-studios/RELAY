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
      activities: {
        Row: {
          actor_id: string
          description: string
          id: string
          kind: string
          occurred_at: string
          organization_id: string
          supplier_id: string
          title: string
        }
        Insert: {
          actor_id?: string
          description?: string
          id?: string
          kind: string
          occurred_at?: string
          organization_id: string
          supplier_id: string
          title: string
        }
        Update: {
          actor_id?: string
          description?: string
          id?: string
          kind?: string
          occurred_at?: string
          organization_id?: string
          supplier_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_supplier_id_fkey"
            columns: ["organization_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      certificates: {
        Row: {
          document_id: string
          id: string
          issuer: string
          organization_id: string
          standard: string
          supplier_id: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          document_id: string
          id?: string
          issuer?: string
          organization_id: string
          standard: string
          supplier_id: string
          valid_from: string
          valid_until: string
        }
        Update: {
          document_id?: string
          id?: string
          issuer?: string
          organization_id?: string
          standard?: string
          supplier_id?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_organization_id_supplier_id_document_id_fkey"
            columns: ["organization_id", "supplier_id", "document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["organization_id", "supplier_id", "id"]
          },
        ]
      }
      company_directory: {
        Row: {
          country_code: string
          description: string
          display_name: string
          listed: boolean
          organization_id: string
          website: string
        }
        Insert: {
          country_code?: string
          description?: string
          display_name: string
          listed?: boolean
          organization_id: string
          website?: string
        }
        Update: {
          country_code?: string
          description?: string
          display_name?: string
          listed?: boolean
          organization_id?: string
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_directory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_requests: {
        Row: {
          due_at: string
          id: string
          organization_id: string
          relationship_id: string
          requested_at: string
          status: string
          title: string
        }
        Insert: {
          due_at: string
          id?: string
          organization_id: string
          relationship_id: string
          requested_at?: string
          status?: string
          title: string
        }
        Update: {
          due_at?: string
          id?: string
          organization_id?: string
          relationship_id?: string
          requested_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_requests_organization_id_relationship_id_fkey"
            columns: ["organization_id", "relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_health"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "data_requests_organization_id_relationship_id_fkey"
            columns: ["organization_id", "relationship_id"]
            isOneToOne: false
            referencedRelation: "supplier_relationships"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      document_shares: {
        Row: {
          document_id: string
          id: string
          recipient_organization_id: string
          revoked_at: string | null
          sender_organization_id: string
          shared_at: string
          shared_by: string
        }
        Insert: {
          document_id: string
          id?: string
          recipient_organization_id: string
          revoked_at?: string | null
          sender_organization_id: string
          shared_at?: string
          shared_by: string
        }
        Update: {
          document_id?: string
          id?: string
          recipient_organization_id?: string
          revoked_at?: string | null
          sender_organization_id?: string
          shared_at?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_recipient_organization_id_fkey"
            columns: ["recipient_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_sender_organization_id_fkey"
            columns: ["sender_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          id: string
          intake_link_id: string | null
          kind: string
          mime_type: string
          name: string
          organization_id: string
          storage_path: string
          submitted_by_email: string | null
          submitted_by_name: string | null
          supplier_id: string
          uploaded_at: string
          uploaded_by: string | null
          verification_status: string
        }
        Insert: {
          id?: string
          intake_link_id?: string | null
          kind: string
          mime_type: string
          name: string
          organization_id: string
          storage_path: string
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          supplier_id: string
          uploaded_at?: string
          uploaded_by?: string | null
          verification_status?: string
        }
        Update: {
          id?: string
          intake_link_id?: string | null
          kind?: string
          mime_type?: string
          name?: string
          organization_id?: string
          storage_path?: string
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          supplier_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_intake_link_id_fkey"
            columns: ["intake_link_id"]
            isOneToOne: false
            referencedRelation: "upload_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_supplier_id_fkey"
            columns: ["organization_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      intake_reservations: {
        Row: {
          created_at: string
          file_count: number
          id: string
          link_id: string
          status: string
        }
        Insert: {
          created_at?: string
          file_count: number
          id?: string
          link_id: string
          status?: string
        }
        Update: {
          created_at?: string
          file_count?: number
          id?: string
          link_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_reservations_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "upload_links"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id?: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country_code: string
          created_at: string
          id: string
          legal_name: string
          owner_id: string
          registration_number: string
          website: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          id?: string
          legal_name: string
          owner_id: string
          registration_number?: string
          website?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          legal_name?: string
          owner_id?: string
          registration_number?: string
          website?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          material: string
          name: string
          organization_id: string
          reference: string
          supplier_id: string
        }
        Insert: {
          id?: string
          material?: string
          name: string
          organization_id: string
          reference?: string
          supplier_id: string
        }
        Update: {
          id?: string
          material?: string
          name?: string
          organization_id?: string
          reference?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_supplier_id_fkey"
            columns: ["organization_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      request_requirements: {
        Row: {
          organization_id: string
          relationship_id: string
          request_id: string
          requirement_id: string
        }
        Insert: {
          organization_id: string
          relationship_id: string
          request_id: string
          requirement_id: string
        }
        Update: {
          organization_id?: string
          relationship_id?: string
          request_id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_requirements_organization_id_relationship_id_reque_fkey"
            columns: ["organization_id", "relationship_id", "request_id"]
            isOneToOne: false
            referencedRelation: "data_requests"
            referencedColumns: ["organization_id", "relationship_id", "id"]
          },
          {
            foreignKeyName: "request_requirements_organization_id_relationship_id_requi_fkey"
            columns: ["organization_id", "relationship_id", "requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["organization_id", "relationship_id", "id"]
          },
        ]
      }
      requirements: {
        Row: {
          document_id: string | null
          id: string
          kind: string
          name: string
          organization_id: string
          relationship_id: string
          status: string
        }
        Insert: {
          document_id?: string | null
          id?: string
          kind: string
          name: string
          organization_id: string
          relationship_id: string
          status?: string
        }
        Update: {
          document_id?: string | null
          id?: string
          kind?: string
          name?: string
          organization_id?: string
          relationship_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirements_organization_id_document_id_fkey"
            columns: ["organization_id", "document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_organization_id_relationship_id_fkey"
            columns: ["organization_id", "relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_health"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "requirements_organization_id_relationship_id_fkey"
            columns: ["organization_id", "relationship_id"]
            isOneToOne: false
            referencedRelation: "supplier_relationships"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      supplier_relationships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_relationships_organization_id_supplier_id_fkey"
            columns: ["organization_id", "supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: string
          city: string
          contact_email: string
          contact_name: string
          country: string
          country_code: string
          id: string
          legal_name: string
          organization_id: string
          registration_number: string
          source_organization_id: string | null
          updated_at: string
          verified_at: string | null
          website: string
        }
        Insert: {
          category?: string
          city?: string
          contact_email?: string
          contact_name?: string
          country?: string
          country_code?: string
          id?: string
          legal_name: string
          organization_id: string
          registration_number?: string
          source_organization_id?: string | null
          updated_at?: string
          verified_at?: string | null
          website?: string
        }
        Update: {
          category?: string
          city?: string
          contact_email?: string
          contact_name?: string
          country?: string
          country_code?: string
          id?: string
          legal_name?: string
          organization_id?: string
          registration_number?: string
          source_organization_id?: string | null
          updated_at?: string
          verified_at?: string | null
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_source_organization_id_fkey"
            columns: ["source_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_by: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          organization_id: string
          revoked_at: string | null
          role: string
          token_hash: string
        }
        Insert: {
          accepted_by?: string | null
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          id?: string
          organization_id: string
          revoked_at?: string | null
          role: string
          token_hash: string
        }
        Update: {
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string
          revoked_at?: string | null
          role?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          max_files: number
          organization_id: string
          request_id: string | null
          revoked_at: string | null
          supplier_id: string
          title: string
          token_hash: string
          uploads_used: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          max_files?: number
          organization_id: string
          request_id?: string | null
          revoked_at?: string | null
          supplier_id: string
          title: string
          token_hash: string
          uploads_used?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          max_files?: number
          organization_id?: string
          request_id?: string | null
          revoked_at?: string | null
          supplier_id?: string
          title?: string
          token_hash?: string
          uploads_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "upload_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_links_organization_id_request_id_fkey"
            columns: ["organization_id", "request_id"]
            isOneToOne: false
            referencedRelation: "data_requests"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "upload_links_organization_id_supplier_id_fkey"
            columns: ["organization_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      workspace_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: string
          id: string
          organization_id: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          organization_id: string
          title: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          organization_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          email_updates: boolean
          organization_id: string
        }
        Insert: {
          email_updates?: boolean
          organization_id: string
        }
        Update: {
          email_updates?: boolean
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      relationship_health: {
        Row: {
          completeness: number | null
          created_at: string | null
          id: string | null
          missing_requirements: number | null
          organization_id: string | null
          status: string | null
          supplier_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_relationships_organization_id_supplier_id_fkey"
            columns: ["organization_id", "supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
    }
    Functions: {
      relay_platform_admin: { Args: { action: string; payload?: Json }; Returns: Json }
      relay_workspace_snapshot: { Args: { payload?: Json }; Returns: Json }
      add_supplier_connection: {
        Args: {
          company_name: string
          country_iso: string
          country_name: string
          email?: string
          org_id: string
          supplier_category?: string
        }
        Returns: string
      }
      create_workspace: {
        Args: { company_name: string; full_name: string }
        Returns: string
      }
      prepare_information_request: {
        Args: { connection_id: string; due_date: string; request_title: string }
        Returns: string
      }
      relay_intake_api: {
        Args: { action: string; payload: Json }
        Returns: Json
      }
      relay_workspace_api: {
        Args: { action: string; payload?: Json }
        Returns: Json
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
    Enums: {},
  },
} as const
