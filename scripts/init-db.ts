#!/usr/bin/env node

import { supabase } from '../src/config';

/**
 * Initialize the Supabase database with required tables and functions
 */
async function initDatabase() {
  console.log('Initializing database...');

  try {
    // Create vector extension
    await supabase.rpc('create_vector_extension');
    console.log('✅ Created pgvector extension');
  } catch (error) {
    console.error('Error creating vector extension:', error);
    console.log('⚠️ You may need to manually enable the pgvector extension in your Supabase project settings');
  }

  try {
    // Create vector stores table
    const { error: vectorStoresError } = await supabase.rpc('create_vector_stores_table');
    if (vectorStoresError) throw vectorStoresError;
    console.log('✅ Created vector_stores table');

    // Create files table
    const { error: filesError } = await supabase.rpc('create_files_table');
    if (filesError) throw filesError;
    console.log('✅ Created files table');

    // Create vector store files table
    const { error: vectorStoreFilesError } = await supabase.rpc('create_vector_store_files_table');
    if (vectorStoreFilesError) throw vectorStoreFilesError;
    console.log('✅ Created vector_store_files table');

    // Create vector store chunks table
    const { error: vectorStoreChunksError } = await supabase.rpc('create_vector_store_chunks_table');
    if (vectorStoreChunksError) throw vectorStoreChunksError;
    console.log('✅ Created vector_store_chunks table');

    // Create match document chunks function
    const { error: matchDocumentChunksError } = await supabase.rpc('create_match_document_chunks_function');
    if (matchDocumentChunksError) throw matchDocumentChunksError;
    console.log('✅ Created match_document_chunks function');

    console.log('✅ Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    console.log('⚠️ Database initialization failed. Please check your Supabase connection and permissions.');
  }
}

// Run the initialization
initDatabase();