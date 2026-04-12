-- =============================================================================
-- Row Level Security (RLS) for Supabase
-- Run this in Supabase Dashboard → SQL Editor (or via migration).
-- Your app identifies users by matching JWT email to public.users.email.
-- =============================================================================

-- 1) Helper functions (SECURITY DEFINER = run with owner rights, bypass RLS for this read)
--    So policies can "get current user's user_id and admin" without circular RLS.

CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.users WHERE email = (auth.jwt() ->> 'email') LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT admin FROM public.users WHERE email = (auth.jwt() ->> 'email') LIMIT 1), false);
$$;

-- 2) Enable RLS on all tables that hold user/client data

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_family ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_valuations ENABLE ROW LEVEL SECURITY;

-- 3) Policies: users
--    Staff see only their own row; admins see all. No client-side INSERT/UPDATE/DELETE on users.

DROP POLICY IF EXISTS "users_select_own_or_admin" ON public.users;
CREATE POLICY "users_select_own_or_admin" ON public.users
  FOR SELECT
  USING (
    (email = (auth.jwt() ->> 'email'))
    OR (public.is_admin())
  );

-- No INSERT/UPDATE/DELETE from authenticated/anon (only service role / triggers).
-- If you ever need client-side insert (e.g. signup), add a separate policy.

-- 4) Policies: clients
--    Staff see/update/delete only clients assigned to them; admins see/update/delete all.

DROP POLICY IF EXISTS "clients_select_own_or_admin" ON public.clients;
CREATE POLICY "clients_select_own_or_admin" ON public.clients
  FOR SELECT
  USING (
    (assigned_user_id = public.get_my_user_id())
    OR (public.is_admin())
  );

DROP POLICY IF EXISTS "clients_update_own_or_admin" ON public.clients;
CREATE POLICY "clients_update_own_or_admin" ON public.clients
  FOR UPDATE
  USING (
    (assigned_user_id = public.get_my_user_id())
    OR (public.is_admin())
  )
  WITH CHECK (
    (assigned_user_id = public.get_my_user_id())
    OR (public.is_admin())
  );

-- Staff can insert clients assigned to themselves (onboarding); admins can assign to anyone.
DROP POLICY IF EXISTS "clients_insert_admin_only" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_own_or_admin" ON public.clients;
CREATE POLICY "clients_insert_own_or_admin" ON public.clients
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (assigned_user_id = public.get_my_user_id())
  );

DROP POLICY IF EXISTS "clients_delete_admin_only" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_own_or_admin" ON public.clients;
CREATE POLICY "clients_delete_own_or_admin" ON public.clients
  FOR DELETE
  USING (
    (assigned_user_id = public.get_my_user_id())
    OR (public.is_admin())
  );

-- 5) Policies: client_family (access if you can access the client)

DROP POLICY IF EXISTS "client_family_select" ON public.client_family;
CREATE POLICY "client_family_select" ON public.client_family
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = client_family.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "client_family_insert" ON public.client_family;
CREATE POLICY "client_family_insert" ON public.client_family
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = client_family.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "client_family_update" ON public.client_family;
CREATE POLICY "client_family_update" ON public.client_family
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = client_family.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "client_family_delete" ON public.client_family;
CREATE POLICY "client_family_delete" ON public.client_family
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = client_family.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

-- 6) Policies: client_investments (same idea)

DROP POLICY IF EXISTS "client_investments_select" ON public.client_investments;
CREATE POLICY "client_investments_select" ON public.client_investments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = client_investments.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "client_investments_insert" ON public.client_investments;
CREATE POLICY "client_investments_insert" ON public.client_investments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = client_investments.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "client_investments_update" ON public.client_investments;
CREATE POLICY "client_investments_update" ON public.client_investments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = client_investments.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "client_investments_delete" ON public.client_investments;
CREATE POLICY "client_investments_delete" ON public.client_investments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = client_investments.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

-- 7) Policies: client_insurance (same idea)

