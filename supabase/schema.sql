-- ============================================================
-- FrameFlow — Supabase Database Schema (up to migration 035)
-- Run this in the Supabase SQL Editor for a fresh install.
-- For existing installs, run the individual migration files.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE plan_type AS ENUM ('free', 'starter', 'pro', 'studio');
CREATE TYPE language_type AS ENUM ('de', 'en');
CREATE TYPE client_status AS ENUM ('lead', 'active', 'delivered', 'archived');
-- project_status is intentionally kept as text (expanded via migration 005)
CREATE TYPE contract_status AS ENUM ('draft', 'sent', 'viewed', 'signed');
CREATE TYPE gallery_status AS ENUM ('draft', 'active', 'expired');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');

-- ============================================================
-- PHOTOGRAPHERS
-- ============================================================

CREATE TABLE photographers (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 text UNIQUE NOT NULL,
  full_name             text,
  studio_name           text,
  photography_types     text[],
  logo_url              text,
  plan                  plan_type NOT NULL DEFAULT 'free',
  stripe_customer_id    text,
  stripe_sub_id         text,
  language              language_type NOT NULL DEFAULT 'de',
  onboarding_completed  boolean NOT NULL DEFAULT false,
  -- migration 016: bank details
  bank_account_holder   text,
  bank_name             text,
  bank_iban             text,
  bank_bic              text,
  -- migration 025: storage usage tracking
  storage_used_bytes    bigint NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE TABLE clients (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id   uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  full_name         text NOT NULL,
  email             text,
  phone             text,
  shoot_date        date,
  location          text,
  project_type      text,
  notes             text,
  status            client_status NOT NULL DEFAULT 'lead',
  -- migration 020: address fields
  address_street    text,
  address_city      text,
  address_zip       text,
  address_country   text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE projects (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- migration 009: client_id nullable
  client_id             uuid REFERENCES clients(id) ON DELETE SET NULL,
  photographer_id       uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  title                 text NOT NULL,
  shoot_date            date,
  project_type          text,
  -- migration 017: shooting_type_sort
  shooting_type_sort    integer,
  -- migration 005: status expanded to text
  status                text NOT NULL DEFAULT 'inquiry',
  client_token          text UNIQUE NOT NULL,
  client_url            text NOT NULL,
  -- migration 010: custom slug
  custom_slug           text UNIQUE,
  -- booking fields (migration 006)
  location              text,
  notes                 text,
  shoot_time            text,
  shoot_duration        text,
  num_persons           integer,
  price                 text,
  -- migration 013: meeting point
  meeting_point         text,
  -- migration 022: extra booking fields
  custom_type_label     text,
  custom_type_color     text,
  custom_status_label   text,
  custom_status_color   text,
  -- portal settings (migration 014)
  portal_sections       jsonb,
  portal_message        text,
  -- migration 026: portal password
  portal_password       text,
  -- migration 028: portal links
  portal_links          jsonb DEFAULT '[]'::jsonb,
  -- migration 024: steps override
  project_steps_override jsonb,
  -- migration 029: portal locale
  portal_locale         text,
  -- migration 031: internal notes
  internal_notes        text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CONTRACT TEMPLATES (migration 008)
-- ============================================================

CREATE TABLE contract_templates (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CONTRACTS
-- ============================================================

CREATE TABLE contracts (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id                  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title                       text NOT NULL DEFAULT 'Vertrag',
  content                     text,
  status                      contract_status NOT NULL DEFAULT 'draft',
  sent_at                     timestamptz,
  viewed_at                   timestamptz,
  signed_at                   timestamptz,
  signed_by_name              text,
  signature_data              text,
  ip_address                  text,
  pdf_url                     text,
  -- migration 011: photographer signature
  photographer_signature_data text,
  photographer_signed_at      timestamptz,
  -- migration 021: client fields on contract
  client_name                 text,
  client_email                text,
  client_address              text,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- GALLERIES
-- ============================================================

CREATE TABLE galleries (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  photographer_id  uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  title            text NOT NULL DEFAULT 'Galerie',
  description      text,
  status           gallery_status NOT NULL DEFAULT 'draft',
  -- migration 035: gallery password
  password         text,
  watermark        boolean NOT NULL DEFAULT true,
  download_enabled boolean NOT NULL DEFAULT true,
  -- migration 003: comments + theme
  comments_enabled boolean NOT NULL DEFAULT true,
  design_theme     text NOT NULL DEFAULT 'classic-white',
  -- migration 004: tags
  tags_enabled     jsonb DEFAULT '[]'::jsonb,
  expires_at       timestamptz,
  view_count       integer NOT NULL DEFAULT 0,
  download_count   integer NOT NULL DEFAULT 0,
  -- migration 033: favorite list name
  favorite_list_name text DEFAULT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- GALLERY SECTIONS (migration 003)
-- ============================================================

CREATE TABLE gallery_sections (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id    uuid NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  title         text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PHOTOS
-- ============================================================

CREATE TABLE photos (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id    uuid NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  -- migration 003: section support
  section_id    uuid REFERENCES gallery_sections(id) ON DELETE SET NULL,
  photographer_id uuid REFERENCES photographers(id) ON DELETE SET NULL,
  filename      text NOT NULL,
  storage_url   text NOT NULL,
  thumbnail_url text,
  file_size     integer,
  width         integer,
  height        integer,
  is_favorite   boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  -- migration 001: photo comments / tags
  tag           text,
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PHOTO COMMENTS (migration 001)
-- ============================================================

CREATE TABLE photo_comments (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id    uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- MOODBOARD ITEMS (migration 001)
-- ============================================================

CREATE TABLE moodboard_items (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'image', -- 'image' | 'url' | 'note'
  url         text,
  note        text,
  storage_url text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TIMELINES
-- ============================================================

CREATE TABLE timelines (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  events      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  photographer_id   uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  invoice_number    text,
  amount            integer NOT NULL DEFAULT 0,
  currency          text NOT NULL DEFAULT 'eur',
  status            invoice_status NOT NULL DEFAULT 'draft',
  description       text,
  due_date          date,
  -- migration 023: notes
  notes             text,
  stripe_invoice_id text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- QUESTIONNAIRE TEMPLATES (migration 019)
-- ============================================================

CREATE TABLE questionnaire_templates (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  questions       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- QUESTIONNAIRES (migration 018)
-- ============================================================

CREATE TABLE questionnaires (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT 'Fragebogen',
  questions       jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers         jsonb DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'draft', -- draft | sent | submitted
  sent_at         timestamptz,
  submitted_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INVITE CODES (migration 015)
-- ============================================================

CREATE TABLE invite_codes (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        text UNIQUE NOT NULL,
  plan        plan_type NOT NULL DEFAULT 'pro',
  max_uses    integer NOT NULL DEFAULT 1,
  used_count  integer NOT NULL DEFAULT 0,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- EMAIL TEMPLATES (migration 027)
-- ============================================================

CREATE TABLE email_templates (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  name            text NOT NULL,
  subject         text NOT NULL,
  body            text NOT NULL,
  category        text NOT NULL DEFAULT 'general', -- 'invoice' | 'gallery' | 'questionnaire' | 'contract' | 'general'
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS (migration 030)
-- ============================================================

CREATE TABLE notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  type            text NOT NULL, -- 'contract_signed' | 'questionnaire_filled' | 'gallery_viewed' | 'portal_opened' | 'contract_sent' | 'gallery_delivered'
  title_de        text NOT NULL,
  title_en        text NOT NULL,
  body_de         text,
  body_en         text,
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_name     text,
  read            boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- AUTOMATION SETTINGS (migration 030 + 032 + 034)
-- ============================================================

CREATE TABLE automation_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL UNIQUE REFERENCES photographers(id) ON DELETE CASCADE,
  -- Email automations (migration 030)
  email_portal_created    boolean DEFAULT true,
  email_contract_sent     boolean DEFAULT true,
  email_gallery_delivered boolean DEFAULT true,
  -- Reminders (migration 030)
  reminder_7d boolean DEFAULT true,
  reminder_1d boolean DEFAULT true,
  -- Notification preferences (migration 034)
  -- Controls what the PHOTOGRAPHER receives (in-app + email)
  notify_inapp_contract_signed            boolean DEFAULT true,
  notify_email_contract_signed            boolean DEFAULT true,
  notify_inapp_gallery_viewed             boolean DEFAULT true,
  notify_email_gallery_viewed             boolean DEFAULT false,
  notify_inapp_questionnaire              boolean DEFAULT true,
  notify_email_questionnaire              boolean DEFAULT true,
  notify_inapp_photo_downloaded           boolean DEFAULT true,
  notify_email_photo_downloaded           boolean DEFAULT false,
  notify_inapp_gallery_downloaded         boolean DEFAULT true,
  notify_email_gallery_downloaded         boolean DEFAULT true,
  notify_inapp_favorite_marked            boolean DEFAULT true,
  notify_email_favorite_marked            boolean DEFAULT false,
  notify_email_shoot_reminder_photographer boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_clients_photographer_id ON clients(photographer_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_projects_photographer_id ON projects(photographer_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_client_token ON projects(client_token);
CREATE INDEX idx_projects_custom_slug ON projects(custom_slug);
CREATE INDEX idx_contract_templates_photographer_id ON contract_templates(photographer_id);
CREATE INDEX idx_contracts_project_id ON contracts(project_id);
CREATE INDEX idx_galleries_project_id ON galleries(project_id);
CREATE INDEX idx_galleries_photographer_id ON galleries(photographer_id);
CREATE INDEX idx_gallery_sections_gallery_id ON gallery_sections(gallery_id);
CREATE INDEX idx_photos_gallery_id ON photos(gallery_id);
CREATE INDEX idx_photos_display_order ON photos(gallery_id, display_order);
CREATE INDEX idx_photos_section_id ON photos(section_id);
CREATE INDEX idx_photo_comments_photo_id ON photo_comments(photo_id);
CREATE INDEX idx_moodboard_items_project_id ON moodboard_items(project_id);
CREATE INDEX idx_timelines_project_id ON timelines(project_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_photographer_id ON invoices(photographer_id);
CREATE INDEX idx_questionnaire_templates_photographer_id ON questionnaire_templates(photographer_id);
CREATE INDEX idx_questionnaires_project_id ON questionnaires(project_id);
CREATE INDEX idx_questionnaires_photographer_id ON questionnaires(photographer_id);
CREATE INDEX idx_email_templates_photographer_id ON email_templates(photographer_id);
CREATE INDEX idx_notifications_photographer_id ON notifications(photographer_id);
CREATE INDEX idx_notifications_read ON notifications(photographer_id, read);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE photographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE moodboard_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PHOTOGRAPHERS POLICIES
-- ============================================================

CREATE POLICY "photographers_select_own"
  ON photographers FOR SELECT USING (auth.uid() = id);

CREATE POLICY "photographers_insert_own"
  ON photographers FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "photographers_update_own"
  ON photographers FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- CLIENTS POLICIES
-- ============================================================

CREATE POLICY "clients_select_own"
  ON clients FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY "clients_insert_own"
  ON clients FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "clients_update_own"
  ON clients FOR UPDATE
  USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "clients_delete_own"
  ON clients FOR DELETE USING (photographer_id = auth.uid());

-- ============================================================
-- PROJECTS POLICIES
-- ============================================================

CREATE POLICY "projects_select_own"
  ON projects FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY "projects_insert_own"
  ON projects FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "projects_update_own"
  ON projects FOR UPDATE
  USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "projects_delete_own"
  ON projects FOR DELETE USING (photographer_id = auth.uid());

-- Public can read projects by token (for client portal)
CREATE POLICY "projects_select_by_token"
  ON projects FOR SELECT USING (true);

-- ============================================================
-- CONTRACT TEMPLATES POLICIES
-- ============================================================

CREATE POLICY "contract_templates_select_own"
  ON contract_templates FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY "contract_templates_insert_own"
  ON contract_templates FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "contract_templates_update_own"
  ON contract_templates FOR UPDATE
  USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "contract_templates_delete_own"
  ON contract_templates FOR DELETE USING (photographer_id = auth.uid());

-- ============================================================
-- CONTRACTS POLICIES
-- ============================================================

CREATE POLICY "contracts_select_own"
  ON contracts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = contracts.project_id
    AND projects.photographer_id = auth.uid()
  ));

CREATE POLICY "contracts_insert_own"
  ON contracts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = contracts.project_id
    AND projects.photographer_id = auth.uid()
  ));

CREATE POLICY "contracts_update_own"
  ON contracts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = contracts.project_id
    AND projects.photographer_id = auth.uid()
  ));

CREATE POLICY "contracts_delete_own"
  ON contracts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = contracts.project_id
    AND projects.photographer_id = auth.uid()
  ));

-- Public can read + update contracts (for client portal signing)
CREATE POLICY "contracts_select_public"
  ON contracts FOR SELECT USING (true);

CREATE POLICY "contracts_update_public"
  ON contracts FOR UPDATE USING (true);

-- ============================================================
-- GALLERIES POLICIES
-- ============================================================

CREATE POLICY "galleries_select_own"
  ON galleries FOR SELECT
  USING (photographer_id = auth.uid());

CREATE POLICY "galleries_insert_own"
  ON galleries FOR INSERT
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "galleries_update_own"
  ON galleries FOR UPDATE
  USING (photographer_id = auth.uid());

CREATE POLICY "galleries_delete_own"
  ON galleries FOR DELETE
  USING (photographer_id = auth.uid());

-- Public can read galleries (for client portal)
CREATE POLICY "galleries_select_public"
  ON galleries FOR SELECT USING (true);

-- Public can update gallery view/download counts
CREATE POLICY "galleries_update_public"
  ON galleries FOR UPDATE USING (true);

-- ============================================================
-- GALLERY SECTIONS POLICIES
-- ============================================================

CREATE POLICY "gallery_sections_select_public"
  ON gallery_sections FOR SELECT USING (true);

CREATE POLICY "gallery_sections_insert_own"
  ON gallery_sections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM galleries
    WHERE galleries.id = gallery_sections.gallery_id
    AND galleries.photographer_id = auth.uid()
  ));

CREATE POLICY "gallery_sections_update_own"
  ON gallery_sections FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM galleries
    WHERE galleries.id = gallery_sections.gallery_id
    AND galleries.photographer_id = auth.uid()
  ));

CREATE POLICY "gallery_sections_delete_own"
  ON gallery_sections FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM galleries
    WHERE galleries.id = gallery_sections.gallery_id
    AND galleries.photographer_id = auth.uid()
  ));

-- ============================================================
-- PHOTOS POLICIES
-- ============================================================

CREATE POLICY "photos_select_own"
  ON photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM galleries
    JOIN projects ON projects.id = galleries.project_id
    WHERE galleries.id = photos.gallery_id
    AND projects.photographer_id = auth.uid()
  ));

CREATE POLICY "photos_insert_own"
  ON photos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM galleries
    JOIN projects ON projects.id = galleries.project_id
    WHERE galleries.id = photos.gallery_id
    AND projects.photographer_id = auth.uid()
  ));

