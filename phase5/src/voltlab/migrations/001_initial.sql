CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY,
 email text NOT NULL UNIQUE CHECK (email = lower(email)),
 username text NOT NULL UNIQUE CHECK (username = lower(username)),
 name text NOT NULL DEFAULT '',
 google_sub text UNIQUE,
 email_verified boolean NOT NULL DEFAULT false,
 password_hash text,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')),
 created_at timestamptz NOT NULL DEFAULT now(),
 last_login_at timestamptz
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS workspaces (
 owner_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 data jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_events (
 id bigserial PRIMARY KEY,
 actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
 action text NOT NULL,
 target_id uuid REFERENCES users(id) ON DELETE SET NULL,
 detail jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rate_limits (
 key text PRIMARY KEY,
 attempts integer NOT NULL DEFAULT 1,
 reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_events(created_at DESC);
