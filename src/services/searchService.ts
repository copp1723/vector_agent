import { supabase, openai } from '../config';
import { SearchRequest, ChatRequest, QueryRequest, SearchResult, ChatMessage } from '../types';

/**
 * Performs a direct semantic search against the vector store
 */
export const search = async (request: SearchRequest): Promise<{ results: SearchResult[] }> => {
  // Extract request parameters
  const { 
    vectorStoreId, 
    query, 
    maxResults = 5, 
    filters,
    webSearch,
    hybridSearch,
    rankingOptions
  } = request;

  // Update the vector store's last_active_at timestamp
  await updateVectorStoreLastActive(vectorStoreId);

  // Create embedding for the query
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });
  
  const queryEmbedding = embeddingResponse.data[0].embedding;
  
  // Perform vector search in Supabase
  let vectorResults: SearchResult[] = [];
  try {
    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: rankingOptions?.score_threshold || 0.7,
      match_count: maxResults,
      vector_store_id: vectorStoreId
    });
    
    if (error) {
      console.error('Error performing vector search:', error);
      throw new Error('Failed to perform vector search');
    }
    
    vectorResults = data.map((item: any) => ({
      id: item.id,
      content: item.content,
      metadata: item.metadata,
      score: item.similarity,
      source: 'vector'
    }));
  } catch (error) {
    console.error('Vector search error:', error);
    // Continue even if vector search fails, to try web search
  }
  
  // Perform web search if enabled
  let webResults: SearchResult[] = [];
  if (webSearch?.enabled) {
    try {
      webResults = await performWebSearch(
        query, 
        webSearch.maxResults || 3, 
        webSearch.recentOnly || false,
        webSearch.domains
      );
    } catch (error) {
      console.error('Web search error:', error);
      // Continue even if web search fails
    }
  }
  
  // Combine results and rank them
  let combinedResults = [...vectorResults, ...webResults];
  
  // Apply filters if provided
  if (filters) {
    combinedResults = applyFilters(combinedResults, filters);
  }
  
  // Apply hybrid search ranking if enabled
  if (hybridSearch?.enabled) {
    combinedResults = applyHybridRanking(
      combinedResults, 
      query, 
      hybridSearch.vectorWeight || 0.7, 
      hybridSearch.keywordWeight || 0.3
    );
  }
  
  // Sort by score and limit to maxResults
  combinedResults.sort((a, b) => b.score - a.score);
  combinedResults = combinedResults.slice(0, maxResults);
  
  return { results: combinedResults };
};

/**
 * Provides a chat interface using the vector store for context
 */
export const chat = async (request: ChatRequest): Promise<{ response: string; context?: SearchResult[] }> => {
  // Extract request parameters
  const { 
    vectorStoreId, 
    messages, 
    maxResults = 5, 
    filters,
    webSearch,
    hybridSearch
  } = request;
  
  // Get the latest user message
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUserMessage) {
    throw new Error('No user message found');
  }
  
  // Perform a search to get context
  const searchResults = await search({
    vectorStoreId,
    query: lastUserMessage.content,
    maxResults,
    filters,
    webSearch,
    hybridSearch
  });
  
  // Create context string from search results
  const contextText = searchResults.results
    .map(result => `[Source: ${result.source}, Score: ${result.score.toFixed(2)}]\n${result.content}`)
    .join('\n\n');
  
  // Prepare messages for the chat completion
  const contextSystemMessage: ChatMessage = {
    role: 'system',
    content: `You are an AI assistant that answers questions based on the provided context. Use the following information to answer the user's question. If you don't know the answer, say so - don't make up information that's not in the context.\n\nContext:\n${contextText}`
  };
  
  const chatMessages = [contextSystemMessage, ...messages];
  
  // Call OpenAI chat completion
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: chatMessages,
  });
  
  const response = completion.choices[0].message.content || '';
  
  // Update the vector store's last_active_at timestamp
  await updateVectorStoreLastActive(vectorStoreId);
  
  return { 
    response, 
    context: searchResults.results 
  };
};

/**
 * Answers a single question using the vector store and web search for context
 */
