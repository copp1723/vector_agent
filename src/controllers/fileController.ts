import { Request, Response } from 'express';
import * as FileService from '../services/fileService';
import { AddFileRequest, CustomRequestHandler } from '../types';

export const uploadFile: CustomRequestHandler = async (req: Request, res: Response) => {
  try {
    // Check for file upload through multer or URL
    const fileUrl = req.body.fileUrl;
    const localFile = req.file;

    if (!fileUrl && !localFile) {
      return res.status(400).json({ error: 'No file provided. Please provide a file URL or upload a file.' });
    }

    console.log('Upload request received:', { 
      hasFile: !!localFile, 
      hasUrl: !!fileUrl,
      fileInfo: localFile ? {
        filename: localFile.filename,
        mimetype: localFile.mimetype,
        size: localFile.size
      } : null
    });

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