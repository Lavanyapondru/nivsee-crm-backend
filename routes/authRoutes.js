const express = require("express");
const router = express.Router();

const {
    adminLogin,
    getAdminDashboard
} = require("../controllers/authController");

const verifyToken = require("../middleware/authMiddleware");
const verifyAdmin = require("../middleware/roleMiddleware");

// console.log("AUTH ROUTES LOADED");

// // Test route
// router.get("/test", (req, res) => {
//     res.status(200).json({
//         message: "Authentication routes are working!"
//     });
// });

// Login route
router.post("/admin-login", adminLogin);

// Dashboard route
router.get(
    "/admin-dashboard",
    verifyToken,
    verifyAdmin,
    getAdminDashboard
);

module.exports = router;