export const query = async (request: QueryRequest): Promise<{ answer: string; context?: SearchResult[] }> => {
  // Extract request parameters
  const { 
    vectorStoreId, 
    question, 
    maxResults = 5, 
    filters,
    webSearch,
    hybridSearch,
    rankingOptions
  } = request;
  
  // Perform a search to get context
  const searchResults = await search({
    vectorStoreId,
    query: question,
    maxResults,
    filters,
    webSearch,
    hybridSearch,
    rankingOptions
  });
  
  // Create context string from search results
  const contextText = searchResults.results
    .map(result => `[Source: ${result.source}, Score: ${result.score.toFixed(2)}]\n${result.content}`)
    .join('\n\n');
  
  // Call OpenAI completion to get the answer
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are an AI assistant that answers questions based on the provided context. Use the following information to answer the user's question. If you don't know the answer, say so - don't make up information that's not in the context.\n\nContext:\n${contextText}`
      },
      {
        role: 'user',
        content: question
      }
    ],
  });
  
  const answer = completion.choices[0].message.content || '';
  
  // Update the vector store's last_active_at timestamp
  await updateVectorStoreLastActive(vectorStoreId);
  
  return { 
    answer, 
    context: searchResults.results 
  };
};

/**
 * Helper function to perform web search using OpenAI's Web Search API
 */
const performWebSearch = async (
  query: string,
  maxResults: number,
  recentOnly: boolean,
  domains?: string[]
): Promise<SearchResult[]> => {
  try {
    // Simulate a web search with OpenAI
    // In a real implementation, this would use the actual Web Search API
    const filteredQuery = domains && domains.length > 0
      ? `${query} site:${domains.join(' OR site:')}`
      : query;
    
    const timeFilter = recentOnly ? 'time:month' : '';
    const searchQuery = `${filteredQuery} ${timeFilter}`.trim();
    
    // Call OpenAI's web search (in a real implementation)
    // Here we'll simulate it for demo purposes
    const webResults = [
      {
        id: `web-${Date.now()}-1`,
        content: `This is a simulated web search result for query: "${query}". In a real implementation, this would be content from a web page.`,
        metadata: {
          url: 'https://example.com/page1',
          title: 'Example Web Result 1',
          source: 'web'
        },
        score: 0.95,
        source: 'web'
      },
      {
        id: `web-${Date.now()}-2`,
        content: `Another simulated web search result for: "${query}". This demonstrates multiple web results.`,
        metadata: {
          url: 'https://example.com/page2',
          title: 'Example Web Result 2',
          source: 'web'
        },
        score: 0.88,
        source: 'web'
      }
    ] as SearchResult[];
    
    return webResults.slice(0, maxResults);
  } catch (error) {
    console.error('Error performing web search:', error);
    return [];
  }
};

/**
 * Helper function to apply filters to search results
 */
const applyFilters = (results: SearchResult[], filter: any): SearchResult[] => {
  return results.filter(result => {
    const value = result.metadata[filter.key];
    
    switch (filter.type) {
      case 'eq':
        return value === filter.value;
      case 'neq':
        return value !== filter.value;
      case 'gt':
        return value > filter.value;
      case 'gte':
        return value >= filter.value;
      case 'lt':
        return value < filter.value;
      case 'lte':
        return value <= filter.value;
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(filter.value);
      default:
        return true;
    }
  });
};

/**
 * Helper function to apply hybrid ranking with keyword matching
 */
const applyHybridRanking = (
  results: SearchResult[],
  query: string,
  vectorWeight: number,
  keywordWeight: number
): SearchResult[] => {
  const keywords = query.toLowerCase().split(/\\s+/);
  
  return results.map(result => {
    // Calculate keyword score based on occurrences
    const content = result.content.toLowerCase();
    let keywordMatches = 0;
    
    for (const keyword of keywords) {
      if (keyword.length > 2 && content.includes(keyword)) {
        keywordMatches++;
      }
    }
    
    const keywordScore = keywords.length > 0 ? keywordMatches / keywords.length : 0;
    
    // Combine vector and keyword scores
    const hybridScore = (result.score * vectorWeight) + (keywordScore * keywordWeight);
    
    return {
      ...result,
      score: hybridScore
    };
  });
};

/**
 * Helper function to update the last_active_at timestamp for a vector store
 */
const updateVectorStoreLastActive = async (vectorStoreId: string): Promise<void> => {
  try {
    await supabase
      .from('vector_stores')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', vectorStoreId);
  } catch (error) {
    console.error('Error updating vector store last_active_at:', error);
    // Continue even if this fails
  }
};