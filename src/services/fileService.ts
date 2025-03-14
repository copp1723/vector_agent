import { supabase, openai } from '../config';
import { AddFileRequest, FileUploadResponse } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import fetch from 'node-fetch';

/**
 * Uploads a file to storage and creates a record
 */
export const uploadFile = async (fileInput: any): Promise<FileUploadResponse> => {
  let fileId: string, fileName: string, contentType: string, fileSize: number;
  let fileContent: Buffer;

  // Handle the file input (could be a URL or local file)
  if (typeof fileInput === 'string' && fileInput.startsWith('http')) {
    // Handle URL-based file
    try {
      const response = await fetch(fileInput);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
      }
      
      fileContent = Buffer.from(await response.arrayBuffer());
      contentType = response.headers.get('content-type') || 'application/octet-stream';
      fileSize = fileContent.length;
      
      // Extract filename from URL or use a generated name
      const urlPath = new URL(fileInput).pathname;
      fileName = path.basename(urlPath) || `file-${Date.now()}`;
    } catch (error) {
      console.error('Error fetching file from URL:', error);
      throw new Error('Failed to fetch file from URL');
    }
  } else if (fileInput && fileInput.buffer) {
    // Handle uploaded file (from multer middleware)
    fileContent = fileInput.buffer;
    fileName = fileInput.originalname;
    contentType = fileInput.mimetype;
    fileSize = fileInput.size;
  } else {
    throw new Error('Invalid file input');
  }

  // Generate a unique file ID
  fileId = `file-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // Upload the file to Supabase Storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from('files')
    .upload(`${fileId}/${fileName}`, fileContent, {
      contentType,
      cacheControl: '3600'
    });

  if (storageError) {
    console.error('Error uploading file to storage:', storageError);
    throw new Error('Failed to upload file to storage');
  }

  // Create a record in the files table
  const { data, error } = await supabase
    .from('files')
    .insert({
      id: fileId,
      filename: fileName,
      content_type: contentType,
      size: fileSize,
      storage_path: storageData?.path,
      created_at: new Date().toISOString()
    })
    .select('id, filename, content_type, size, created_at')
    .single();

  if (error) {
    console.error('Error creating file record:', error);
    throw new Error('Failed to create file record');
  }

  return data as FileUploadResponse;
};

/**
 * Adds a file to a vector store with optional chunking strategy
 */
export const addFileToVectorStore = async (request: AddFileRequest): Promise<{ success: boolean }> => {
  const { vectorStoreId, fileId, chunkingStrategy } = request;
  
  // Get the file record
  const { data: fileData, error: fileError } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single();
  
  if (fileError) {
    console.error('Error getting file record:', fileError);
    throw new Error('File not found');
  }
  
  // Get the file content from storage
  const { data: fileContent, error: storageError } = await supabase.storage
    .from('files')
    .download(fileData.storage_path);
  
  if (storageError) {
    console.error('Error downloading file from storage:', storageError);
    throw new Error('Failed to download file from storage');
  }
  
  // Create a record in the vector_store_files table with status "processing"
  const { error: insertError } = await supabase
    .from('vector_store_files')
    .insert({
      vector_store_id: vectorStoreId,
      file_id: fileId,
      status: 'processing',
      chunking_strategy: chunkingStrategy || {
        max_chunk_size_tokens: 1000,
        chunk_overlap_tokens: 200
      },
      created_at: new Date().toISOString()
    });
  
  if (insertError) {
    console.error('Error creating vector store file record:', insertError);
    throw new Error('Failed to create vector store file record');
  }
  
  // Process the file asynchronously
  processFile(vectorStoreId, fileId, fileContent, chunkingStrategy);
  
  return { success: true };
};

/**
 * Process a file, chunk it, and create embeddings
 * This runs asynchronously after the API has responded
 */
const processFile = async (
  vectorStoreId: string,
  fileId: string,
  fileContent: Blob,
  chunkingStrategy?: {
    max_chunk_size_tokens: number;
    chunk_overlap_tokens: number;
  }
) => {
  try {
    // Convert Blob to text
    const text = await fileContent.text();
    
    // Default chunking strategy
    const maxChunkSize = chunkingStrategy?.max_chunk_size_tokens || 1000;
    const chunkOverlap = chunkingStrategy?.chunk_overlap_tokens || 200;
    
    // Simple chunking by paragraphs and size
    // In a real implementation, this would be more sophisticated
    const chunks = chunkText(text, maxChunkSize, chunkOverlap);
    
    // Create embeddings for each chunk and store in Supabase
    for (const [index, chunk] of chunks.entries()) {
      // Get embedding from OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: chunk,
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // Store the chunk and its embedding
      const { error } = await supabase
        .from('vector_store_chunks')
        .insert({
          vector_store_id: vectorStoreId,
          file_id: fileId,
          chunk_index: index,
          content: chunk,
          embedding,
          token_count: chunk.split(/\\s+/).length,
          metadata: {
            file_id: fileId,
            chunk_index: index
          }
        });
      
      if (error) {
        console.error('Error storing chunk:', error);
        throw error;
      }
    }
    
    // Update the file status to "completed"
    await supabase
      .from('vector_store_files')
      .update({
        status: 'completed',
        chunk_count: chunks.length,
        completed_at: new Date().toISOString()
      })
      .eq('vector_store_id', vectorStoreId)
      .eq('file_id', fileId);
    
  } catch (error) {
    console.error('Error processing file:', error);
    
    // Update the file status to "error"
    await supabase
      .from('vector_store_files')
      .update({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('vector_store_id', vectorStoreId)
      .eq('file_id', fileId);
  }
};

/**
 * Simple function to chunk text
 * This is a very basic implementation - a production version would be more sophisticated
 */
const chunkText = (
  text: string,
  maxChunkSize: number,
  chunkOverlap: number
): string[] => {
  // Split by paragraphs
  const paragraphs = text.split(/\\n\\s*\\n/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the max chunk size,
    // save the current chunk and start a new one
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      // For overlap, take the end of the previous chunk
      // This is a simplified version of overlap
      const words = currentChunk.split(/\\s+/);
      const overlapWords = words.slice(-Math.floor(chunkOverlap / 5)); // Approximate tokens to words
      currentChunk = overlapWords.join(' ') + ' ' + paragraph;
    } else {
      currentChunk += (currentChunk ? '\\n\\n' : '') + paragraph;
    }
  }
  
  // Add the last chunk if it's not empty
  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }
  
  return chunks;
};