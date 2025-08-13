import { createApp } from './index';
import { setupServer } from './index';
import { setupVite, serveStatic } from './vite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
// Change your import to:
// or
import { ThumbnailService } from './thumbnail-service';
import path from 'path';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Debug log to verify env loading
console.log('Environment variables loaded from:', envPath);
console.log('- SCREENSHOTONE_ACCESS_KEY:', process.env.SCREENSHOTONE_ACCESS_KEY ? '****' + process.env.SCREENSHOTONE_ACCESS_KEY.slice(-4) : 'missing');
console.log('- NODE_ENV:', process.env.NODE_ENV);

const start = async () => {
  try {
    const app = createApp();
    const server = await setupServer(app);

    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log('Current environment:', {
        NODE_ENV: process.env.NODE_ENV,
        PORT: port,
        DB_HOST: process.env.DATABASE_URL ? 'configured' : 'missing'
      });
    });

    // Test route for thumbnails
    app.get('/test-thumbnail', async (req, res) => {
      try {
        const result = await ThumbnailService.captureScreenshot({
          url: 'https://example.com',
          width: 1200,
          height: 800
        });
        res.json(result);
      } catch (error) {
        console.error('Thumbnail test failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Keep process alive
    const keepAlive = setInterval(() => {}, 1000);

    process.on('SIGTERM', () => {
      clearInterval(keepAlive);
      server.close();
    });
    
  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
};

start();