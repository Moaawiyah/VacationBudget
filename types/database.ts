/**
 * Hand-written mirror of the Supabase schema. Once a real Supabase project
 * exists, this can be regenerated with:
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
      };
    };
  };
};
