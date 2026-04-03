-- Add verwendungszweck column to invoices table
alter table invoices
  add column if not exists verwendungszweck text;
