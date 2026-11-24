-- Supabase SQL Editor में एक बार चलाएँ: लॉगिन किए हुए (Google) यूज़र भी समीक्षा भेज/देख सकें।
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT oid::regprocedure AS f FROM pg_proc
           WHERE proname IN ('submit_review','get_reviews') AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.f || ' TO authenticated';
  END LOOP;
END $$;
