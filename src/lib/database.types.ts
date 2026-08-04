export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: string
          credits: number
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          role?: string
          credits?: number
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: string
          credits?: number
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'credit_purchase' | 'inference_cost'
          package_name: string | null
          amount_bs: number | null
          reference_number: string | null
          proof_image_url: string | null
          credits_granted: number
          status: 'pending' | 'validated' | 'manual_review'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'credit_purchase' | 'inference_cost'
          package_name?: string | null
          amount_bs?: number | null
          reference_number?: string | null
          proof_image_url?: string | null
          credits_granted: number
          status?: 'pending' | 'validated' | 'manual_review'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'credit_purchase' | 'inference_cost'
          package_name?: string | null
          amount_bs?: number | null
          reference_number?: string | null
          proof_image_url?: string | null
          credits_granted?: number
          status?: 'pending' | 'validated' | 'manual_review'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
