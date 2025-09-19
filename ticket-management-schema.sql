-- Ticket Management System Schema for Centcom-Lyceum Integration
-- This creates all necessary tables and configurations for user ticket submission and admin management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Support Tickets Table
-- Main table for storing all tickets submitted from Centcom
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Unique ticket identifiers
  ticket_key TEXT UNIQUE NOT NULL, -- e.g., "FR-1", "BUG-1"
  ticket_number INTEGER NOT NULL, -- Sequential number within ticket type
  
  -- User information
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL, -- Store username even if user is deleted
  email TEXT NOT NULL, -- Store email for communication
  
  -- Ticket classification
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('bug', 'feature_request', 'improvement', 'support', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('critical', 'major', 'minor', 'cosmetic')),
  
  -- Application context
  application_section TEXT NOT NULL DEFAULT 'main_application',
  plugin_name TEXT, -- Specific plugin if applicable
  centcom_version TEXT, -- Version of Centcom when ticket was submitted
  
  -- Ticket content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT, -- For bug reports
  expected_behavior TEXT, -- For bug reports
  actual_behavior TEXT, -- For bug reports
  
  -- Status management
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_user', 'resolved', 'closed', 'duplicate', 'wont_fix')),
  resolution TEXT, -- How the ticket was resolved
  
  -- Assignment and tracking
  assigned_to_admin_id UUID REFERENCES public.user_profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional metadata
  tags TEXT[] DEFAULT '{}', -- Searchable tags
  environment_info JSONB DEFAULT '{}', -- System info, browser, OS, etc.
  reproduction_rate TEXT CHECK (reproduction_rate IN ('always', 'sometimes', 'rarely', 'once')),
  
  -- Customer satisfaction
  user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating >= 1 AND user_satisfaction_rating <= 5),
  user_satisfaction_feedback TEXT,
  
  -- Internal tracking
  internal_notes TEXT, -- Private admin notes
  estimated_effort_hours INTEGER,
  actual_effort_hours INTEGER
);

-- 2. Ticket Comments Table
-- For communication between users and admins
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  
  -- Comment author
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL, -- Store name even if user is deleted
  author_type TEXT NOT NULL CHECK (author_type IN ('user', 'admin', 'system')),
  
  -- Comment content
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Internal admin-only comments
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  edited_by UUID REFERENCES auth.users(id),
  edit_reason TEXT
);

-- 3. Ticket Attachments Table
-- For storing files, screenshots, videos
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.ticket_comments(id) ON DELETE CASCADE, -- Optional: attach to specific comment
  
  -- File information
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- in bytes
  mime_type TEXT NOT NULL,
  file_extension TEXT NOT NULL,
  
  -- Storage information
  storage_path TEXT NOT NULL, -- Path in storage system
  storage_bucket TEXT NOT NULL DEFAULT 'ticket-attachments',
  
  -- Upload metadata
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- File categorization
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('screenshot', 'video', 'log_file', 'document', 'other')),
  description TEXT, -- Optional description of the attachment
  
  -- Security and validation
  scan_status TEXT DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'suspicious', 'blocked')),
  is_public BOOLEAN DEFAULT false -- Whether attachment is visible to ticket submitter
);

