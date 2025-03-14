import express from 'express';
import * as VectorStoreController from '../controllers/vectorStoreController';

const router = express.Router();

// Create a new vector store
router.post('/create-store', VectorStoreController.createVectorStore);

// Check vector store processing status
router.post('/check-status', VectorStoreController.checkStatus);

export default router;