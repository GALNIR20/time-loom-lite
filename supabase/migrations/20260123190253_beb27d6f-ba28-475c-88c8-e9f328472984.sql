-- Drop existing RLS policies on projects table
DROP POLICY IF EXISTS "Owners can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update accessible projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;

-- Allow anyone to read, insert, update, delete projects (no auth required)
CREATE POLICY "Anyone can view projects" 
ON public.projects 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update projects" 
ON public.projects 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete projects" 
ON public.projects 
FOR DELETE 
USING (true);

-- Make owner_id nullable since we won't have auth
ALTER TABLE public.projects ALTER COLUMN owner_id DROP NOT NULL;

-- Drop project_memberships RLS policies (not needed anymore)
DROP POLICY IF EXISTS "Owners can add members" ON public.project_memberships;
DROP POLICY IF EXISTS "Owners can remove members" ON public.project_memberships;
DROP POLICY IF EXISTS "Users can view memberships for accessible projects" ON public.project_memberships;