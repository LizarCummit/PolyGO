import { supabase } from './supabase';

export const STORAGE_BUCKET = 'lectures';

export async function ensureStorageBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET);
  
  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 1024 * 1024 * 500, // 500MB limit
    });
    
    if (error) {
      console.error('Error creating storage bucket:', error);
      throw error;
    }
  }
}

export async function uploadRecording(
  lectureId: string,
  file: Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  await ensureStorageBucket();
  
  const fileName = `lectures/${lectureId}/recording-${Date.now()}.webm`;
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      contentType: 'video/webm',
      cacheControl: '3600',
      upsert: true,
      onUploadProgress: (progress) => {
        if (onProgress) {
          onProgress((progress.loaded / progress.total) * 100);
        }
      },
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function deleteRecording(url: string): Promise<void> {
  const path = url.split('/').slice(-2).join('/');
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([path]);

  if (error) throw error;
}

export async function updateRecordingMetadata(
  lectureId: string,
  title: string,
  description: string
): Promise<void> {
  const { error } = await supabase
    .from('media_content')
    .update({ title, description })
    .eq('lecture_id', lectureId)
    .eq('type', 'video');

  if (error) throw error;
} 