const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');

// Start the main Innov8 server
console.log('🚀 Starting Innov8 server...');
const mainServer = spawn('node', ['server.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Create a simple preview server on a different port
const previewApp = express();
const PREVIEW_PORT = 8080;

previewApp.use(cors());
previewApp.use(express.static(path.join(__dirname, 'public')));

// Serve the demo preview
previewApp.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'demo-screenshot.html'));
});

// Proxy API calls to main server
previewApp.use('/api', (req, res) => {
  const url = `http://localhost:3000${req.originalUrl}`;
  
  // Simple proxy
  const options = {
    method: req.method,
    headers: req.headers
  };
  
  if (req.method === 'POST' || req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      options.body = body;
      makeRequest();
    });
  } else {
    makeRequest();
  }
  
  function makeRequest() {
    const http = require('http');
    const urlParts = require('url').parse(url);
    
    const proxyReq = http.request({
      hostname: urlParts.hostname,
      port: urlParts.port,
      path: urlParts.path,
      method: options.method,
      headers: options.headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    if (options.body) {
      proxyReq.write(options.body);
    }
    
    proxyReq.end();
  }
});

// Serve main app
previewApp.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

previewApp.listen(PREVIEW_PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🎉 Innov8 Preview Server Started!');
  console.log('');
  console.log('📱 Access your app at:');
  console.log(`   http://localhost:${PREVIEW_PORT}`);
  console.log(`   http://127.0.0.1:${PREVIEW_PORT}`);
  console.log('');
  console.log('🎯 Demo preview at:');
  console.log(`   http://localhost:${PREVIEW_PORT}/demo`);
  console.log('');
  console.log('🧪 Demo Accounts:');
  console.log('   Email: demo@innov8.com | Password: demo123');
  console.log('   Email: alice@innov8.com | Password: demo123');
  console.log('   Email: bob@innov8.com | Password: demo123');
  console.log('');
  console.log('✅ Both servers running successfully!');
  console.log('   - Main server: localhost:3000');
  console.log('   - Preview server: localhost:8080');
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  mainServer.kill();
  process.exit();
});
