const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    try {
        // Get Authorization header
        const authHeader = req.headers.authorization;

        // Check whether token exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Access denied. Token required."
            });
        }

        // Extract token
        const token = authHeader.split(" ")[1];

        // Verify JWT token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Store decoded user information
        req.user = decoded;

        // Continue to next middleware/controller
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = verifyToken;