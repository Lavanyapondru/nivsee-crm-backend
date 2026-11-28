
const express = require("express");
const router = express.Router();

// Import Controller
const {
    fetchAllEmployees,
    fetchEmployeeById,
    addEmployee,
    editEmployee,changeEmployeeStatus
    
} = require("../controllers/employeeController");

// Import Authentication Middleware
const verifyToken = require("../middleware/authMiddleware");
const {verifyAdmin }= require("../middleware/roleMiddleware");


// Import Multer Middleware
const uploadEmployeePhoto = require("../middleware/uploadMiddleware");

// Get all employees (Admin only)
router.get( "/", verifyToken, verifyAdmin,fetchAllEmployees);
router.get("/:id", verifyToken, verifyAdmin, fetchEmployeeById);

// Add employee
router.post("/", verifyToken, verifyAdmin, uploadEmployeePhoto.single("photo"), addEmployee);

// Update employee
router.put("/:id", verifyToken, verifyAdmin, uploadEmployeePhoto.single("photo"), editEmployee);
router.patch("/:id/status", changeEmployeeStatus);
module.exports = router;
