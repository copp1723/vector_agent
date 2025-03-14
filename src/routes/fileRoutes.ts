import express from 'express';
import * as FileController from '../controllers/fileController';
import { upload } from '../config';

const router = express.Router();

// Upload a file
router.post('/upload-file', upload.single('file'), FileController.uploadFile);

// Add file to vector store
router.post('/add-file', FileController.addFileToVectorStore);

export default router;