CREATE POLICY "photos_update_own"
  ON photos FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM galleries
    JOIN projects ON projects.id = galleries.project_id
    WHERE galleries.id = photos.gallery_id
    AND projects.photographer_id = auth.uid()
  ));

CREATE POLICY "photos_delete_own"
  ON photos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM galleries
    JOIN projects ON projects.id = galleries.project_id
    WHERE galleries.id = photos.gallery_id
    AND projects.photographer_id = auth.uid()
  ));

-- Public can read + update photos (for client portal favorites/tags)
CREATE POLICY "photos_select_public"
  ON photos FOR SELECT USING (true);

CREATE POLICY "photos_update_public"
  ON photos FOR UPDATE USING (true);

-- ============================================================
-- PHOTO COMMENTS POLICIES
-- ============================================================

CREATE POLICY "photo_comments_select_public"
  ON photo_comments FOR SELECT USING (true);

CREATE POLICY "photo_comments_insert_public"
  ON photo_comments FOR INSERT WITH CHECK (true);

-- ============================================================
-- MOODBOARD ITEMS POLICIES
-- ============================================================

CREATE POLICY "moodboard_items_select_public"
  ON moodboard_items FOR SELECT USING (true);

CREATE POLICY "moodboard_items_insert_public"
  ON moodboard_items FOR INSERT WITH CHECK (true);

