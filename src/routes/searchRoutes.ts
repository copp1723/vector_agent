import express from 'express';
import * as SearchController from '../controllers/searchController';

const router = express.Router();

// Direct semantic search
router.post('/search', SearchController.search);

// Chat with vector store and web search
router.post('/chat', SearchController.chat);

// Query answering
router.post('/query', SearchController.query);

export default router;