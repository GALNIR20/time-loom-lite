-- Create activity log table
CREATE TABLE public.project_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view activity
CREATE POLICY "Anyone can view activity"
ON public.project_activity
FOR SELECT
USING (true);

-- Allow anyone to create activity
CREATE POLICY "Anyone can create activity"
ON public.project_activity
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_project_activity_project_id ON public.project_activity(project_id);
CREATE INDEX idx_project_activity_created_at ON public.project_activity(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_activity;