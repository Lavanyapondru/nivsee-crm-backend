
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path"); // Import Node.js path module

const app = express();

// Import error handling middleware
const errorHandler = require("./middleware/errorMiddleware");

// Import routes
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const adminAttendanceRoutes = require("./routes/adminAttendanceRoutes");

// General middleware
app.use(cors());
app.use(express.json());

// Database connection
require("./config/db");

// Serve uploaded employee photos
app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

// Register API routes
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin/attendance", adminAttendanceRoutes);

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Nivsee CRM Backend Running Successfully!"
    });
});

// Error handler must be registered AFTER all routes
app.use(errorHandler);

// Server configuration
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});
