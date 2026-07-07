-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g., 'pdf_conversion', 'batch_process', 'login'
    event_data JSONB, -- additional data like 'file_type', 'trim_size', 'status'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on user_id and created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id_created_at ON analytics_events(user_id, created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
-- Allow users to read their own analytics events
CREATE POLICY "Users can view their own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own analytics events
CREATE POLICY "Users can insert their own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
