import { supabase } from '../config';
import { VectorStoreCreateRequest, VectorStore } from '../types';

/**
 * Creates a new vector store in Supabase
 */
export const createVectorStore = async (request: VectorStoreCreateRequest): Promise<{ id: string }> => {
  // Generate a unique ID for the vector store
  const vectorStoreId = `vs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Calculate expiration date if provided
  let expiresAt = null;
  if (request.expiresAfter) {
    const { anchor, days } = request.expiresAfter;
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setDate(now.getDate() + days);
    expiresAt = expirationDate.toISOString();
  }
  
  // Create the vector store record in Supabase
  const { data, error } = await supabase
    .from('vector_stores')
    .insert({
      id: vectorStoreId,
      name: request.name,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      expires_at: expiresAt
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Error creating vector store in Supabase:', error);
    throw new Error('Failed to create vector store');
  }
  
  return { id: data.id };
};

/**
 * Checks the processing status of a vector store
 */
export const checkStatus = async (vectorStoreId: string): Promise<{ status: string; fileCount: number; processingCount: number }> => {
  // Get the vector store record
  const { data: vectorStore, error: vectorStoreError } = await supabase
    .from('vector_stores')
    .select('*')
    .eq('id', vectorStoreId)
    .single();
  
  if (vectorStoreError) {
    console.error('Error getting vector store:', vectorStoreError);
    throw new Error('Vector store not found');
  }
  
  // Update the last_active_at timestamp
  await supabase
    .from('vector_stores')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', vectorStoreId);
  
  // Get the count of files in the vector store
  const { count: fileCount, error: fileCountError } = await supabase
    .from('vector_store_files')
    .select('*', { count: 'exact', head: true })
    .eq('vector_store_id', vectorStoreId);
  
  if (fileCountError) {
    console.error('Error getting file count:', fileCountError);
    throw new Error('Failed to get file count');
  }
  
  // Get the count of files still processing
  const { count: processingCount, error: processingCountError } = await supabase
    .from('vector_store_files')
    .select('*', { count: 'exact', head: true })
    .eq('vector_store_id', vectorStoreId)
    .eq('status', 'processing');
  
  if (processingCountError) {
    console.error('Error getting processing count:', processingCountError);
    throw new Error('Failed to get processing count');
  }
  
  // Determine the overall status
  let status = 'ready';
  if (processingCount && processingCount > 0) {
    status = 'processing';
  } else if (!fileCount || fileCount === 0) {
    status = 'empty';
  }
  
  return {
    status,
    fileCount: fileCount || 0,
    processingCount: processingCount || 0
  };
};