-- Allow invoices and contracts to survive project deletion (project_id → NULL instead of CASCADE)
-- This enables the "selective delete" modal where users can choose what to keep.

-- invoices
ALTER TABLE invoices ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_project_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- contracts
ALTER TABLE contracts ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_project_id_fkey;
ALTER TABLE contracts ADD CONSTRAINT contracts_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
