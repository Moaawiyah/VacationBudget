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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
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
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
