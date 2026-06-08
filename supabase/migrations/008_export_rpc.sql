-- supabase/migrations/008_export_rpc.sql

-- Drop the function if it exists to allow replacing/updating
DROP FUNCTION IF EXISTS get_group_financial_summary(uuid);

CREATE OR REPLACE FUNCTION get_group_financial_summary(p_group_id uuid)
RETURNS TABLE (
    user_id uuid,
    user_split_id text,
    user_name text,
    total_amount_paid numeric,
    total_fair_share numeric,
    net_balance numeric,
    pending_dues_to jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH group_users AS (
        SELECT p.id, p.split_id, p.full_name
        FROM group_members gm
        JOIN profiles p ON p.id = gm.user_id
        WHERE gm.group_id = p_group_id
    ),
    paid_amounts AS (
        SELECT e.paid_by AS user_id, SUM(e.amount) AS total_paid
        FROM expenses e
        WHERE e.group_id = p_group_id
        GROUP BY e.paid_by
    ),
    fair_shares AS (
        SELECT es.user_id, SUM(es.amount) AS total_share
        FROM expense_splits es
        JOIN expenses e ON e.id = es.expense_id
        WHERE e.group_id = p_group_id
        GROUP BY es.user_id
    ),
    unsettled_debts AS (
        SELECT 
            es.user_id AS debtor_id,
            e.paid_by AS creditor_id,
            SUM(es.amount) AS amount
        FROM expense_splits es
        JOIN expenses e ON e.id = es.expense_id
        WHERE e.group_id = p_group_id
          AND es.is_settled = false
          AND es.user_id != e.paid_by
        GROUP BY es.user_id, e.paid_by
    ),
    aggregated_dues AS (
        SELECT 
            ud.debtor_id,
            jsonb_agg(
                jsonb_build_object(
                    'creditor_id', ud.creditor_id,
                    'creditor_split_id', cp.split_id,
                    'creditor_name', cp.full_name,
                    'amount', ud.amount
                )
            ) AS pending_dues
        FROM unsettled_debts ud
        JOIN profiles cp ON cp.id = ud.creditor_id
        GROUP BY ud.debtor_id
    )
    SELECT 
        gu.id AS user_id,
        gu.split_id AS user_split_id,
        gu.full_name AS user_name,
        COALESCE(pa.total_paid, 0) AS total_amount_paid,
        COALESCE(fs.total_share, 0) AS total_fair_share,
        (COALESCE(pa.total_paid, 0) - COALESCE(fs.total_share, 0)) AS net_balance,
        COALESCE(ad.pending_dues, '[]'::jsonb) AS pending_dues_to
    FROM group_users gu
    LEFT JOIN paid_amounts pa ON pa.user_id = gu.id
    LEFT JOIN fair_shares fs ON fs.user_id = gu.id
    LEFT JOIN aggregated_dues ad ON ad.debtor_id = gu.id;
END;
$$;
