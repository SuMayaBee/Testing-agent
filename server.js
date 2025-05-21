import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint - critical for deployment
app.get('/health', (req, res) => {
  console.log('Health check request received');
  res.status(200).send('OK');
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error(`Error: Directory '${distPath}' does not exist. Make sure the build completed successfully.`);
  process.exit(1);
}

// Proxy API requests to backend
app.use("/api", createProxyMiddleware({
  target: "https://testing-agent-app-pkru6.ondigitalocean.app",
  changeOrigin: true,
  secure: true,
  pathRewrite: { "^/api": "/api" }
}));

// Serve static files from dist directory
app.use(express.static(distPath));

// For all other requests, send index.html (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at https://0.0.0.0:${PORT}/health`);
  console.log(`Application available at https://0.0.0.0:${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
  } else {
    console.error(`Server error: ${error.message}`);
  }
  process.exit(1);
}); 