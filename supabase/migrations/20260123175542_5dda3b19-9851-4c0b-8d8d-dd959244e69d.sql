-- Drop and recreate all policies with proper role targeting
-- The issue is that SELECT policy uses can_access_project which may not work 
-- correctly during INSERT...RETURNING because the row is being checked before commit

DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update accessible projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;

-- Create INSERT policy - allow authenticated users to insert their own projects
CREATE POLICY "Users can create own projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Create SELECT policy - use direct owner check OR membership check
-- This avoids issues with function calls during INSERT...RETURNING
CREATE POLICY "Users can view accessible projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.project_memberships 
      WHERE project_id = id AND user_id = auth.uid()
    )
  );

-- Create UPDATE policy with same logic
CREATE POLICY "Users can update accessible projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.project_memberships 
      WHERE project_id = id AND user_id = auth.uid()
    )
  );

-- Create DELETE policy - only owners can delete
CREATE POLICY "Owners can delete own projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());