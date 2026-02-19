-- Allow admin to upload community goal images to avatars bucket
CREATE POLICY "Admin can upload community goal images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'community-goal'
  AND is_poll_admin(auth.uid())
);

-- Allow admin to update/overwrite community goal images
CREATE POLICY "Admin can update community goal images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'community-goal'
  AND is_poll_admin(auth.uid())
);

-- Allow admin to delete community goal images
CREATE POLICY "Admin can delete community goal images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'community-goal'
  AND is_poll_admin(auth.uid())
);