CREATE POLICY "moodboard_items_delete_public"
  ON moodboard_items FOR DELETE USING (true);

-- ============================================================
-- TIMELINES POLICIES
-- ============================================================

CREATE POLICY "timelines_select_own"
  ON timelines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = timelines.project_id
    AND projects.photographer_id = auth.uid()
  ));

CREATE POLICY "timelines_insert_own"
  ON timelines FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = timelines.project_id
    AND projects.photographer_id = auth.uid()
  ));

CREATE POLICY "timelines_update_own"
  ON timelines FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = timelines.project_id
    AND projects.photographer_id = auth.uid()
  ));

-- Public can read timelines (for client portal)
CREATE POLICY "timelines_select_public"
  ON timelines FOR SELECT USING (true);

-- ============================================================
-- INVOICES POLICIES
-- ============================================================

CREATE POLICY "invoices_select_own"
  ON invoices FOR SELECT
  USING (photographer_id = auth.uid());

CREATE POLICY "invoices_insert_own"
  ON invoices FOR INSERT
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "invoices_update_own"
  ON invoices FOR UPDATE
  USING (photographer_id = auth.uid());

CREATE POLICY "invoices_delete_own"
  ON invoices FOR DELETE
  USING (photographer_id = auth.uid());

-- ============================================================
-- QUESTIONNAIRE TEMPLATES POLICIES
-- ============================================================

