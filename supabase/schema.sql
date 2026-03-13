-- ============================================================
-- FrameFlow — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE plan_type AS ENUM ('free', 'starter', 'pro', 'studio');
CREATE TYPE language_type AS ENUM ('de', 'en');
CREATE TYPE client_status AS ENUM ('lead', 'active', 'delivered', 'archived');
CREATE TYPE project_status AS ENUM ('draft', 'active', 'delivered', 'completed');
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
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE projects (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  title           text NOT NULL,
  shoot_date      date,
  project_type    text,
  status          project_status NOT NULL DEFAULT 'draft',
  client_token    text UNIQUE NOT NULL,
  client_url      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CONTRACTS
-- ============================================================

CREATE TABLE contracts (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT 'Vertrag',
  content         text,
  status          contract_status NOT NULL DEFAULT 'draft',
  sent_at         timestamptz,
  viewed_at       timestamptz,
  signed_at       timestamptz,
  signed_by_name  text,
  signature_data  text,
  ip_address      text,
  pdf_url         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- GALLERIES
-- ============================================================

CREATE TABLE galleries (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            text NOT NULL DEFAULT 'Galerie',
  description      text,
  status           gallery_status NOT NULL DEFAULT 'draft',
  password         text,
  watermark        boolean NOT NULL DEFAULT true,
  download_enabled boolean NOT NULL DEFAULT true,
  expires_at       timestamptz,
  view_count       integer NOT NULL DEFAULT 0,
  download_count   integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PHOTOS
-- ============================================================

CREATE TABLE photos (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id    uuid NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  filename      text NOT NULL,
  storage_url   text NOT NULL,
  thumbnail_url text,
  file_size     integer,
  width         integer,
  height        integer,
  is_favorite   boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  uploaded_at   timestamptz NOT NULL DEFAULT now()
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
  amount            integer NOT NULL DEFAULT 0,
  currency          text NOT NULL DEFAULT 'eur',
  status            invoice_status NOT NULL DEFAULT 'draft',
  due_date          date,
  stripe_invoice_id text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_clients_photographer_id ON clients(photographer_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_projects_photographer_id ON projects(photographer_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_client_token ON projects(client_token);
CREATE INDEX idx_contracts_project_id ON contracts(project_id);
CREATE INDEX idx_galleries_project_id ON galleries(project_id);
CREATE INDEX idx_photos_gallery_id ON photos(gallery_id);
CREATE INDEX idx_photos_display_order ON photos(gallery_id, display_order);
CREATE INDEX idx_timelines_project_id ON timelines(project_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE photographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PHOTOGRAPHERS POLICIES
-- ============================================================

-- Photographers can read their own profile
CREATE POLICY "photographers_select_own"
  ON photographers FOR SELECT
  USING (auth.uid() = id);

-- Photographers can insert their own profile
CREATE POLICY "photographers_insert_own"
  ON photographers FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Photographers can update their own profile
CREATE POLICY "photographers_update_own"
  ON photographers FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- CLIENTS POLICIES
-- ============================================================

-- Photographers can CRUD their own clients
CREATE POLICY "clients_select_own"
  ON clients FOR SELECT
  USING (photographer_id = auth.uid());

CREATE POLICY "clients_insert_own"
  ON clients FOR INSERT
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "clients_update_own"
  ON clients FOR UPDATE
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "clients_delete_own"
  ON clients FOR DELETE
  USING (photographer_id = auth.uid());

-- ============================================================
-- PROJECTS POLICIES
-- ============================================================

-- Photographers can CRUD their own projects
CREATE POLICY "projects_select_own"
  ON projects FOR SELECT
  USING (photographer_id = auth.uid());

CREATE POLICY "projects_insert_own"
  ON projects FOR INSERT
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "projects_update_own"
  ON projects FOR UPDATE
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "projects_delete_own"
  ON projects FOR DELETE
  USING (photographer_id = auth.uid());

-- Public can read projects by token (for client portal)
CREATE POLICY "projects_select_by_token"
  ON projects FOR SELECT
  USING (true);  -- Token validation happens in application layer

-- ============================================================
-- CONTRACTS POLICIES
-- ============================================================

-- Photographers can CRUD contracts for their projects
CREATE POLICY "contracts_select_own"
  ON contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = contracts.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "contracts_insert_own"
  ON contracts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = contracts.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "contracts_update_own"
  ON contracts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = contracts.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "contracts_delete_own"
  ON contracts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = contracts.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

-- Public can read contracts (for client portal — token validated in app)
CREATE POLICY "contracts_select_public"
  ON contracts FOR SELECT
  USING (true);

-- Public can update contracts (for signing — validated in app)
CREATE POLICY "contracts_update_public"
  ON contracts FOR UPDATE
  USING (true);

-- ============================================================
-- GALLERIES POLICIES
-- ============================================================

CREATE POLICY "galleries_select_own"
  ON galleries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = galleries.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "galleries_insert_own"
  ON galleries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = galleries.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "galleries_update_own"
  ON galleries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = galleries.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "galleries_delete_own"
  ON galleries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = galleries.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

-- Public can read galleries (for client portal)
CREATE POLICY "galleries_select_public"
  ON galleries FOR SELECT
  USING (true);

-- Public can update gallery view/download counts
CREATE POLICY "galleries_update_public"
  ON galleries FOR UPDATE
  USING (true);

-- ============================================================
-- PHOTOS POLICIES
-- ============================================================

CREATE POLICY "photos_select_own"
  ON photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM galleries
      JOIN projects ON projects.id = galleries.project_id
      WHERE galleries.id = photos.gallery_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "photos_insert_own"
  ON photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM galleries
      JOIN projects ON projects.id = galleries.project_id
      WHERE galleries.id = photos.gallery_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "photos_update_own"
  ON photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM galleries
      JOIN projects ON projects.id = galleries.project_id
      WHERE galleries.id = photos.gallery_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "photos_delete_own"
  ON photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM galleries
      JOIN projects ON projects.id = galleries.project_id
      WHERE galleries.id = photos.gallery_id
      AND projects.photographer_id = auth.uid()
    )
  );

-- Public can read photos (for client portal)
CREATE POLICY "photos_select_public"
  ON photos FOR SELECT
  USING (true);

-- Public can update photo favorites (for client portal)
CREATE POLICY "photos_update_public"
  ON photos FOR UPDATE
  USING (true);

-- ============================================================
-- TIMELINES POLICIES
-- ============================================================

CREATE POLICY "timelines_select_own"
  ON timelines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = timelines.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "timelines_insert_own"
  ON timelines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = timelines.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "timelines_update_own"
  ON timelines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = timelines.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

-- Public can read timelines (for client portal)
CREATE POLICY "timelines_select_public"
  ON timelines FOR SELECT
  USING (true);

-- ============================================================
-- INVOICES POLICIES
-- ============================================================

CREATE POLICY "invoices_select_own"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = invoices.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "invoices_insert_own"
  ON invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = invoices.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

CREATE POLICY "invoices_update_own"
  ON invoices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = invoices.project_id
      AND projects.photographer_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these separately in Supabase Storage settings or via API:
--
-- 1. Create bucket: "photos" (public)
-- 2. Create bucket: "logos" (public)
-- 3. Create bucket: "contracts" (private)
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

-- Update timeline updated_at
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
