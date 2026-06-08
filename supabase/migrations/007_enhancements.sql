-- Update expenses split_type constraint
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_split_type_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_split_type_check CHECK (split_type IN ('equal', 'custom', 'percentage', 'shares', 'itemized'));

-- ============================================================
-- EXPENSE COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id uuid REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expense_comments_expense ON expense_comments(expense_id);

ALTER TABLE expense_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their expenses" ON expense_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses e 
      WHERE e.id = expense_id 
      AND (
        e.paid_by = auth.uid() 
        OR e.created_by = auth.uid() 
        OR EXISTS (SELECT 1 FROM expense_splits es WHERE es.expense_id = e.id AND es.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create comments on their expenses" ON expense_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM expenses e 
      WHERE e.id = expense_id 
      AND (
        e.paid_by = auth.uid() 
        OR e.created_by = auth.uid() 
        OR EXISTS (SELECT 1 FROM expense_splits es WHERE es.expense_id = e.id AND es.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can delete their own comments" ON expense_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- EXPENSE HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id uuid REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  changes jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expense_history_expense ON expense_history(expense_id);

ALTER TABLE expense_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history on their expenses" ON expense_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses e 
      WHERE e.id = expense_id 
      AND (
        e.paid_by = auth.uid() 
        OR e.created_by = auth.uid() 
        OR EXISTS (SELECT 1 FROM expense_splits es WHERE es.expense_id = e.id AND es.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create history on their expenses" ON expense_history
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM expenses e 
      WHERE e.id = expense_id 
      AND (
        e.paid_by = auth.uid() 
        OR e.created_by = auth.uid() 
        OR EXISTS (SELECT 1 FROM expense_splits es WHERE es.expense_id = e.id AND es.user_id = auth.uid())
      )
    )
  );

-- ============================================================
-- EXPENSE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id uuid REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expense_items_expense ON expense_items(expense_id);

ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items on their expenses" ON expense_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses e 
      WHERE e.id = expense_id 
      AND (
        e.paid_by = auth.uid() 
        OR e.created_by = auth.uid() 
        OR EXISTS (SELECT 1 FROM expense_splits es WHERE es.expense_id = e.id AND es.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Expense creators can manage items" ON expense_items
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM expenses WHERE id = expense_id AND created_by = auth.uid())
  );