CREATE POLICY "questionnaire_templates_select_own"
  ON questionnaire_templates FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY "questionnaire_templates_insert_own"
  ON questionnaire_templates FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "questionnaire_templates_update_own"
  ON questionnaire_templates FOR UPDATE
  USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "questionnaire_templates_delete_own"
  ON questionnaire_templates FOR DELETE USING (photographer_id = auth.uid());

-- ============================================================
-- QUESTIONNAIRES POLICIES
-- ============================================================

CREATE POLICY "questionnaires_select_own"
  ON questionnaires FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY "questionnaires_insert_own"
  ON questionnaires FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "questionnaires_update_own"
  ON questionnaires FOR UPDATE USING (photographer_id = auth.uid());

CREATE POLICY "questionnaires_delete_own"
  ON questionnaires FOR DELETE USING (photographer_id = auth.uid());

-- Public can read + submit questionnaires (for client portal)
CREATE POLICY "questionnaires_select_public"
  ON questionnaires FOR SELECT USING (true);

CREATE POLICY "questionnaires_update_public"
  ON questionnaires FOR UPDATE USING (true);

-- ============================================================
-- INVITE CODES POLICIES
-- ============================================================

CREATE POLICY "invite_codes_select_public"
  ON invite_codes FOR SELECT USING (true);