DROP POLICY IF EXISTS "client_insurance_select" ON public.client_insurance;
CREATE POLICY "client_insurance_select" ON public.client_insurance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = client_insurance.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "client_insurance_insert" ON public.client_insurance;
CREATE POLICY "client_insurance_insert" ON public.client_insurance
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = client_insurance.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "client_insurance_update" ON public.client_insurance;
CREATE POLICY "client_insurance_update" ON public.client_insurance
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = client_insurance.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "client_insurance_delete" ON public.client_insurance;
CREATE POLICY "client_insurance_delete" ON public.client_insurance
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = client_insurance.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

-- 8) Policies: cashflow (same idea)

DROP POLICY IF EXISTS "cashflow_select" ON public.cashflow;
CREATE POLICY "cashflow_select" ON public.cashflow
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = cashflow.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "cashflow_insert" ON public.cashflow;
CREATE POLICY "cashflow_insert" ON public.cashflow
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = cashflow.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "cashflow_update" ON public.cashflow;
CREATE POLICY "cashflow_update" ON public.cashflow
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = cashflow.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "cashflow_delete" ON public.cashflow;
CREATE POLICY "cashflow_delete" ON public.cashflow
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.client_id = cashflow.client_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

-- 9) Policies: investment_valuations (access via policy → client_investments → client)

DROP POLICY IF EXISTS "investment_valuations_select" ON public.investment_valuations;
CREATE POLICY "investment_valuations_select" ON public.investment_valuations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_investments ci
      JOIN public.clients c ON c.client_id = ci.client_id
      WHERE ci.policy_id = investment_valuations.policy_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "investment_valuations_insert" ON public.investment_valuations;
CREATE POLICY "investment_valuations_insert" ON public.investment_valuations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_investments ci
      JOIN public.clients c ON c.client_id = ci.client_id
      WHERE ci.policy_id = investment_valuations.policy_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "investment_valuations_update" ON public.investment_valuations;
CREATE POLICY "investment_valuations_update" ON public.investment_valuations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.client_investments ci
      JOIN public.clients c ON c.client_id = ci.client_id
      WHERE ci.policy_id = investment_valuations.policy_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "investment_valuations_delete" ON public.investment_valuations;
CREATE POLICY "investment_valuations_delete" ON public.investment_valuations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.client_investments ci
      JOIN public.clients c ON c.client_id = ci.client_id
      WHERE ci.policy_id = investment_valuations.policy_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

-- 10) Policies: insurance_valuations (same via policy → client_insurance → client)

DROP POLICY IF EXISTS "insurance_valuations_select" ON public.insurance_valuations;
CREATE POLICY "insurance_valuations_select" ON public.insurance_valuations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_insurance ci
      JOIN public.clients c ON c.client_id = ci.client_id
      WHERE ci.policy_id = insurance_valuations.policy_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "insurance_valuations_insert" ON public.insurance_valuations;
CREATE POLICY "insurance_valuations_insert" ON public.insurance_valuations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_insurance ci
      JOIN public.clients c ON c.client_id = ci.client_id
      WHERE ci.policy_id = insurance_valuations.policy_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "insurance_valuations_update" ON public.insurance_valuations;
CREATE POLICY "insurance_valuations_update" ON public.insurance_valuations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.client_insurance ci
      JOIN public.clients c ON c.client_id = ci.client_id
      WHERE ci.policy_id = insurance_valuations.policy_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "insurance_valuations_delete" ON public.insurance_valuations;
CREATE POLICY "insurance_valuations_delete" ON public.insurance_valuations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.client_insurance ci
      JOIN public.clients c ON c.client_id = ci.client_id
      WHERE ci.policy_id = insurance_valuations.policy_id
      AND (c.assigned_user_id = public.get_my_user_id() OR public.is_admin())
    )
  );

-- Done. Service role (Edge Functions, migrations) bypasses RLS.
-- Authenticated requests use the JWT; these policies enforce who sees what.

-- 11) Policies: ai_feedback
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_feedback_insert" ON public.ai_feedback;
CREATE POLICY "ai_feedback_insert" ON public.ai_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "ai_feedback_select" ON public.ai_feedback;
CREATE POLICY "ai_feedback_select" ON public.ai_feedback
  FOR SELECT
  TO authenticated
  USING (true);
