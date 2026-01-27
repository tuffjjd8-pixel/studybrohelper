-- Fix: Restrict poll_views INSERT to authenticated users or with valid device_id
DROP POLICY IF EXISTS "Anyone can insert views" ON public.poll_views;

CREATE POLICY "Authenticated users or devices can insert views"
ON public.poll_views FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) 
  OR 
  (auth.uid() IS NULL AND device_id IS NOT NULL AND user_id IS NULL)
);