-- 4. Ticket Status History Table
-- Track all status changes for audit trail
CREATE TABLE IF NOT EXISTS public.ticket_status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  
  -- Status change information
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason TEXT,
  
  -- Additional field changes
  field_changes JSONB DEFAULT '{}', -- Track other field changes in same update
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Ticket Categories Table
-- Configurable categories for organizing tickets
CREATE TABLE IF NOT EXISTS public.ticket_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280', -- Hex color for UI
  icon TEXT DEFAULT 'ticket', -- Icon identifier
  
  -- Category configuration
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_key ON public.support_tickets(ticket_key);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_type ON public.support_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to_admin_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_author_id ON public.ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON public.ticket_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_uploaded_by ON public.ticket_attachments(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_ticket_status_history_ticket_id ON public.ticket_status_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status_history_created_at ON public.ticket_status_history(created_at);

-- Function to generate unique ticket keys
CREATE OR REPLACE FUNCTION generate_ticket_key(ticket_type_param TEXT)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    next_number INTEGER;
    new_key TEXT;
BEGIN
    -- Set prefix based on ticket type
    prefix := CASE ticket_type_param
        WHEN 'feature_request' THEN 'FR'
        WHEN 'bug' THEN 'BUG'
        WHEN 'improvement' THEN 'IMP'
        WHEN 'support' THEN 'SUP'
        ELSE 'TIC'
    END;
    
    -- Get next number for this ticket type
    SELECT COALESCE(MAX(ticket_number), 0) + 1
    INTO next_number
    FROM public.support_tickets
    WHERE ticket_type = ticket_type_param;
    
    -- Generate the key
    new_key := prefix || '-' || next_number;
    
    RETURN new_key;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate ticket key and update timestamps
CREATE OR REPLACE FUNCTION handle_ticket_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate ticket key if not provided
    IF NEW.ticket_key IS NULL THEN
        NEW.ticket_key := generate_ticket_key(NEW.ticket_type);
    END IF;
    
    -- Set ticket number from ticket key
    NEW.ticket_number := CAST(SPLIT_PART(NEW.ticket_key, '-', 2) AS INTEGER);
    
    -- Set updated_at
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to track status changes and update timestamps
CREATE OR REPLACE FUNCTION handle_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update timestamp
    NEW.updated_at := NOW();
    
    -- Set resolved_at when status changes to resolved
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolved_at := NOW();
    END IF;
    
    -- Set closed_at when status changes to closed
    IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
        NEW.closed_at := NOW();
    END IF;
    
    -- Log status change if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.ticket_status_history (
            ticket_id, 
            old_status, 
            new_status,
            changed_by,
            change_reason,
            field_changes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NULL, -- Will be set by application when user context is available
            'Status updated',
            jsonb_build_object(
                'priority', CASE WHEN OLD.priority IS DISTINCT FROM NEW.priority THEN jsonb_build_object('old', OLD.priority, 'new', NEW.priority) ELSE NULL END,
                'assigned_to_admin_id', CASE WHEN OLD.assigned_to_admin_id IS DISTINCT FROM NEW.assigned_to_admin_id THEN jsonb_build_object('old', OLD.assigned_to_admin_id, 'new', NEW.assigned_to_admin_id) ELSE NULL END
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER ticket_creation_trigger
    BEFORE INSERT ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION handle_ticket_creation();

CREATE TRIGGER ticket_status_change_trigger
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION handle_ticket_status_change();

-- Enable Row Level Security
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Support Tickets: Users can view their own tickets, admins can view all
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users can view their own tickets" ON public.support_tickets
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Users can create their own tickets" ON public.support_tickets;
CREATE POLICY "Users can create their own tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin users can manage all tickets" ON public.support_tickets;
CREATE POLICY "Admin users can manage all tickets" ON public.support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- Ticket Comments: Users can view comments on their tickets, admins can view all non-internal
DROP POLICY IF EXISTS "Users can view comments on their tickets" ON public.ticket_comments;
CREATE POLICY "Users can view comments on their tickets" ON public.ticket_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id 
      AND st.user_id = auth.uid()
      AND is_internal = false
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Users can comment on their tickets" ON public.ticket_comments;
CREATE POLICY "Users can comment on their tickets" ON public.ticket_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id 
      AND st.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- Ticket Attachments: Follow same pattern as comments
DROP POLICY IF EXISTS "Users can view attachments on their tickets" ON public.ticket_attachments;
CREATE POLICY "Users can view attachments on their tickets" ON public.ticket_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id 
      AND st.user_id = auth.uid()
      AND (is_public = true OR auth.uid() = uploaded_by)
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- Ticket Status History: Users can view history of their tickets, admins can view all
DROP POLICY IF EXISTS "Users can view status history of their tickets" ON public.ticket_status_history;
CREATE POLICY "Users can view status history of their tickets" ON public.ticket_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id 
      AND st.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- Ticket Categories: Everyone can read, only admins can modify
DROP POLICY IF EXISTS "Everyone can view ticket categories" ON public.ticket_categories;
CREATE POLICY "Everyone can view ticket categories" ON public.ticket_categories
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin users can manage ticket categories" ON public.ticket_categories;
CREATE POLICY "Admin users can manage ticket categories" ON public.ticket_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- Insert default ticket categories
INSERT INTO public.ticket_categories (name, description, color, icon, sort_order) VALUES
  ('Bug Report', 'Issues and problems with the software', '#EF4444', 'bug', 1),
  ('Feature Request', 'Requests for new features or enhancements', '#3B82F6', 'lightbulb', 2),
  ('Improvement', 'Suggestions for improving existing features', '#8B5CF6', 'arrow-trending-up', 3),
  ('Support', 'General support and help requests', '#10B981', 'question-mark-circle', 4),
  ('Documentation', 'Issues or requests related to documentation', '#F59E0B', 'document-text', 5)
ON CONFLICT (name) DO NOTHING;
