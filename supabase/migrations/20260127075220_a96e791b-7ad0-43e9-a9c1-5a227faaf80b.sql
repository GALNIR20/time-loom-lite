-- Add admin policy for project_activity
CREATE POLICY "Admins can view all project activity"
ON public.project_activity
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create a view for admin to see users (without exposing sensitive auth data)
CREATE OR REPLACE VIEW public.admin_users_view
WITH (security_invoker=on) AS
SELECT 
  ur.user_id,
  ur.role,
  ur.created_at as role_assigned_at,
  (SELECT COUNT(*) FROM public.projects p WHERE p.user_id = ur.user_id) as project_count
FROM public.user_roles ur;

-- Allow admins to query the view
CREATE POLICY "Admins can view user data"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update user roles
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete user roles (for demoting)
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert user roles (for promoting)
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));