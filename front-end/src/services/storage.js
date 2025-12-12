// Storage Service - Supabase image uploads
import { supabase } from '../lib/supabaseClient';

const BUCKET_NAME = 'images2';

export const uploadItemImage = async (file, itemId) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }
  
  try {
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${itemId}/${timestamp}-${file.name.replace(/\s+/g, '_')}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return {
      url: urlData.publicUrl,
      path: fileName
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

export const deleteItemImage = async (path) => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

export const uploadMultipleImages = async (files, itemId) => {
  const uploadPromises = files.map(file => uploadItemImage(file, itemId));
  return Promise.all(uploadPromises);
};
