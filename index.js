const express = require('express');
const database = require('./src/config/database');
const indexRoutes = require('./src/routers/index.router');
const { initializeMinIO } = require('./src/services/file.service');
const cronJobs = require('./src/crons/index.cron');

// Initialize database and MinIO
database();
initializeMinIO().catch((error) => {
  console.error('Failed to initialize MinIO:', error);
  process.exit(1);
});

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(
  '/event-management/payment/webhook',
  express.raw({ type: 'application/json' })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Template Engine
app.set('view engine', 'ejs');
app.set('views', './src/templates');

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  next();
});

// Routes
app.use('/event-management', indexRoutes);


app.get("/home",(req,res,next)=>{
  res.send("This is the homepage request")
})
// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/event-management`);
});
