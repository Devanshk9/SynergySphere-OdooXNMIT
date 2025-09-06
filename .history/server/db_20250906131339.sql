-- =========================================================
-- SynergySphere - Reset & Create Schema (PostgreSQL)
-- =========================================================

-- ---------- DROPS ----------
-- Drop functions first (because triggers depend on them)
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS ensure_assignee_is_member() CASCADE;

-- Drop tables in dependency order
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS discussion_messages CASCADE;
DROP TABLE IF EXISTS discussion_threads CASCADE;
DROP TABLE IF EXISTS task_activity CASCADE;
DROP TABLE IF EXISTS task_assignees CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop enums
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS project_role CASCADE;

-- ---------- EXTENSIONS ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------- FUNCTIONS ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ensure_assignee_is_member()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM tasks t
    JOIN project_members pm
      ON pm.project_id = t.project_id
     AND pm.user_id    = NEW.user_id
    WHERE t.id = NEW.task_id
  ) THEN
    RAISE EXCEPTION 'User % is not a member of the project for task %',
      NEW.user_id, NEW.task_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- ENUMS ----------
CREATE TYPE project_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'blocked');
CREATE TYPE notification_type AS ENUM (
  'project_invite',
  'task_assigned',
  'task_status_changed',
  'comment_added',
  'mention'
);

-- =========================================================
-- USERS & AUTH
-- =========================================================
CREATE TABLE users (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT  UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,
  full_name     TEXT    NOT NULL,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE auth_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent  TEXT,
  ip_address  INET,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_auth_sessions_user    ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);

-- =========================================================
-- PROJECTS & MEMBERS
-- =========================================================
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT projects_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_active     ON projects(is_archived) WHERE is_archived = FALSE;
CREATE INDEX idx_projects_name_trgm  ON projects USING GIN (name gin_trgm_ops);

CREATE TABLE project_members (
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  role        project_role NOT NULL DEFAULT 'member',
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);

-- =========================================================
-- TASKS
-- =========================================================
CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  status        task_status NOT NULL DEFAULT 'todo',
  due_date      DATE,
  is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT tasks_due_date_reasonable CHECK (due_date IS NULL OR due_date >= DATE '1900-01-01')
);

CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_tasks_project           ON tasks(project_id);
CREATE INDEX idx_tasks_project_status    ON tasks(project_id, status);
CREATE INDEX idx_tasks_due_date          ON tasks(due_date);
CREATE INDEX idx_tasks_project_createdat ON tasks(project_id, created_at DESC);
CREATE INDEX idx_tasks_active            ON tasks(is_archived) WHERE is_archived = FALSE;
CREATE INDEX idx_tasks_fts ON tasks USING GIN (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
);
CREATE INDEX idx_tasks_title_trgm ON tasks USING GIN (title gin_trgm_ops);

CREATE TABLE task_assignees (
  task_id     UUID NOT NULL REFERENCES tasks(id)  ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);

CREATE TRIGGER trg_task_assignee_membership
BEFORE INSERT OR UPDATE ON task_assignees
FOR EACH ROW EXECUTE FUNCTION ensure_assignee_is_member();

CREATE TABLE task_activity (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action     TEXT NOT NULL,
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_task_activity_task      ON task_activity(task_id);
CREATE INDEX idx_task_activity_createdat ON task_activity(created_at);

-- =========================================================
-- PROJECT DISCUSSIONS
-- =========================================================
CREATE TABLE discussion_threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_discussion_threads_updated_at
BEFORE UPDATE ON discussion_threads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_discussion_threads_project ON discussion_threads(project_id);

CREATE TABLE discussion_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body        TEXT NOT NULL,
  parent_message_id UUID REFERENCES discussion_messages(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_discussion_messages_updated_at
BEFORE UPDATE ON discussion_messages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_discussion_messages_thread  ON discussion_messages(thread_id);
CREATE INDEX idx_discussion_messages_parent  ON discussion_messages(parent_message_id);
CREATE INDEX idx_discussion_messages_created ON discussion_messages(thread_id, created_at DESC);

-- =========================================================
-- TASK COMMENTS
-- =========================================================
CREATE TABLE task_comments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          UUID NOT NULL REFERENCES tasks(id)  ON DELETE CASCADE,
  author_id        UUID NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  body             TEXT NOT NULL,
  parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_task_comments_updated_at
BEFORE UPDATE ON task_comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_task_comments_task    ON task_comments(task_id);
CREATE INDEX idx_task_comments_parent  ON task_comments(parent_comment_id);
CREATE INDEX idx_task_comments_created ON task_comments(task_id, created_at DESC);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  type        notification_type NOT NULL,
  project_id  UUID REFERENCES projects(id)           ON DELETE CASCADE,
  task_id     UUID REFERENCES tasks(id)              ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id)              ON DELETE SET NULL,
  payload     JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_is_read      ON notifications(user_id, is_read);

-- =========================================================
-- DONE
-- =========================================================

CREATE TABLE IF NOT EXISTS projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'active', -- e.g., 'active' | 'paused' | 'completed'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_set_updated_at ON projects;
CREATE TRIGGER projects_set_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
ALTER TABLE projects
ADD COLUMN status text NOT NULL DEFAULT 'active';
INSERT INTO projects (name, description, created_by, status, is_archived)
VALUES (
  'SynergySphere Core',
  'Main platform backend and services',
  'bfcd1a87-cb63-440c-807e-0ce841e7a952', -- replace with a user id from users
  'active',
  false
);