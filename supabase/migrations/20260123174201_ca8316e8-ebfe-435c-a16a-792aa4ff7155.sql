-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL DEFAULT 'Untitled Project',
  project_start DATE NOT NULL DEFAULT CURRENT_DATE,
  preset TEXT NOT NULL DEFAULT 'Medium',
  show_detailed BOOLEAN NOT NULL DEFAULT false,
  overrides JSONB NOT NULL DEFAULT '{}',
  hidden_milestones JSONB NOT NULL DEFAULT '[]',
  locked_dev_start DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create project_memberships table for sharing
CREATE TABLE public.project_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_memberships ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is project owner
CREATE OR REPLACE FUNCTION public.is_project_owner(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid AND owner_id = user_uuid
  )
$$;

-- Helper function: Check if user is a shared member
CREATE OR REPLACE FUNCTION public.is_shared_member(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_memberships
    WHERE project_id = project_uuid AND user_id = user_uuid
  )
$$;

-- Helper function: Check if user can access project (owner or member)
CREATE OR REPLACE FUNCTION public.can_access_project(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_project_owner(project_uuid, user_uuid) 
      OR public.is_shared_member(project_uuid, user_uuid)
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Projects RLS policies
CREATE POLICY "Users can view accessible projects"
  ON public.projects FOR SELECT
  USING (public.can_access_project(id, auth.uid()));

CREATE POLICY "Users can create own projects"
  ON public.projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update accessible projects"
  ON public.projects FOR UPDATE
  USING (public.can_access_project(id, auth.uid()));

CREATE POLICY "Owners can delete own projects"
  ON public.projects FOR DELETE
  USING (owner_id = auth.uid());

-- Project memberships RLS policies
CREATE POLICY "Users can view memberships for accessible projects"
  ON public.project_memberships FOR SELECT
  USING (public.can_access_project(project_id, auth.uid()));

CREATE POLICY "Owners can add members"
  ON public.project_memberships FOR INSERT
  WITH CHECK (public.is_project_owner(project_id, auth.uid()));

CREATE POLICY "Owners can remove members"
  ON public.project_memberships FOR DELETE
  USING (public.is_project_owner(project_id, auth.uid()));

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create profile automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for projects table
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;