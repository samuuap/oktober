-- Allow service role to insert into official_calendar
-- Run this in Supabase SQL Editor

ALTER TABLE official_calendar DISABLE ROW LEVEL SECURITY;

-- Or keep RLS but add service role policy:
-- CREATE POLICY official_calendar_service_write ON official_calendar
--   FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
