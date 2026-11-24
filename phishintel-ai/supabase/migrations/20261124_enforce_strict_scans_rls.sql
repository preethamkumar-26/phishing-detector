-- Remove any previously installed scan policies before applying the strict owner policy set.
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.scans TO authenticated;
GRANT ALL ON TABLE public.scans TO service_role;
REVOKE ALL ON TABLE public.scans FROM anon;
REVOKE ALL ON TABLE public.scans FROM public;

DO $$
DECLARE
  existing_policy RECORD;
BEGIN
  FOR existing_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scans'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.scans', existing_policy.policyname);
  END LOOP;
END
$$;

CREATE POLICY "scans_select_own"
  ON public.scans
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "scans_insert_own"
  ON public.scans
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "scans_update_own"
  ON public.scans
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "scans_delete_own"
  ON public.scans
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
