# Vector Agent: AI-Powered Document Intelligence

Vector Agent is a powerful system that transforms static documents into auto-updating knowledge hubs using OpenAI's vector search and web search capabilities.

## Deployment to Render

This project is configured for easy deployment to [Render](https://render.com):

1. Create a Render account if you don't have one.
2. Fork or push this repository to GitHub, GitLab, or BitBucket.
3. In Render dashboard, click "New" and select "Blueprint" to deploy directly from the repository.
4. Connect your repository and Render will use the `render.yaml` configuration.
5. Set the required environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key.
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key.
6. Click "Create Blueprint" and Render will handle the rest!

## 🚀 Features

- Create and manage vector stores with expiration policies
- Upload and index files with customizable chunking
- Direct semantic search with filters and ranking options
- Conversational search with context
- Question answering with context
- Web search integration with result fusion
- Hybrid search combining vector and keyword matching
- Real-time content updates and reindexing
- Customizable result ranking and scoring

## ✨ How It Works

At its core, Vector Agent transforms unstructured files into a dynamic knowledge base. It creates vector stores, which are self-contained repositories with expiration rules to keep information relevant.

The system chunks documents into searchable contextual segments, enabling deep, context-aware retrieval rather than just surface-level keyword matching.

The hybrid search blends vector-based embeddings with keyword ranking, giving you semantic understanding with precision tuning.

## 🔧 Prerequisites

- Node.js v16+ and npm
- Supabase project
- OpenAI API key

## 📋 Environment Variables

Create a `.env` file in the project root with the following variables:

```
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
PORT=3000
```

## 🛠️ Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/vector-agent.git
   cd vector-agent
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build the project
   ```bash
   npm run build
   ```

4. Start the server
   ```bash
   npm start
   ```

For development, you can use:
```bash
npm run dev
```

## 📚 API Endpoints

### Create Vector Store
Creates a new vector store for indexing files.

```bash
curl -X POST "http://localhost:3000/api/vector-store/create-store" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-documents",
    "expiresAfter": {
      "anchor": "last_active_at",
      "days": 7
    }
  }'
```

### Upload File
Upload a file to be indexed. Supports both local files and URLs.

```bash
# Local file (Using a form)
curl -X POST "http://localhost:3000/api/file/upload-file" \
  -F "file=@/path/to/file.pdf"

# URL
curl -X POST "http://localhost:3000/api/file/upload-file" \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrl": "https://example.com/document.pdf"
  }'
```

### Add File to Vector Store
Index an uploaded file in a vector store with custom chunking options.

```bash
curl -X POST "http://localhost:3000/api/file/add-file" \
  -H "Content-Type: application/json" \
  -d '{
    "vectorStoreId": "vs_...",
    "fileId": "file-...",
    "chunkingStrategy": {
      "max_chunk_size_tokens": 1000,
      "chunk_overlap_tokens": 200
    }
  }'
```

### Check Processing Status
Check the status of file processing in a vector store.

```bash
curl -X POST "http://localhost:3000/api/vector-store/check-status" \
  -H "Content-Type: application/json" \
  -d '{
    "vectorStoreId": "vs_..."
  }'
```

### Search
Direct semantic search with filters and ranking options.

```bash
curl -X POST "http://localhost:3000/api/search/search" \
  -H "Content-Type: application/json" \
  -d '{
    "vectorStoreId": "vs_...",
    "query": "What are the key features?",
    "maxResults": 5,
    "filters": {
      "type": "eq",
      "key": "type",
      "value": "blog"
    },
    "webSearch": {
      "enabled": true,
      "maxResults": 3,
      "recentOnly": true
    }
  }'
```

### Chat
Conversational interface that uses vector search results as context.

```bash
curl -X POST "http://localhost:3000/api/search/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "vectorStoreId": "vs_...",
    "messages": [
      {
        "role": "user",
        "content": "What are the key features?"
      }
    ],
    "maxResults": 5,
    "filters": {
      "type": "eq",
      "key": "type", 
      "value": "blog"
    },
    "webSearch": {
      "enabled": true,
      "maxResults": 3
    }
  }'
```

### Query
Single question answering that uses vector search results as context.

```bash
curl -X POST "http://localhost:3000/api/search/query" \
  -H "Content-Type: application/json" \
  -d '{
    "vectorStoreId": "vs_...",
    "question": "What are the key features?",
    "maxResults": 5,
    "filters": {
      "type": "eq",
      "key": "type",
      "value": "blog"
    },
    "rankingOptions": {
      "ranker": "default_2024_08_21",
      "score_threshold": 0.8
    },
    "webSearch": {
      "enabled": true,
      "maxResults": 3,
      "recentOnly": true,
      "domains": ["docs.example.com", "blog.example.com"]
    }
  }'
```

## 📊 Database Schema

To set up the Supabase database, run these SQL commands in the Supabase SQL editor:

```sql
-- Create vector stores table
CREATE TABLE vector_stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create files table
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vector store files table
CREATE TABLE vector_store_files (
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

-- Create vector store chunks table with pgvector
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE vector_store_chunks (
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

-- Create vector search function
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
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.