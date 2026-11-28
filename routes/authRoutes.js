
const express = require("express");
const router = express.Router();

// Controllers
const {
    adminLogin,
    getAdminDashboard,
    employeeLogin,
    getEmployeeDashboard,
    getEmployeeProfile
} = require("../controllers/authController");

// Authentication middleware
const verifyToken = require("../middleware/authMiddleware");

// Role middleware
const {
    verifyAdmin,
    verifyEmployee
} = require("../middleware/roleMiddleware");


// ===============================
// ADMIN ROUTES
// ===============================

router.post("/admin-login", adminLogin);

router.get(
    "/admin-dashboard",
    verifyToken,
    verifyAdmin,
    getAdminDashboard
);


// ===============================
// EMPLOYEE ROUTES
// ===============================

// Employee Login
router.post("/employee-login", employeeLogin);

// Employee Dashboard
router.get(
    "/employee-dashboard",
    verifyToken,
    verifyEmployee,
    getEmployeeDashboard
);
// Get the logged-in employee's profile
router.get(
    "/employee-profile",
    verifyToken,
    verifyEmployee,
    getEmployeeProfile
);
module.exports = router;
