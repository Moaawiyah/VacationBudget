/**
 * Hand-written mirror of the Supabase schema, shaped to match what
 * `supabase gen types typescript` actually outputs (Tables/Views/Functions/
 * Enums/CompositeTypes, and a `Relationships` array per table) — that shape
 * is required by @supabase/postgrest-js's GenericSchema constraint, and
 * matching it now means a real generated file can drop in later with no
 * changes elsewhere. Once a Supabase project is linked, regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > types/database.ts
 * Grows one table at a time, alongside the migration that creates it.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          surname: string | null;
          username: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string | null;
          surname?: string | null;
          username?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          surname?: string | null;
          username?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trip_members: {
        Row: {
          trip_id: string;
          user_id: string;
          invited_by: string;
          status: "pending" | "accepted";
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          trip_id: string;
          user_id: string;
          invited_by: string;
          status?: "pending" | "accepted";
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          status?: "pending" | "accepted";
          responded_at?: string | null;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          destination: string;
          start_date: string;
          end_date: string;
          base_currency: string;
          total_budget: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          destination: string;
          start_date: string;
          end_date: string;
          base_currency: string;
          total_budget: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          destination?: string;
          start_date?: string;
          end_date?: string;
          base_currency?: string;
          total_budget?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          icon: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          icon: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          icon?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          category_id: string;
          amount: string;
          currency: string;
          converted_amount: string;
          exchange_rate: string;
          description: string;
          expense_date: string;
          merchant: string | null;
          location: string | null;
          notes: string | null;
          client_request_id: string | null;
          paid_by: string;
          split_method: "equal" | "exact" | "percentage";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id: string;
          category_id: string;
          amount: number;
          currency: string;
          converted_amount: number;
          exchange_rate: number;
          description: string;
          expense_date: string;
          merchant?: string | null;
          location?: string | null;
          notes?: string | null;
          client_request_id?: string | null;
          paid_by?: string;
          split_method?: "equal" | "exact" | "percentage";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          user_id?: string;
          category_id?: string;
          amount?: number;
          currency?: string;
          converted_amount?: number;
          exchange_rate?: number;
          description?: string;
          expense_date?: string;
          merchant?: string | null;
          location?: string | null;
          notes?: string | null;
          client_request_id?: string | null;
          paid_by?: string;
          split_method?: "equal" | "exact" | "percentage";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_splits: {
        Row: {
          expense_id: string;
          user_id: string;
          share_amount: string;
          share_percent: string | null;
          created_at: string;
        };
        Insert: {
          expense_id: string;
          user_id: string;
          share_amount: number;
          share_percent?: number | null;
          created_at?: string;
        };
        Update: {
          expense_id?: string;
          user_id?: string;
          share_amount?: number;
          share_percent?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
        ];
      };
      settlements: {
        Row: {
          id: string;
          trip_id: string;
          from_user_id: string;
          to_user_id: string;
          amount: string;
          note: string | null;
          created_by: string;
          client_request_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          from_user_id: string;
          to_user_id: string;
          amount: number;
          note?: string | null;
          created_by: string;
          client_request_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          from_user_id?: string;
          to_user_id?: string;
          amount?: number;
          note?: string | null;
          created_by?: string;
          client_request_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "settlements_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      planned_budgets: {
        Row: {
          id: string;
          trip_id: string;
          category_id: string;
          planned_amount: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          category_id: string;
          planned_amount: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          category_id?: string;
          planned_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "planned_budgets_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planned_budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_expense: {
        Args: {
          p_trip_id: string;
          p_expense: Record<string, unknown>;
          p_splits: Record<string, unknown>[];
          p_request_id?: string | null;
        };
        Returns: string;
      };
      update_expense: {
        Args: {
          p_expense_id: string;
          p_expense: Record<string, unknown>;
          p_splits?: Record<string, unknown>[] | null;
        };
        Returns: undefined;
      };
      record_settlement: {
        Args: {
          p_trip_id: string;
          p_from_user_id: string;
          p_to_user_id: string;
          p_amount: number;
          p_note?: string | null;
          p_request_id?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
