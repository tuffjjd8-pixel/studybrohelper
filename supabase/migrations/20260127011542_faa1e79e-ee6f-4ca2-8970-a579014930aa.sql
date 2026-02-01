-- Update get_poll_analytics function to include engagement_rate
CREATE OR REPLACE FUNCTION public.get_poll_analytics(poll_id_param uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH view_counts AS (
    SELECT COUNT(DISTINCT COALESCE(user_id::text, device_id)) as unique_views
    FROM poll_views 
    WHERE poll_id = poll_id_param
  ),
  voter_counts AS (
    SELECT 
      COUNT(DISTINCT COALESCE(voter_id, device_id)) as unique_voters,
      COUNT(*) FILTER (WHERE is_premium = true) as premium_votes,
      COUNT(*) FILTER (WHERE is_premium = false OR is_premium IS NULL) as free_votes
    FROM poll_votes 
    WHERE poll_id = poll_id_param
  )
  SELECT jsonb_build_object(
    'poll_id', poll_id_param,
    'total_views', COALESCE((SELECT COUNT(*) FROM poll_views WHERE poll_id = poll_id_param), 0),
    'unique_views', COALESCE((SELECT unique_views FROM view_counts), 0),
    'total_votes', COALESCE((SELECT COUNT(*) FROM poll_votes WHERE poll_id = poll_id_param), 0),
    'total_conversions', COALESCE((SELECT COUNT(*) FROM poll_analytics WHERE poll_id = poll_id_param AND event_type = 'conversion'), 0),
    'vote_distribution', COALESCE(
      (SELECT jsonb_object_agg(option_index::text, count) 
       FROM (SELECT option_index, COUNT(*) as count FROM poll_votes WHERE poll_id = poll_id_param GROUP BY option_index) sub),
      '{}'::jsonb
    ),
    'conversion_targets', COALESCE(
      (SELECT jsonb_object_agg(conversion_target, count)
       FROM (SELECT conversion_target, COUNT(*) as count FROM poll_analytics WHERE poll_id = poll_id_param AND event_type = 'conversion' AND conversion_target IS NOT NULL GROUP BY conversion_target) sub),
      '{}'::jsonb
    ),
    'unique_voters', COALESCE((SELECT unique_voters FROM voter_counts), 0),
    'premium_votes', COALESCE((SELECT premium_votes FROM voter_counts), 0),
    'free_votes', COALESCE((SELECT free_votes FROM voter_counts), 0),
    'engagement_rate', CASE 
      WHEN COALESCE((SELECT unique_views FROM view_counts), 0) = 0 THEN 0
      ELSE ROUND(
        (COALESCE((SELECT unique_voters FROM voter_counts), 0)::numeric / 
         COALESCE((SELECT unique_views FROM view_counts), 1)::numeric) * 100, 
        1
      )
    END
  );
$$;