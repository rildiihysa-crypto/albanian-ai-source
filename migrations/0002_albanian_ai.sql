-- Albanian AI private workspace (same shape as the source package, Postgres)
create table if not exists conversations (
  id text primary key,
  user_id text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_updated_idx
  on conversations (user_id, updated_at desc);

create table if not exists messages (
  id text primary key,
  conversation_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_created_idx
  on messages (conversation_id, created_at);

create table if not exists memories (
  id text primary key,
  user_id text not null,
  content text not null,
  category text not null default 'preference',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists memories_user_updated_idx
  on memories (user_id, updated_at desc);

create table if not exists files (
  id text primary key,
  user_id text not null,
  conversation_id text,
  message_id text,
  file_name text not null,
  mime_type text not null,
  size integer not null,
  extracted_text text,
  created_at timestamptz not null default now()
);
create index if not exists files_user_created_idx
  on files (user_id, created_at desc);
create index if not exists files_conversation_idx
  on files (conversation_id);

create table if not exists settings (
  id text primary key,
  user_id text not null,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);
