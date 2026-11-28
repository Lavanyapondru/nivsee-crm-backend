
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Employee photo storage folder
const uploadFolder = path.join(
    __dirname,
    "../uploads/employees"
);

// Automatically create folders if they don't exist
if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

// Configure photo storage
const storage = multer.diskStorage({

    // Where uploaded photos are saved
    destination: (req, file, cb) => {
        cb(null, uploadFolder);
    },

    // Generate a unique filename
    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname).toLowerCase();

        cb(null, uniqueName);
    }
});

// Allowed image extensions
const allowedExtensions = [".jpg", ".jpeg", ".png"];

// Allowed image MIME types
const allowedMimeTypes = ["image/jpeg", "image/png"];

// Validate uploaded file
const fileFilter = (req, file, cb) => {

    // Get the uploaded file extension
    const extension = path.extname(file.originalname).toLowerCase();

    // Check extension and MIME type together
    if (
        allowedExtensions.includes(extension) &&
        allowedMimeTypes.includes(file.mimetype)
    ) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, JPEG and PNG photos are allowed!"));
    }
};

// Configure Multer
const uploadEmployeePhoto = multer({
    storage: storage,
    fileFilter: fileFilter,

    // Maximum photo size: 2 MB
    limits: {
        fileSize: 2 * 1024 * 1024
    }
});

// Export middleware
module.exports = uploadEmployeePhoto;
