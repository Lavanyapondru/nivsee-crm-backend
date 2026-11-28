// Verify Admin Role
const verifyAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            message: "Access denied. Admins only."
        });
    }

    next();
};


// Verify Employee Role
const verifyEmployee = (req, res, next) => {
    if (!req.user || req.user.role !== "employee") {
        return res.status(403).json({
            message: "Access denied. Employees only."
        });
    }

    next();
};


// Export both middleware functions
module.exports = {
    verifyAdmin,
    verifyEmployee
};