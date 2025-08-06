export interface Database {
  public: {
    Tables: {
      watchlist: {
        Row: {
          id: number
          type_id: string
          type_name: string
          created_at?: string
        }
        Insert: {
          id?: number
          type_id: string
          type_name: string
          created_at?: string
        }
        Update: {
          id?: number
          type_id?: string
          type_name?: string
          created_at?: string
        }
      }
    }
  }
}
