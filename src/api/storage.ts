import { supabase } from '../auth/supabase';
import { env } from '../utils/env';

/**
 * Event images go straight to Supabase Storage with the admin's own session
 * (kinnoc-api docs/events.md §4). Storage policies only let active admins write,
 * and only inside their own `<user id>/` folder. The API then verifies the key.
 */

export const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** A problem with the file, or null when it can be uploaded. */
export function imageFileProblem(file: File): string | null {
  if (!IMAGE_TYPES[file.type]) return 'Choose a JPEG, PNG or WebP image.';
  if (file.size > MAX_IMAGE_BYTES) return 'The image must be 5 MB or smaller.';
  return null;
}

/** Uploads under `<user id>/<random name>` and returns the object key to send to the API. */
export async function uploadEventImage(file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const problem = imageFileProblem(file);
  if (problem) throw new Error(problem);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Your session has expired. Please sign in again.');

  const key = `${userData.user.id}/${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
  const { error } = await supabase.storage
    .from(env.eventMediaBucket)
    .upload(key, file, { contentType: file.type, upsert: false, cacheControl: '3600' });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return key;
}

/**
 * Best-effort removal of a file this admin uploaded (the API can't delete Storage
 * objects). Files in other admins' folders are left alone; Storage would refuse anyway.
 */
export async function deleteEventImage(key: string): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId || !key.startsWith(`${userId}/`)) return;
  const { error } = await supabase.storage.from(env.eventMediaBucket).remove([key]);
  if (error) console.warn('Could not delete the replaced image', error.message);
}

export interface PendingImages {
  cover?: File | null;
  logo?: File | null;
}

/**
 * Uploads any new images, then runs `save` with their keys. If anything fails,
 * the files uploaded here are deleted again so no orphans are left behind.
 */
export async function saveWithImages<T>(
  files: PendingImages,
  save: (keys: { cover?: string; logo?: string }) => Promise<T>,
): Promise<T> {
  const uploaded: string[] = [];
  try {
    const keys: { cover?: string; logo?: string } = {};
    if (files.cover) uploaded.push((keys.cover = await uploadEventImage(files.cover)));
    if (files.logo) uploaded.push((keys.logo = await uploadEventImage(files.logo)));
    return await save(keys);
  } catch (error) {
    await Promise.all(uploaded.map(deleteEventImage));
    throw error;
  }
}
