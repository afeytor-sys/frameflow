-- Contract templates table (user-defined, per photographer)
create table if not exists public.contract_templates (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  description     text,
  content         text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS
alter table public.contract_templates enable row level security;

create policy "Photographers can manage their own templates"
  on public.contract_templates
  for all
  using  (auth.uid() = photographer_id)
  with check (auth.uid() = photographer_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contract_templates_updated_at
  before update on public.contract_templates
  for each row execute function public.set_updated_at();
