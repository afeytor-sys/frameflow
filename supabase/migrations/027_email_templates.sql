-- Email templates table
create table if not exists email_templates (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  name            text not null,
  description     text,
  category        text not null default 'general', -- 'rechnung' | 'galerie' | 'fragebogen' | 'general'
  subject         text not null default '',
  body            text not null default '',
  created_at      timestamptz not null default now()
);

-- RLS
alter table email_templates enable row level security;

create policy "photographers can manage own email templates"
  on email_templates for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());
