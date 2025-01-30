const express = require('express');
// const http = require("http");
const cors = require('cors');
const database = require('./src/config/database');
const indexRoutes = require('./src/routers/index.router');
database();
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
// const server = http.createServer(app);

// For parsing the express payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS permission
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  next();
});
// app.use(
//   cors({
//     origin: corsOrigins,
//   })
// );

app.use('/event-management', indexRoutes);
app.use('/', (req, res) => {
  res.json('demo api');
});
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}/event_management`);
  // startSocket(server);
});

// module.exports = { app, server, getIo };
