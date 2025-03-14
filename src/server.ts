import express from 'express';
import cors from 'cors';
import { PORT, openai, supabase } from './config';
import vectorStoreRoutes from './routes/vectorStoreRoutes';
import fileRoutes from './routes/fileRoutes';
import searchRoutes from './routes/searchRoutes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/vector-store', vectorStoreRoutes);
app.use('/api/file', fileRoutes);
app.use('/api/search', searchRoutes);

// Root endpoint for basic debugging
app.get('/', (req, res) => {
  res.send('Vector Agent API is running. Try /health for API status.');
});

// Health check endpoints (both /health and /api/health for flexibility)
const healthCheckHandler = async (req, res) => {
  try {
    // Basic server status check
    const serverStatus = 'ok';
    
    // Check OpenAI API connection
    let openaiStatus = 'unknown';
    try {
      const models = await openai.models.list();
      openaiStatus = models.data && models.data.length > 0 ? 'ok' : 'error';
    } catch (error) {
      openaiStatus = 'error';
      console.error('OpenAI API error:', error);
    }

    // Check Supabase connection
    let supabaseStatus = 'unknown';
    try {
      const { data, error } = await supabase.from('vector_stores').select('id').limit(1);
      supabaseStatus = error ? 'error' : 'ok';
    } catch (error) {
      supabaseStatus = 'error';
      console.error('Supabase error:', error);
    }

    res.status(200).json({
      status: serverStatus,
      version: '1.0.0',
      time: new Date().toISOString(),
      services: {
        openai: openaiStatus,
        supabase: supabaseStatus
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ status: 'error', error: 'Internal server error' });
  }
};

// Register health check at both paths
app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Vector Agent server running!
📡 API available at: http://localhost:${PORT}
🧠 Health check: http://localhost:${PORT}/health
  `);
});