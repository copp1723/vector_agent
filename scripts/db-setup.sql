-- This file contains SQL to set up the database for the Vector Agent
-- Run these in the Supabase SQL Editor

-- Enable pgvector extension
CREATE OR REPLACE FUNCTION create_vector_extension() RETURNS void AS $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
END;
$$ LANGUAGE plpgsql;

-- Create vector stores table function
CREATE OR REPLACE FUNCTION create_vector_stores_table() RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS vector_stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
  );
END;
$$ LANGUAGE plpgsql;

-- Create files table function
CREATE OR REPLACE FUNCTION create_files_table() RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Create vector store files table function
CREATE OR REPLACE FUNCTION create_vector_store_files_table() RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS vector_store_files (
    vector_store_id TEXT REFERENCES vector_stores(id) ON DELETE CASCADE,
    file_id TEXT REFERENCES files(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    chunking_strategy JSONB NOT NULL,
    chunk_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    PRIMARY KEY (vector_store_id, file_id)
  );
END;
$$ LANGUAGE plpgsql;

-- Create vector store chunks table function
CREATE OR REPLACE FUNCTION create_vector_store_chunks_table() RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS vector_store_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vector_store_id TEXT REFERENCES vector_stores(id) ON DELETE CASCADE,
    file_id TEXT REFERENCES files(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    token_count INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Create match document chunks function
CREATE OR REPLACE FUNCTION create_match_document_chunks_function() RETURNS void AS $$
BEGIN
  CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(1536),
    match_threshold FLOAT,
    match_count INT,
    vector_store_id TEXT
  )
  RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
      vsc.id,
      vsc.content,
      vsc.metadata,
      1 - (vsc.embedding <=> query_embedding) AS similarity
    FROM vector_store_chunks vsc
    WHERE vsc.vector_store_id = match_document_chunks.vector_store_id
    AND 1 - (vsc.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
  END;
  $$;
END;
$$ LANGUAGE plpgsql;

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('files', 'Files Bucket', FALSE, FALSE)
ON CONFLICT DO NOTHING;

-- Set up storage policies
CREATE POLICY "Allow authenticated users to upload files" 
  ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'files');

CREATE POLICY "Allow authenticated users to download their own files" 
  ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'files');