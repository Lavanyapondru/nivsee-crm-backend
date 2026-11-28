const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { findAdminByEmail } = require("../models/adminModel");
const {
    findEmployeeForLogin,
    getEmployeeById
} = require("../models/employeeModel");
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



 // Employee Login
const employeeLogin = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        // Validate input
        if (!identifier || !password) {
            return res.status(400).json({
                message: "Employee ID, email or phone and password are required"
            });
        }

        // Find employee using email, phone or employee code
        const employee = await findEmployeeForLogin(identifier);

        // Check whether employee exists
        if (!employee) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // Check employee account status
        if (employee.status !== "active") {
            return res.status(403).json({
                message: "Your account is inactive. Please contact the administrator."
            });
        }

        // Compare entered password with stored bcrypt hash
        const isMatch = await bcrypt.compare(
            password,
            employee.passwordHash
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // Generate employee JWT token
        const token = jwt.sign(
            {
                id: employee.id,
                email: employee.email,
                role: employee.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        // Successful employee login response
        return res.status(200).json({
            message: "Employee login successful",
            token,
            employee: {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                phone: employee.phone,
                employeeCode: employee.employeeCode,
                role: employee.role
            }
        });

    } catch (error) {
        console.error("Employee login error:", error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

// Employee Dashboard
const getEmployeeDashboard = (req, res) => {
    return res.status(200).json({
        message: "Welcome to Nivsee CRM Employee Dashboard!",
        employee: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        }
    });
};

// Get the logged-in employee's own profile
const getEmployeeProfile = async (req, res, next) => {
    try {
        // Get employee ID from verified JWT
        const employeeId = req.user.id;

        // Fetch complete profile from MySQL
        const employee = await getEmployeeById(employeeId);

        if (!employee) {
            return res.status(404).json({
                message: "Employee profile not found"
            });
        }

        // Exclude sensitive fields
        const {
            passwordHash,
            panNumber,
            aadhaarNumber,
            ...safeEmployee
        } = employee;

        return res.status(200).json({
            message: "Employee profile fetched successfully",
            employee: safeEmployee
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    adminLogin,
    getAdminDashboard,
    employeeLogin,
    getEmployeeDashboard,
    getEmployeeProfile
};