require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database
require("./config/db");

// Authentication routes
const authRoutes = require("./routes/authRoutes");

app.use("/api/auth", authRoutes);

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Nivsee CRM Backend Running Successfully!"
    });
});

// Server
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0"; //added for ip address

app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});