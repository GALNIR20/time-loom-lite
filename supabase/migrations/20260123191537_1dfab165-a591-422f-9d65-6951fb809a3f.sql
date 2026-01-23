-- Drop unused authentication-related tables and functions
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.project_memberships CASCADE;

-- Drop unused auth helper functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.can_access_project(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_project_owner(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_shared_member(uuid, uuid) CASCADE;

-- Remove unused owner_id column from projects
ALTER TABLE public.projects DROP COLUMN IF EXISTS owner_id;