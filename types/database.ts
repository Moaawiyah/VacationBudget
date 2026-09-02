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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
