import { Request, Response } from 'express';

// Custom Express Handler Type to avoid TypeScript errors
export type CustomRequestHandler = (req: Request, res: Response) => Promise<any>;

// Vector Store Types
export interface VectorStoreCreateRequest {
  name: string;
  expiresAfter?: {
    anchor: 'created_at' | 'last_active_at';
    days: number;
  };
}

export interface VectorStore {
  id: string;
  name: string;
  created_at: string;
  last_active_at: string;
  expires_at?: string;
}

// File Types
export interface FileUploadResponse {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  created_at: string;
}

export interface AddFileRequest {
  vectorStoreId: string;
  fileId: string;
  chunkingStrategy?: {
    max_chunk_size_tokens: number;
    chunk_overlap_tokens: number;
  };
}

// Search Types
export interface Filter {
  type: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  key: string;
  value: any;
}

export interface WebSearchOptions {
  enabled: boolean;
  maxResults?: number;
  recentOnly?: boolean;
  domains?: string[];
}

export interface HybridSearchOptions {
  enabled: boolean;
  keywordWeight?: number;
  vectorWeight?: number;
}

export interface RankingOptions {
  ranker?: string;
  score_threshold?: number;
}

export interface SearchRequest {
  vectorStoreId: string;
  query: string;
  maxResults?: number;
  filters?: Filter;
  webSearch?: WebSearchOptions;
  hybridSearch?: HybridSearchOptions;
  rankingOptions?: RankingOptions;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  vectorStoreId: string;
  messages: ChatMessage[];
  maxResults?: number;
  filters?: Filter;
  webSearch?: WebSearchOptions;
  hybridSearch?: HybridSearchOptions;
}

export interface QueryRequest {
  vectorStoreId: string;
  question: string;
  maxResults?: number;
  filters?: Filter;
  webSearch?: WebSearchOptions;
  hybridSearch?: HybridSearchOptions;
  rankingOptions?: RankingOptions;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
  source: 'vector' | 'web';
}