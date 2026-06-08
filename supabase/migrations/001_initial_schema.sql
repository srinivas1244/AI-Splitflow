-- ============================================================
-- SplitFlow Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Generate unique Split ID in format SPL-XXXXXX
CREATE OR REPLACE FUNCTION generate_split_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'SPL-';
  i INT;
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    result := 'SPL-';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM profiles WHERE split_id = result) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, split_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    generate_split_id()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  split_id TEXT UNIQUE NOT NULL DEFAULT generate_split_id(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group Members
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  paid_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  split_type TEXT NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom')),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('food', 'transport', 'accommodation', 'entertainment', 'utilities', 'other')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Splits
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expense_id, user_id)
);

-- Settlements
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Attachments
CREATE TABLE IF NOT EXISTS expense_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER friendships_updated_at BEFORE UPDATE ON friendships FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_split_id ON profiles(split_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payer ON settlements(payer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payee ON settlements(payee_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_attachments ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- FRIENDSHIPS
CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can create friend requests" ON friendships
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they are part of" ON friendships
  FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can delete their own friend requests" ON friendships
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- GROUPS
CREATE POLICY "Group members can view groups" ON groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create groups" ON groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" ON groups
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Group admins can delete groups" ON groups
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- GROUP MEMBERS
CREATE POLICY "Group members can view group memberships" ON group_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "Group admins can manage members" ON group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = group_id AND user_id = auth.uid() AND role = 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "Group admins can remove members" ON group_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = group_id AND user_id = auth.uid() AND role = 'admin')
    OR user_id = auth.uid()
  );

-- EXPENSES
CREATE POLICY "Users can view expenses they are involved in" ON expenses
  FOR SELECT TO authenticated
  USING (
    paid_by = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM expense_splits WHERE expense_id = id AND user_id = auth.uid())
    OR (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM group_members WHERE group_id = expenses.group_id AND user_id = auth.uid()))
  );

CREATE POLICY "Users can create expenses" ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Expense creators can update expenses" ON expenses
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Expense creators can delete expenses" ON expenses
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- EXPENSE SPLITS
CREATE POLICY "Users can view splits they are involved in" ON expense_splits
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = expense_id AND (e.paid_by = auth.uid() OR e.created_by = auth.uid())
    )
  );

CREATE POLICY "Expense creators can manage splits" ON expense_splits
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM expenses WHERE id = expense_id AND created_by = auth.uid())
  );

CREATE POLICY "Expense creators can update splits" ON expense_splits
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM expenses WHERE id = expense_id AND created_by = auth.uid())
    OR user_id = auth.uid()
  );

-- SETTLEMENTS
CREATE POLICY "Users can view their settlements" ON settlements
  FOR SELECT TO authenticated
  USING (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "Users can create settlements" ON settlements
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = payer_id);

-- EXPENSE ATTACHMENTS
CREATE POLICY "Users can view attachments for their expenses" ON expense_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = expense_id
      AND (
        e.paid_by = auth.uid() OR e.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM expense_splits es WHERE es.expense_id = e.id AND es.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can add attachments to their expenses" ON expense_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (SELECT 1 FROM expenses WHERE id = expense_id AND created_by = auth.uid())
  );

CREATE POLICY "Users can delete their own attachments" ON expense_attachments
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- ============================================================
-- STORAGE
-- ============================================================

-- Create storage bucket for expense attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-attachments',
  'expense-attachments',
  false,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expense-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'expense-attachments');

CREATE POLICY "Users can delete their own attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'expense-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
