// webserver/express_server.js
const express = require('express');
const { PORT, BOT_AUTHOR } = require('../config/app_config');
const { logs } = require('../utils/common_utils');

// Function to start Express server for VPS deployment
function startExpressServer() {
  const app = express();

  // Health check endpoint for VPS monitoring
  app.get('/', (req, res) => {
    logs('info', 'Health check request received', { IP: req.ip, UserAgent: req.headers['user-agent'] });
    res.setHeader('Content-Type', 'application/json');
    const data = {
      status: 'online',
      message: 'TikTok Downloader Bot is running successfully on VPS!',
      author: BOT_AUTHOR,
      deployment: 'VPS',
      mode: 'Long Polling',
      timestamp: new Date().toISOString()
    };
    const result = {
      response: data
    };
    res.send(JSON.stringify(result, null, 2));
  });

  // Status endpoint for monitoring
  app.get('/status', (req, res) => {
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  });

  function listenOnPort(port) {
    app.listen(port, '0.0.0.0', () => {
      logs('success', `Express server is running on port ${port}`, { Type: 'VPS-Express', Host: '0.0.0.0' });
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logs('warning', `Port ${port} is already in use. Trying next port...`, { Type: 'Express' });
        listenOnPort(port + 1);
      } else {
        logs('error', `Server failed to start on port ${port}`, { Error: err.message, Type: 'Express' });
      }
    });
  }

  listenOnPort(PORT);
}

module.exports = startExpressServer;