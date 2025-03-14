import { Request, Response } from 'express';
import * as SearchService from '../services/searchService';
import { SearchRequest, ChatRequest, QueryRequest, CustomRequestHandler } from '../types';

export const search: CustomRequestHandler = async (req: Request, res: Response) => {
  try {
    const data = req.body as SearchRequest;
    
    if (!data.vectorStoreId) {
      return res.status(400).json({ error: 'Vector store ID is required' });
    }
    
    if (!data.query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await SearchService.search(data);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
};

export const chat: CustomRequestHandler = async (req: Request, res: Response) => {
  try {
    const data = req.body as ChatRequest;
    
    if (!data.vectorStoreId) {
      return res.status(400).json({ error: 'Vector store ID is required' });
    }
    
    if (!data.messages || data.messages.length === 0) {
      return res.status(400).json({ error: 'Chat messages are required' });
    }
    
    const response = await SearchService.chat(data);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
};

export const query: CustomRequestHandler = async (req: Request, res: Response) => {
  try {
    const data = req.body as QueryRequest;
    
    if (!data.vectorStoreId) {
      return res.status(400).json({ error: 'Vector store ID is required' });
    }
    
    if (!data.question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    const answer = await SearchService.query(data);
    res.status(200).json(answer);
  } catch (error) {
    console.error('Error answering query:', error);
    res.status(500).json({ error: 'Failed to answer query' });
  }
};