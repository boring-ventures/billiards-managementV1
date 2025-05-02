export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          updated_at?: string;
          created_at?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string;
          user_id: string;
          company_id?: string;
          role?: string;
        };
        Insert: {
          id?: string;
          updated_at?: string;
          created_at?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string;
          user_id: string;
          company_id?: string;
          role?: string;
        };
        Update: {
          id?: string;
          updated_at?: string;
          created_at?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string;
          user_id?: string;
          company_id?: string;
          role?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          created_at?: string;
          name: string;
          owner_id: string;
          billing_email?: string;
          billing_status?: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          owner_id: string;
          billing_email?: string;
          billing_status?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          owner_id?: string;
          billing_email?: string;
          billing_status?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}; 