-- Add is_approved column to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

-- Update existing users to be approved (so current users aren't locked out)
UPDATE public.user_roles SET is_approved = true WHERE is_approved = false;

-- Create a function to check if a user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_approved FROM public.user_roles WHERE user_id = _user_id LIMIT 1),
    false
  )
$$;

-- Update the admin_users_view to include is_approved
DROP VIEW IF EXISTS public.admin_users_view;
CREATE VIEW public.admin_users_view
WITH (security_invoker=on) AS
SELECT 
  ur.user_id,
  ur.role,
  ur.is_approved,
  ur.created_at as role_assigned_at,
  (SELECT COUNT(*) FROM public.projects p WHERE p.user_id = ur.user_id) as project_count
FROM public.user_roles ur;