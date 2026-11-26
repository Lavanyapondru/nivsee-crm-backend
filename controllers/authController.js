const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { findAdminByEmail } = require("../models/adminModel");

// Admin Login
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Find admin in database
        const admin = await findAdminByEmail(email);

        if (!admin) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Compare password with hashed password
        const isMatch = await bcrypt.compare(
            password,
            admin.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: admin.id,
                email: admin.email,
                role: admin.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        // Successful login response
        return res.status(200).json({
            message: "Admin login successful",
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        console.error("Admin login error:", error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const getAdminDashboard = (req, res) => {
    return res.status(200).json({
        message: "Welcome to Nivsee CRM Admin Dashboard!",
        admin: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        }
    });
};

module.exports = {
    adminLogin,
    getAdminDashboard
};