-- Project Management Tool - PostgreSQL schema (SRS v1.1, Chapter 6)
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(254) NOT NULL,
  password_hash TEXT         NOT NULL,
  phone         VARCHAR(30),
  system_role   VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (system_role IN ('admin', 'user')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Emails are stored lower-case by the API; this index also protects against races.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users (lower(email));

CREATE TABLE IF NOT EXISTS projects (
  id                      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title                   VARCHAR(150) NOT NULL,
  description             TEXT         NOT NULL DEFAULT '',
  status                  VARCHAR(12)  NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'completed', 'on_hold')),
  end_date                DATE,
  owner_id                INTEGER      NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  members_can_create_tasks BOOLEAN     NOT NULL DEFAULT false,   -- FR-TASK-17
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id INTEGER     NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
  role       VARCHAR(10) NOT NULL CHECK (role IN ('manager', 'member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS project_members_user_idx ON project_members (user_id);
-- Every project has exactly one Manager.
CREATE UNIQUE INDEX IF NOT EXISTS project_members_one_manager_uq
  ON project_members (project_id) WHERE role = 'manager';

CREATE TABLE IF NOT EXISTS tasks (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id     INTEGER      NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title          VARCHAR(200) NOT NULL,
  description    TEXT         NOT NULL DEFAULT '',
  status         VARCHAR(12)  NOT NULL DEFAULT 'todo'
                 CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  priority       VARCHAR(6)   NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assignee_id    INTEGER      REFERENCES users (id) ON DELETE SET NULL,
  due_date       DATE,
  position       INTEGER      NOT NULL DEFAULT 0,
  created_by     INTEGER      REFERENCES users (id) ON DELETE SET NULL,
  blocked_reason VARCHAR(300),
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- NFR-PERF-04: indexes for filtering and counting
CREATE INDEX IF NOT EXISTS tasks_project_status_idx   ON tasks (project_id, status);
CREATE INDEX IF NOT EXISTS tasks_assignee_idx         ON tasks (assignee_id);
CREATE INDEX IF NOT EXISTS tasks_project_due_idx      ON tasks (project_id, due_date);
CREATE INDEX IF NOT EXISTS tasks_project_completed_idx ON tasks (project_id, completed_at)
  WHERE completed_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id    INTEGER       NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  user_id    INTEGER       REFERENCES users (id) ON DELETE SET NULL,   -- NULL => "Deleted user"
  text       VARCHAR(1000) NOT NULL CHECK (char_length(text) >= 1),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_task_idx ON comments (task_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type       VARCHAR(20)  NOT NULL
             CHECK (type IN ('assigned', 'comment', 'status_changed', 'added_to_project', 'mention')),
  task_id    INTEGER      REFERENCES tasks (id) ON DELETE CASCADE,
  project_id INTEGER      REFERENCES projects (id) ON DELETE CASCADE,  -- extension: lets the UI show the project name
  message    TEXT         NOT NULL,
  is_read    BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, is_read, created_at DESC);

-- Could: FR-AUTH-07
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash CHAR(64)    NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);

-- Could: FR-RT-03
CREATE TABLE IF NOT EXISTS activity_logs (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER      NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id    INTEGER      REFERENCES users (id) ON DELETE SET NULL,
  action     VARCHAR(40)  NOT NULL,
  target     VARCHAR(250) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_logs_project_idx ON activity_logs (project_id, created_at DESC);
