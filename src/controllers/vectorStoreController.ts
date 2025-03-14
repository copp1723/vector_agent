import { Request, Response } from 'express';
import * as VectorStoreService from '../services/vectorStoreService';
import { VectorStoreCreateRequest, CustomRequestHandler } from '../types';

export const createVectorStore: CustomRequestHandler = async (req: Request, res: Response) => {
  try {
    const data = req.body as VectorStoreCreateRequest;
    
    if (!data.name) {
      return res.status(400).json({ error: 'Vector store name is required' });
    }
    
    const result = await VectorStoreService.createVectorStore(data);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating vector store:', error);
    res.status(500).json({ error: 'Failed to create vector store' });
  }
};

export const checkStatus: CustomRequestHandler = async (req: Request, res: Response) => {
  try {
    const { vectorStoreId } = req.body;
    
    if (!vectorStoreId) {
      return res.status(400).json({ error: 'Vector store ID is required' });
    }
    
    const status = await VectorStoreService.checkStatus(vectorStoreId);
    res.status(200).json(status);
  } catch (error) {
    console.error('Error checking vector store status:', error);
    res.status(500).json({ error: 'Failed to check vector store status' });
  }
};