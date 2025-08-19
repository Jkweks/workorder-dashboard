-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL,
  job_name TEXT NOT NULL,
  job_pm TEXT,
  job_address TEXT,
  job_superintendent TEXT,
  date_issued DATE NOT NULL,
  work_order_number TEXT UNIQUE NOT NULL,
  material_delivery_date DATE,
  requested_completion_dates DATE[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  elevation TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'In Progress',
  hold_reason TEXT
);

CREATE TABLE IF NOT EXISTS work_order_item_completion_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES work_order_items(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
