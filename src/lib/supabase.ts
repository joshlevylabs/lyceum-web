import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Use hardcoded values temporarily to test if the issue is with environment loading
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTU0MTYsImV4cCI6MjA2ODQ3MTQxNn0.5Wzzoat1TsoLLbsqjuoUEKyawJgYmvrMYbJ-uvosdu0'

console.log('Supabase config:', { 
  url: supabaseUrl, 
  hasAnonKey: !!supabaseAnonKey,
  anonKeyPreview: supabaseAnonKey?.substring(0, 20) + '...'
})

// Create singleton client
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// Alias functions that return the same singleton client
export const createClientComponentClient = () => supabase
export const createClient = () => supabase

// Database types
export interface User {
  id: string
  email: string
  username: string
  full_name: string
  avatar_url?: string
  company?: string
  role: 'admin' | 'engineer' | 'analyst' | 'viewer'
  created_at: string
  updated_at: string
  last_sign_in?: string
  is_active: boolean
}

export interface AnalyticsSession {
  id: string
  user_id: string
  name: string
  description?: string
  session_type: 'exploratory' | 'monitoring' | 'comparison' | 'collaborative'
  status: 'active' | 'paused' | 'archived' | 'error'
  config: {
    auto_refresh: boolean
    refresh_interval: number
    allow_collaboration: boolean
    is_public: boolean
    max_collaborators: number
    data_retention_days: number
  }
  data_bindings: any
  analytics_state: any
  collaboration: any
  metrics: any
  created_at: string
  updated_at: string
  last_accessed?: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  project_key: string
  groups: string[]
  tags: string[]
  data_types: string[]
  test_configurations: Record<string, any>
  measurement_count: number
  flagged_count: number
  created_at: string
  updated_at: string
  is_public: boolean
}

export interface MeasurementData {
  id: string
  project_id: string
  session_id?: string
  measurement_id: string
  name: string
  data: any
  metadata: Record<string, any>
  flags: string[]
  created_at: string
} 