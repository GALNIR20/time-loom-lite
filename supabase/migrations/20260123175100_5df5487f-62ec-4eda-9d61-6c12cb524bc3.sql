-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;

-- Create a PERMISSIVE INSERT policy (default is PERMISSIVE)
CREATE POLICY "Users can create own projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());