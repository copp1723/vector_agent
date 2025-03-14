import { Request, Response } from 'express';
import * as FileService from '../services/fileService';
import { AddFileRequest, CustomRequestHandler } from '../types';

export const uploadFile: CustomRequestHandler = async (req: Request, res: Response) => {
  try {
    // In a real implementation, we would handle file uploads with a library like multer
    // For now, we'll simulate file upload and use a URL-based approach
    const fileUrl = req.body.fileUrl;
    const localFile = req.file; // This would be populated by multer middleware

    if (!fileUrl && !localFile) {
      return res.status(400).json({ error: 'No file provided. Please provide a file URL or upload a file.' });
    }

    const result = await FileService.uploadFile(fileUrl || localFile);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

export const addFileToVectorStore: CustomRequestHandler = async (req: Request, res: Response) => {
  try {
    const data = req.body as AddFileRequest;
    
    if (!data.vectorStoreId) {
      return res.status(400).json({ error: 'Vector store ID is required' });
    }
    
    if (!data.fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    const result = await FileService.addFileToVectorStore(data);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error adding file to vector store:', error);
    res.status(500).json({ error: 'Failed to add file to vector store' });
  }
};