
const multer = require("multer");

// Central error handler for Express
const errorHandler = (err, req, res, next) => {

    console.error("Server Error:", err.message);

    // Handle Multer file upload errors
    if (err instanceof multer.MulterError) {

        // File exceeds the configured 2 MB limit
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "Employee photo must not exceed 2 MB."
            });
        }

        // Other Multer errors
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    // Handle errors from our Multer fileFilter
    if (err.message === "Only JPG, JPEG and PNG files are allowed!") {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    // Handle other unexpected errors
    return res.status(500).json({
        success: false,
        message: "Internal server error."
    });
};

// Export error middleware
module.exports = errorHandler;
