import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { 
  securityHeaders, 
  corsOptions, 
  generalRateLimit, 
  sanitizeInput, 
  securityLogger 
} from "./security-middleware.js";
import cors from "cors";

export function createApp() {
  const app = express();

// Trust proxy for proper IP detection (required for rate limiting)
app.set('trust proxy', 1);

// Security middleware - must be applied first
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(generalRateLimit);
app.use(sanitizeInput);
app.use(securityLogger);

app.use(express.json({ limit: '10mb' })); // Add size limit
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Serve the WordPress maintenance worker plugin download
app.get('/wordpress-maintenance-worker.zip', (req, res) => {
  import('path').then(path => {
    const filePath = path.join(process.cwd(), 'wordpress-maintenance-worker.zip');
    res.download(filePath, 'wordpress-maintenance-worker.zip');
  });
});

// Serve the updated WP Remote Manager Secure plugin zip download
app.get('/wp-remote-manager-secure-v3.0.0.zip', (req, res) => {
  import('path').then(path => {
    const filePath = path.join(process.cwd(), 'wp-remote-manager-secure-v3.0.0.zip');
    res.download(filePath, 'wp-remote-manager-secure-v3.0.0.zip');
  });
});

// Serve the new enhanced users plugin zip download
app.get('/wp-remote-manager-enhanced-users-v3.1.0.zip', (req, res) => {
  import('path').then(path => {
    const filePath = path.join(process.cwd(), 'wp-remote-manager-enhanced-users-v3.1.0.zip');
    res.download(filePath, 'wp-remote-manager-enhanced-users-v3.1.0.zip');
  });
});

// Serve the updated enhanced users plugin with API key generation fix
app.get('/wp-remote-manager-enhanced-users-v3.2.0-final-fixed.zip', (req, res) => {
  import('path').then(path => {
    const filePath = path.join(process.cwd(), 'wp-remote-manager-enhanced-users-v3.2.0-final-fixed.zip');
    res.download(filePath, 'wp-remote-manager-enhanced-users-v3.2.0-final-fixed.zip');
  });
});

// Serve the exact KSoft compatible plugin (redirect to the navigation enhanced version)
app.get('/wp-remote-manager-enhanced-users-v3.2.0-final-exact.zip', (req, res) => {
  import('path').then(path => {
    const filePath = path.join(process.cwd(), 'wp-remote-manager-enhanced-users-v3.2.0-navigation-enhanced.zip');
    res.download(filePath, 'wp-remote-manager-enhanced-users-v3.2.0-final-exact.zip');
  });
});

// Serve the API key sync fixed version (backward compatibility)
app.get('/wp-remote-manager-enhanced-users-v3.2.0-api-key-sync-fixed.zip', (req, res) => {
  import('path').then(path => {
    const filePath = path.join(process.cwd(), 'wp-remote-manager-enhanced-users-v3.2.0-navigation-enhanced.zip');
    res.download(filePath, 'wp-remote-manager-enhanced-users-v3.2.0-api-key-sync-fixed.zip');
  });
});

// Serve the navigation enhanced version
app.get('/wp-remote-manager-enhanced-users-v3.2.0-navigation-enhanced.zip', (req, res) => {
  import('path').then(path => {
    const filePath = path.join(process.cwd(), 'wp-remote-manager-enhanced-users-v3.2.0-navigation-enhanced.zip');
    res.download(filePath, 'wp-remote-manager-enhanced-users-v3.2.0-navigation-enhanced.zip');
  });
});

  return app;
}

export async function setupServer(app: express.Express) {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  return server;
}

// For direct running (not Vercel)
const normalizePath = (path: string) => 
  path.replace(/\\/g, '/').toLowerCase();

if (normalizePath(import.meta.url) === normalizePath(`file://${process.argv[1]}`)) {
// if (import.meta.url === `file://${process.argv[1]}`) {

  (async () => {
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
  });
})();

// Keep the process alive
process.stdin.resume();
}
