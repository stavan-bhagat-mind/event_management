const express = require('express');
const database = require('./src/config/database');
const indexRoutes = require('./src/routers/index.router');
const { initializeMinIO } = require('./src/services/file.service');

// Initialize database and MinIO
database();
initializeMinIO().catch((error) => {
  console.error('Failed to initialize MinIO:', error);
  process.exit(1);
});

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  next();
});

// Routes
app.use('/event-management', indexRoutes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/event_management`);
});
