const express = require("express");
// const http = require("http");
const cors = require("cors");
// const database = require("./database/connection");
// const indexRoutes = require("./router/allRoutes");
// database();
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8080;
// const server = http.createServer(app);

// For parsing the express payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS permission
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    next();
});
// app.use(
//   cors({
//     origin: corsOrigins,
//   })
// );

app.use("/fusion", indexRoutes);
app.use("/", (req, res) => {
  res.json("demo api");
});
app.use("*", (req, res) => {
  res.status(404).json({ message: "Resource not found" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  startSocket(server);
});

module.exports = { app, server, getIo };
