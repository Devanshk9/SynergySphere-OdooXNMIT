-- =========================================================
-- SynergySphere (Problem Statement 2) - PostgreSQL Schema
-- =========================================================

-- UUIDs + trigram (optional) for fuzzy search if you want it later
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
-- ---------- helpers ----------
-- updated_at auto-touch trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- enums ----------
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
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL, -- store Argon2/Bcrypt hash
  full_name       TEXT NOT NULL,
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- optional: session store (if you roll your own auth sessions/JWT revocation)
CREATE TABLE auth_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent      TEXT,
  ip_address      INET,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- =========================================================
-- PROJECTS & MEMBERS
-- =========================================================
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_projects_created_by ON projects(created_by);

CREATE TABLE project_members (
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            project_role NOT NULL DEFAULT 'member',
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);

-- (Optional) invites if you want to send email invites
-- CREATE TABLE project_invites (
--   id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
--   email         CITEXT NOT NULL,
--   invited_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
--   status        TEXT NOT NULL DEFAULT 'pending', -- pending/accepted/expired
--   token_hash    TEXT NOT NULL, -- store hashed token
--   created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   expires_at    TIMESTAMPTZ NOT NULL
-- );
-- CREATE INDEX idx_project_invites_project_id ON project_invites(project_id);
-- CREATE INDEX idx_project_invites_email ON project_invites(email);

-- =========================================================
-- TASKS
-- =========================================================
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          task_status NOT NULL DEFAULT 'todo',
  due_date        DATE,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
-- Optional: full-text on title/description for search
CREATE INDEX idx_tasks_fts ON tasks USING GIN (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')));

-- Many-to-many: tasks ↔ assignees
CREATE TABLE task_assignees (
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX idx_task_assignees_user_id ON task_assignees(user_id);

-- Optional: task activity (status changes, reassignment, etc.)
CREATE TABLE task_activity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,           -- 'status_changed', 'edited', etc.
  meta            JSONB,                   -- {"from":"todo","to":"done"} etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_activity_task_id ON task_activity(task_id);
CREATE INDEX idx_task_activity_created_at ON task_activity(created_at);

-- =========================================================
-- PROJECT DISCUSSIONS (threaded)
-- =========================================================
CREATE TABLE discussion_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_discussion_threads_updated_at
BEFORE UPDATE ON discussion_threads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_discussion_threads_project_id ON discussion_threads(project_id);

CREATE TABLE discussion_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  body            TEXT NOT NULL,
  -- If you want nested replies inside a thread, enable parent_message_id:
  parent_message_id UUID REFERENCES discussion_messages(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_discussion_messages_updated_at
BEFORE UPDATE ON discussion_messages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_discussion_messages_thread_id ON discussion_messages(thread_id);
CREATE INDEX idx_discussion_messages_parent ON discussion_messages(parent_message_id);

-- =========================================================
-- TASK COMMENTS (separate from project discussions; optional but handy)
-- =========================================================
CREATE TABLE task_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  body            TEXT NOT NULL,
  parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_task_comments_updated_at
BEFORE UPDATE ON task_comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_parent ON task_comments(parent_comment_id);

-- =========================================================
-- NOTIFICATIONS (basic)
-- =========================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id         UUID REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  payload         JSONB,                 -- {"taskTitle":"X","from":"todo","to":"done"} etc.
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

-- =========================================================
-- OPTIONAL SEARCH NICETIES
-- =========================================================
-- Fast search by project/task title
CREATE INDEX idx_projects_name_trgm ON projects USING GIN (name gin_trgm_ops);
CREATE INDEX idx_tasks_title_trgm   ON tasks    USING GIN (title gin_trgm_ops);