CREATE POLICY "invite_codes_update_public"
  ON invite_codes FOR UPDATE USING (true);

-- ============================================================
-- EMAIL TEMPLATES POLICIES
-- ============================================================

CREATE POLICY "email_templates_select_own"
  ON email_templates FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY "email_templates_insert_own"
  ON email_templates FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "email_templates_update_own"
  ON email_templates FOR UPDATE
  USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "email_templates_delete_own"
  ON email_templates FOR DELETE USING (photographer_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS POLICIES (migration 030)
-- ============================================================

CREATE POLICY "photographers can manage own notifications"
  ON notifications FOR ALL
  USING (photographer_id = auth.uid());

-- ============================================================
-- AUTOMATION SETTINGS POLICIES (migration 030)
-- ============================================================

CREATE POLICY "photographers can manage own automation_settings"
  ON automation_settings FOR ALL
  USING (photographer_id = auth.uid());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these separately in Supabase Storage settings or via API:
--
-- 1. Create bucket: "photos" (public)
-- 2. Create bucket: "logos" (public)
-- 3. Create bucket: "contracts" (private)
-- 4. Create bucket: "moodboard" (public)
--
-- Storage policies for "photos" bucket:
-- - Authenticated users can upload to their own folder
-- - Public can read all photos

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-create photographer profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.photographers (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: create photographer profile on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update updated_at column helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timelines_updated_at
  BEFORE UPDATE ON timelines
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON contract_templates
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_questionnaire_templates_updated_at
  BEFORE UPDATE ON questionnaire_templates
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_questionnaires_updated_at
  BEFORE UPDATE ON questionnaires
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_automation_settings_updated_at
  BEFORE UPDATE ON automation_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
