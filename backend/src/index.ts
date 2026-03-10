import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import type { IncomingMessage, ServerResponse } from 'http';
import apiRoutes from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Proxy middleware for OpenClaw Gateway - removes CSP headers to allow iframe embedding
app.use('/gateway-proxy', createProxyMiddleware({
  target: 'http://localhost:18789',
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  pathRewrite: {
    '^/gateway-proxy': '', // Remove /gateway-proxy prefix when forwarding
  },
  on: {
    proxyRes: (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) => {
      // Remove or modify CSP headers that block iframe embedding
      if (proxyRes.headers['content-security-policy']) {
        const csp = proxyRes.headers['content-security-policy'];
        // Handle both string and string[] cases
        const cspString = Array.isArray(csp) ? csp.join(', ') : csp;
        // Remove frame-ancestors directive or change 'none' to 'self'
        const modifiedCSP = cspString
          .replace(/frame-ancestors\s+[^;]+;?/gi, "frame-ancestors 'self' http://localhost:*;")
          .trim();
        proxyRes.headers['content-security-policy'] = modifiedCSP;
      }
      // Also handle X-Frame-Options if present
      if (proxyRes.headers['x-frame-options']) {
        delete proxyRes.headers['x-frame-options'];
      }
    },
    error: (err: Error, req: IncomingMessage, res: ServerResponse | any) => {
      console.error('Proxy error:', err);
      // Check if res is a ServerResponse (not a Socket for WebSocket upgrade)
      if (res && typeof res.writeHead === 'function') {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Gateway proxy error. Is OpenClaw Gateway running?');
      }
    },
  }
}));

// API Routes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
app.use('/api', apiRoutes);

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production (placeholder)
if (process.env.NODE_ENV === 'production') {
  // Use FRONTEND_PATH env var if provided (e.g. by Electron), otherwise default to relative path
  const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
