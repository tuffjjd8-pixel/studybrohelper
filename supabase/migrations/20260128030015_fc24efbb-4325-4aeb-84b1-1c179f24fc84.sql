-- Drop the existing view and recreate with proper security
DROP VIEW IF EXISTS public_polls;

-- Create the view as SECURITY DEFINER so it can access polls table
CREATE VIEW public_polls
WITH (security_invoker = false)
AS
SELECT 
    id,
    title,
    description,
    options,
    is_public,
    created_at,
    ends_at,
    total_votes,
    image_url
FROM polls
WHERE is_public = true;

-- Grant SELECT on the view to authenticated and anon roles
GRANT SELECT ON public_polls TO authenticated;
GRANT SELECT ON public_polls TO anon;