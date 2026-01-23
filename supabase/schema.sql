-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  intervenant_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Intervenants table
CREATE TABLE IF NOT EXISTS intervenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  category_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Visits table
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  conclusion TEXT,
  visit_number INTEGER,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  opened_visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  done_visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'done')),
  type TEXT NOT NULL CHECK (type IN ('photo', 'text')),
  intervenant_id UUID REFERENCES intervenants(id) ON DELETE SET NULL,
  photo_ids JSONB DEFAULT '[]'::jsonb,
  observations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Task photos table
-- Note: Images should be stored in Supabase Storage, not in the database
-- The url field will contain the public URL from Supabase Storage
CREATE TABLE IF NOT EXISTS task_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  url TEXT, -- Public URL from Supabase Storage bucket (nullable for migration)
  storage_path TEXT, -- Path in storage bucket (e.g., 'task-photos/{task_id}/{photo_id}.jpg')
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);

CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON categories(updated_at);

CREATE INDEX IF NOT EXISTS idx_intervenants_deleted_at ON intervenants(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_intervenants_updated_at ON intervenants(updated_at);

CREATE INDEX IF NOT EXISTS idx_visits_project_id ON visits(project_id);
CREATE INDEX IF NOT EXISTS idx_visits_deleted_at ON visits(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visits_ended_at ON visits(ended_at) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(date);
CREATE INDEX IF NOT EXISTS idx_visits_updated_at ON visits(updated_at);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_visit_id ON tasks(visit_id);
CREATE INDEX IF NOT EXISTS idx_tasks_opened_visit_id ON tasks(opened_visit_id);
CREATE INDEX IF NOT EXISTS idx_tasks_done_visit_id ON tasks(done_visit_id);
CREATE INDEX IF NOT EXISTS idx_tasks_intervenant_id ON tasks(intervenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

CREATE INDEX IF NOT EXISTS idx_task_photos_task_id ON task_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_deleted_at ON task_photos(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_photos_updated_at ON task_photos(updated_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_intervenants_updated_at ON intervenants;
CREATE TRIGGER update_intervenants_updated_at BEFORE UPDATE ON intervenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visits_updated_at ON visits;
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_photos_updated_at ON task_photos;
CREATE TRIGGER update_task_photos_updated_at BEFORE UPDATE ON task_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your authentication needs)
-- For now, allowing all operations for anon role (public access)
-- You should customize these based on your auth setup

-- Projects policies
DROP POLICY IF EXISTS "Allow all operations on projects" ON projects;
CREATE POLICY "Allow all operations on projects" ON projects
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Categories policies
DROP POLICY IF EXISTS "Allow all operations on categories" ON categories;
CREATE POLICY "Allow all operations on categories" ON categories
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Intervenants policies
DROP POLICY IF EXISTS "Allow all operations on intervenants" ON intervenants;
CREATE POLICY "Allow all operations on intervenants" ON intervenants
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Visits policies
DROP POLICY IF EXISTS "Allow all operations on visits" ON visits;
CREATE POLICY "Allow all operations on visits" ON visits
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Tasks policies
DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
CREATE POLICY "Allow all operations on tasks" ON tasks
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Task photos policies
DROP POLICY IF EXISTS "Allow all operations on task_photos" ON task_photos;
CREATE POLICY "Allow all operations on task_photos" ON task_photos
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Optional: Create a function to get next visit number for a project
CREATE OR REPLACE FUNCTION get_next_visit_number(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(visit_number), 0) + 1
  INTO next_number
  FROM visits
  WHERE project_id = p_project_id AND deleted_at IS NULL;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;
